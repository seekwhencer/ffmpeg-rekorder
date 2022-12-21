import {spawn} from 'child_process';
import fs from 'fs-extra';
import Storage from './Storage.js';

export default class FFmpegStream extends MODULECLASS {
    constructor(parent, options) {
        super(parent, options);
        this.label = 'FFMPEG STREAM';

        this.recording = false;
        this.bin = '/usr/local/bin/ffmpeg';
        this.registerOptionsAsFields(options);

        this.checkIntervalDuration = this.checkIntervalDuration || 10000; // ms

        this.checkInterval = false;
        this.id = this.createHash(this.name);

        LOG(this.label, 'INIT', this.name, this.id);

        this.streamUrl = this.streamUrl || false;

        if (!this.streamUrl)
            return Promise.resolve();

        this.mqttEnable = this.mqttEnable || true;
        this.mqttTopic = this.mqttTopic || `sensors/camera/${this.name.toLowerCase()}`;
        this.mqttTopicValueOn = this.mqttTopicValueOn || '1';
        this.mqttTopicValueOff = this.mqttTopicValueOff || '0';
        this.mqttControlTopicValueOn = this.mqttControlTopicValueOn || '1';
        this.mqttControlTopicValueOff = this.mqttControlTopicValueOff || '0';

        this.snapshotPath = `${STORE_ROOT_PATH}/${this.name}`;
        this.snapshotFilePath = `${this.snapshotPath}/snapshot.png`;

        this.recordPath = `${STORE_ROOT_PATH}/${this.name}`;
        this.recordFileName = `${this.filePrefix}_${this.name}.mp4`;
        this.recordFilePath = `${this.recordPath}/${this.recordFileName}`;

        this.recordProcess = false;
        this.snapshotProcess = false;

        this.storageAge = this.storageAge || STORAGE_AGE;
        this.storage = new Storage(this);

        /**
         * Events
         */
        this.on('enabled', () => {
            LOG(this.label, 'ENABLED:', this.name);
            if (!this.available) {
                this.checkInterval ? clearInterval(this.checkInterval) : null;
                this.checkAvailable();
                this.checkInterval = setInterval(() => this.checkAvailable(), this.checkIntervalDuration);
            } else {
                this.record();
            }
        });

        this.on('disabled', () => {
            LOG(this.label, 'DISABLED:', this.name);
            this.stop();
            this.available = false;
        });

        // if a snapshot was saved - or not
        this.on('checked', (dataOut, dataErr) => {
            if (!this.enabled)
                return;

            fs
                .access(this.snapshotFilePath, fs.constants.F_OK)
                .then(() => {

                    this.available = true; // <- THIS IS THE TRIGGER
                    return fs.unlink(this.snapshotFilePath);
                })
                .catch(err => {
                    this.available = false;
                    return Promise.resolve();
                });
        });

        // when the cam is available
        this.on('available', () => {
            LOG(this.label, this.name, '- - - IS AVAILABLE NOW - - -');

            if (!this.autoRecord)
                return;

            this.record();
            this.publish(this.mqttTopic, 1);
        });

        // when the cam is not available
        this.on('lost', () => {
            LOG(this.label, this.name, '- - - IS NOT AVAILABLE NOW - - -');
            this.stop();
            this.publish(this.mqttTopic, 0);
            this.disable();
        });

        this.on('recording', () => {
            LOG(this.label, 'RECORDING...');
            this.recording = true;
        });

        // when the ffmpeg process ends
        this.on('stop', (dataOut, dataErr) => {
            LOG(this.label, this.name, 'STOPPED');
            this.recording = false;
        });

        // subscribe for the control topic
        this.subscribeControl();

        // when a control instruction comes
        APP.MQTT.on(this.mqttControlTopicEnable, data => {
            LOG(this.label, 'GOT MESSAGE:', data, 'ON', this.mqttControlTopicEnable);
            data === this.mqttControlTopicValueOn ? this.enable() : this.disable();
        });

        // when a control instruction comes
        APP.MQTT.on(this.mqttControlTopicRecord, data => {
            LOG(this.label, 'GOT MESSAGE:', data, 'ON', this.mqttControlTopicRecord);
            data === this.mqttControlTopicValueOn ? this.record() : this.stop();
        });

        return new Promise((resolve, reject) => {
            this.enabled ? this.emit('enabled') : null;
            resolve(this);
        });
    }

    enable() {
        if (this.enabled === true)
            return;

        this.enabled = true;
        this.emit('enabled');
    }

    disable() {
        if (this.enabled === false)
            return;

        this.enabled = false;
        this.emit('disabled');
    }

    checkAvailable() {
        if (!this.enabled)
            return;

        LOG(this.label, 'CHECK IF', this.name, 'IS AVAILABLE');

        this.snapshotProcess ? this.snapshotProcess.kill('SIGINT') : null;

        let dataOut = '', dataErr = '';
        const params = ["-y", "-frames", "1", this.snapshotFilePath, '-stimeout', '2000', '-rtsp_transport', 'tcp', '-i', this.streamUrl];
        this.snapshotProcess = spawn(this.bin, params);
        this.snapshotProcess.stdout.on('data', chunk => dataOut += chunk);
        this.snapshotProcess.stderr.on('data', chunk => dataErr += chunk);
        this.snapshotProcess.stdout.on('end', () => this.emit('checked', dataOut, dataErr));
    }

    record() {
        if (this.recordProcess)
            this.stop();

        if (!this.available)
            return;

        let dataOut = '', dataErr = '', dataIn = '';
        const params = [
            "-i", this.streamUrl,
            "-vcodec", "copy",
            "-f", "segment",
            "-segment_time", this.segmentTime,
//            "-reconnect_on_network_error", "1",
//            "-reconnect_at_eof", "1",
//            "-reconnect_streamed", "1",
//            "-reconnect_delay_max", "300",
            "-use_wallclock_as_timestamps", "1",
            "-reset_timestamps", "1",
//            "-write_empty_segments", "1",
            "-strftime", "1",
            "-strftime_mkdir", "1",
            "-listen_timeout", "2",
            this.recordFilePath];

        this.recordProcess = spawn(this.bin, params);
        this.recordProcess.on('spawn', () => this.emit('recording'));

        this.recordProcess.stdout.on('data', chunk => {
            dataOut += chunk;
            //LOG(chunk);
        });
        this.recordProcess.stderr.on('data', chunk => {
            dataErr += chunk;
            //LOG(chunk.toString());
        });
        this.recordProcess.stdin.on('data', chunk => {
            dataIn += chunk;
            //LOG(chunk.toString());
        });
        this.recordProcess.stdout.on('end', () => this.emit('stop', dataOut, dataErr));
    }

    stop() {
        if (!this.recordProcess)
            return;

        if (!this.available)
            return;

        LOG(this.label, 'STOPPING...', 'PID:', this.recordProcess.pid);
        this.recordProcess.kill('SIGINT');
        setTimeout(() => this.recordProcess = false, 2000);
    }

    publish(topic, value) {
        if (!this.mqttEnable || !this.mqttTopic)
            return;

        LOG(this.label, 'PUBLISH', topic, value);
        APP.MQTT.publish(topic, `${value}`);
    }

    subscribeControl() {
        if (!this.mqttEnable)
            return;

        this.mqttControlTopicEnable ? APP.MQTT.subscribe(this.mqttControlTopicEnable) : null;
        this.mqttControlTopicRecord ? APP.MQTT.subscribe(this.mqttControlTopicRecord) : null;
    }

    get available() {
        return this._available || false;
    }

    set available(val) {
        if (val === this.available)
            return;

        this._available = val;
        this.available ? this.emit('available') : this.emit('lost');
    }

}
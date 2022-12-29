import {spawn} from 'child_process';
import fs from 'fs-extra';
import Storage from './Storage.js';
import StreamMqtt from './StreamMqtt.js';

export default class FFmpegStream extends MODULECLASS {
    constructor(parent, options) {
        super(parent, options);
        this.label = 'FFMPEG STREAM';

        this.recording = false;
        this.bin = FFMPEG_BINARY || '/usr/local/bin/ffmpeg';
        this.registerOptionsAsFields(options);

        this.checkIntervalDuration = this.checkIntervalDuration || 10000; // ms

        this.checkInterval = false;
        this.id = this.createHash(this.name);

        this.streamUrl = this.streamUrl || false;

        if (!this.streamUrl) {
            return Promise.resolve();
        }

        // the publishing topics
        this.mqttTopicRecord = this.mqttTopicRecord || `sensors/camera/${this.name.toLowerCase()}`;
        this.mqttTopicAvailable = this.mqttTopicAvailable || `sensors/camera/${this.name.toLowerCase()}/available`;
        this.mqttTopicEnable = this.mqttTopicEnable || `sensors/camera/${this.name.toLowerCase()}/enable`;

        this.snapshotPath = `${STORE_ROOT_PATH}/${this.name}`;
        this.snapshotFilePath = `${this.snapshotPath}/snapshot.png`;

        this.recordPath = `${STORE_ROOT_PATH}/${this.name}`;
        this.recordFileName = `${this.filePrefix}_${this.name}.mp4`;
        this.recordFilePath = `${this.recordPath}/${this.recordFileName}`;

        this.recordProcess = false;
        this.snapshotProcess = false;

        //
        this.storageAge = this.storageAge || STORAGE_AGE;
        this.storage = new Storage(this);

        if (MQTT_ENABLE)
            this.mqtt = new StreamMqtt(this);

        /**
         * Events
         */
        this.on('enabled', () => {
            LOG(this.label, this.name, 'ENABLED', {verbose: 2});

            this.mqtt ? this.mqtt.enabled() : null;

            if (!this.available) {
                this.checkInterval ? clearInterval(this.checkInterval) : null;
                this.checkAvailable();
                this.checkInterval = setInterval(() => this.checkAvailable(), this.checkIntervalDuration);
            } else {
                this.record();
            }
        });

        this.on('disabled', () => {
            LOG(this.label, this.name, 'DISABLED', {verbose: 2});
            this.stop();
            this.available = false;
            this.mqtt ? this.mqtt.disabled() : null;
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
            LOG(this.label, this.name, '- - - IS AVAILABLE NOW - - -', {verbose: 2});

            this.mqtt ? this.mqtt.available() : null;

            if (!this.autoRecord) {
                return;
            }
            this.record();
        });

        // when the cam is not available
        this.on('lost', () => {
            LOG(this.label, this.name, '- - - IS NOT AVAILABLE NOW - - -', {verbose: 2});
            this.stop();
            this.mqtt ? this.mqtt.lost() : null;
            this.disable();
        });

        this.on('recording', () => {
            LOG(this.label, this.name, 'RECORDING...', {verbose: 2});
            this.recording = true;
            this.mqtt ? this.mqtt.record() : null;
        });

        // when the ffmpeg process ends
        this.on('stop', (dataOut, dataErr) => {
            LOG(this.label, this.name, 'STOPPED', {verbose: 2});
            this.recording = false;
            this.mqtt ? this.mqtt.stop() : null;
        });

        LOG(this.label, this.name, 'INIT', this.id, 'MQTT ENABLED:', this.mqttEnable);

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

        LOG(this.label, this.name, 'CHECK IF IS AVAILABLE', {verbose: 2});

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
            dataOut += chunk.toString();
            LOG(this.label, this.name, chunk.toString(), {verbose: 3});
        });
        this.recordProcess.stderr.on('data', chunk => {
            dataErr += chunk.toString();
            LOG(this.label, this.name, chunk.toString(), {verbose: 3});
        });
        this.recordProcess.stdin.on('data', chunk => {
            dataIn += chunk.toString();
            LOG(this.label, this.name, chunk.toString(), {verbose: 3});
        });
        this.recordProcess.stdout.on('end', () => this.emit('stop', dataOut, dataErr));
    }

    stop() {
        if (!this.recordProcess)
            return;

        if (!this.available)
            return;

        LOG(this.label, this.name, 'STOPPING...', 'PID:', this.recordProcess.pid, {verbose: 2});
        this.recordProcess.kill('SIGINT');
        setTimeout(() => this.recordProcess = false, 2000);
    }

    publish(topic, value) {
        if (!this.mqtt)
            return;

        this.mqtt.publish(topic, value);
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
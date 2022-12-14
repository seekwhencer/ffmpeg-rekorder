import {spawn} from 'child_process';
import fs from 'fs-extra';

export default class FFmpegStream extends MODULECLASS {
    constructor(parent, options) {
        super(parent, options);
        this.label = 'FFMPEG STREAM';

        this.recording = false;
        this.bin = '/usr/local/bin/ffmpeg';
        this.checkInerval = 10000; // ms

        this.registerOptionsAsFields(options);
        this.id = this.createHash(this.name);

        this.autoRecord = this.autoRecord || true;

        this.topic = `sensors/camera/${this.name.toLowerCase()}`;
        this.controlTopic = `control/camera/${this.name.toLowerCase()}/enable`;

        this.snapshotPath = `${STORE_ROOT_PATH}/${this.name}`;
        this.snapshotFilePath = `${this.snapshotPath}/snapshot.png`;

        this.recordPath = `${STORE_ROOT_PATH}/${this.name}`;
        this.recordFileName = `${this.filePrefix}_${this.name}.mp4`;
        this.recordFilePath = `${this.recordPath}/${this.recordFileName}`;
        this.recordProcess = false;

        // if a snapshot was saved - or not
        this.on('checked', (dataOut, dataErr) => {
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
            this.publish(this.topic, 1);
        });

        // when the cam is not available
        this.on('lost', () => {
            LOG(this.label, this.name, '- - - IS NOT AVAILABLE NOW - - -', typeof this.recordProcess);
            this.stop();
            this.publish(this.topic, 0);
        });

        this.on('enabled', () => this.record());
        this.on('disabled', () => this.stop());

        this.on('recording', () => {
            LOG(this.label, 'RECORDING...');
            this.recording = true;
        });
        // when the ffmpeg process ends

        this.on('stop', (dataOut, dataErr) => {
            LOG(this.label, this.name, 'STOP', dataOut, dataErr);
            this.recording = false;
        });

        // subscribe for the control topic
        this.subscribeControl();

        // when a control instruction comes
        APP.MQTT.on('message', (topic, buffer) => {
            if (topic !== this.controlTopic)
                return;

            buffer.toString() === '1' ? this.enabled = true : this.enabled = false;
            LOG(this.label, 'GOT MESSAGE:', buffer.toString(), 'ON', topic);
        });

        return new Promise((resolve, reject) => {
            LOG(this.label, 'INIT', this.name, this.id);

            // enable the cam by a self instructed mqtt message
            this.publish(this.controlTopic, '1');

            // check on startup if all cams are available
            this.checkAvailable();

            // run the check periodically
            setInterval(() => this.checkAvailable(), this.checkInerval);

            resolve(this);
        });
    }

    checkAvailable() {
        if (!this.enabled)
            return;

        LOG(this.label, 'CHECK IF', this.name, 'IS AVAILABLE');

        let dataOut = '', dataErr = '';
        const params = ["-y", "-frames", "1", this.snapshotFilePath, '-stimeout', '2000', '-rtsp_transport', 'tcp', '-i', this.streamUrl];
        const process = spawn(this.bin, params);
        process.stdout.on('data', chunk => dataOut += chunk);
        process.stderr.on('data', chunk => dataErr += chunk);
        process.stdout.on('end', () => this.emit('checked', dataOut, dataErr));
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
            "-segmentTime", this.segmentTime,
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

        LOG(this.label, 'STOPPING...', this.recordProcess.pid);
        this.recordProcess ? this.recordProcess.kill('SIGINT') : null;
        this.enabled = false;
    }

    publish(topic, value) {
        LOG(this.label, 'PUBLISH', topic, value);
        APP.MQTT.publish(topic, `${value}`);
    }

    subscribeControl() {
        LOG(this.label, 'SUBSCRIBE', this.controlTopic);
        APP.MQTT.subscribe(this.controlTopic);
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

    get enabled() {
        return this._enabled;
    }

    set enabled(val) {
        if (val === this.enabled)
            return;

        this._enabled = val;
        this.enabled ? this.emit('enabled') : this.emit('disabled');
    }
}
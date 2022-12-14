import {spawn} from 'child_process';
import fs from 'fs-extra';

export default class FFmpegStream extends MODULECLASS {
    constructor(parent, options) {
        super(parent, options);
        this.label = 'FFMPEG STREAM';

        this.enabled = true;
        this.recording = false;
        this.bin = '/usr/local/bin/ffmpeg';
        this.checkInerval = 10000; // ms
        this.autoRecord = false;

        this.registerOptionsAsFields(options);
        this.id = this.createHash(this.name);

        this.topic = `sensors/camera/${this.name.toLowerCase()}`;
        this.controlTopic = `control/camera/${this.name.toLowerCase()}/enable`;

        this.snapshotPath = `${STORE_ROOT_PATH}/${this.name}`;
        this.snapshotFilePath = `${this.snapshotPath}/snapshot.png`;

        this.recordPath = `${STORE_ROOT_PATH}/${this.name}`;
        this.recordFileName = `${this.file_prefix}_${this.name}.mp4`;
        this.recordFilePath = `${this.recordPath}/${this.recordFileName}`;
        this.recordProcess = false;

        // if a snapshot was saved - or not
        this.on('check', (dataOut, dataErr) => {
            fs
                .access(this.snapshotFilePath, fs.constants.F_OK)
                .then(() => {
                    this.active = true; // <- THIS IS THE TRIGGER
                    return fs.unlink(this.snapshotFilePath);
                })
                .then(() => {
                    //LOG(this.label, 'DELETED SNAPSHOT:', this.snapshotFilePath);
                    return Promise.resolve();
                })
                .catch(err => {
                    this.active = false;
                    return Promise.resolve();
                });
        });

        // when the cam is available
        this.on('active', () => {
            LOG(this.label, this.name, '- - - ACTIVE - - -');

            if (!this.autoRecord)
                return;

            this.record();
            this.publish(this.topic, 1);
        });

        // when the cam is not available
        this.on('inactive', () => {
            LOG(this.label, this.name, '- - - INACTIVE - - -', typeof this.recordProcess);
            this.stop();
            this.publish(this.topic, 0);
        });

        this.on('recording', () => {
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
            this.enabled && this.active ? this.record() : this.stop();
        });

        return new Promise((resolve, reject) => {
            LOG(this.label, 'INIT', this.name, this.id);
            LOG(this.label, this.snapshotFilePath);

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
        if (!this.enabled) {
            return;
        }
        LOG(this.label, 'CHECK', this.name, 'ENABLED:', this.enabled);

        let dataOut = '', dataErr = '';
        const params = ["-y", "-frames", "1", this.snapshotFilePath, '-stimeout', '2000', '-rtsp_transport', 'tcp', '-i', this.stream_url];
        const process = spawn(this.bin, params);
        process.stdout.on('data', chunk => dataOut += chunk);
        process.stderr.on('data', chunk => dataErr += chunk);
        process.stdout.on('end', () => this.emit('check', dataOut, dataErr));
    }

    record() {
        if (this.recordProcess)
            this.stop();

        LOG(this.label, 'RECORDING...');

        let dataOut = '', dataErr = '', dataIn = '';
        const params = [
            "-i", this.stream_url,
            "-vcodec", "copy",
            "-f", "segment",
            "-segment_time", this.segment_time,
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
        if(this.recordProcess) {
//            this.recordProcess.kill('SIGTERM');
//            this.recordProcess.kill('SIGTERM');
        }

        LOG(this.label, 'STOPPING...', this.recordProcess.pid);
 //       this.recordProcess ? this.recordProcess.stdin.write('q') : null;
        this.recordProcess ? this.recordProcess.kill('SIGINT') : null;
        this.enabled = false;
        //setTimeout(() => this.recordProcess = false, 5000);
    }

    publish(topic, value) {
        LOG(this.label, 'PUBLISH', topic, value);
        APP.MQTT.publish(topic, `${value}`);
    }

    subscribeControl() {
        LOG(this.label, 'SUBSCRIBE', this.controlTopic);
        APP.MQTT.subscribe(this.controlTopic);
    }

    get active() {
        return this._active;
    }

    set active(val) {
        if (val === this.active)
            return;

        this._active = val;
        this.active ? this.emit('active') : this.emit('inactive');
    }
}
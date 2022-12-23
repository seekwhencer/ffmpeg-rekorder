import path from 'path';
import FFmpegStreams from "./Streams.js";

export default class FFmpeg extends MODULECLASS {
    constructor(parent, options) {
        super(parent, options);
        this.label = 'FFMPEG';

        this.streamConfigsPath = path.resolve(`${APP_DIR}/${STREAMS_CONFIG_PATH}`);

        return new Promise((resolve, reject) => {
            LOG(this.label, 'INIT');

            const streamsOptions = {
                streamConfigsPath: this.streamConfigsPath
            };
            new FFmpegStreams(this, streamsOptions).then(streams => {
                this.streams = streams;
                //LOG(this.label, 'PROPS', Object.getOwnPropertyNames(this.streams));

                resolve(this);
            });
        });
    }
}
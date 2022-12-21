import dotenv from 'dotenv';
import fs from 'fs-extra';
import path from 'path';
import FFmpegStream from "./Stream.js";

export default class FFmpegStreams extends MODULECLASS {
    constructor(parent, options) {
        super(parent, options);

        this.label = 'FFMPEG STREAMS';
        this.configsPath = options.configsPath || path.resolve(`${APP_DIR}/config/streams`);
        this.configFiles = [];
        this.configs = [];
        this.items = []

        return new Promise(async (resolve, reject) => {
            LOG(this.label, 'INIT');

            await this.getConfigs();
            await this.createStreams();

            // ...

            this.registerPrivates();

            // important! the return is the streams array
            // this class is accessible: this.items.root
            resolve(this.items);
        });
    }

    createStreams() {
        return new Promise((resolve, reject) => {
            const streams = [];
            this.configs.forEach(config => streams.push(new FFmpegStream(this, config).then(stream => stream)));

            Promise.all(streams).then(streamsData => {
                this.items = streamsData;
                resolve(true);
            });
        });
    }


    registerPrivates() {
        this.privates([
                'getConfigFiles',
                'getConfigsRaw',
                'getConfigsData',
                'getConfigs'
            ],
            this.items);

        this.private('root', this.items, this);
    }


    async getConfigs() {
        this.configFiles = await this.getConfigFiles();
        this.configsRaw = await this.getConfigsRaw();
        this.configs = this.getConfigsData();
        LOG(this.label, 'GOT', this.configs.length, 'STREAM CONFIGS');
    }

    /**
     *
     * @returns {Promise<unknown>}
     */
    getConfigFiles() {
        return new Promise((resolve, reject) => {
            try {
                fs.readdir(this.configsPath).then(files => resolve(files.filter(f => f.match(/\.conf$/) !== null)));
            } catch (err) {
                console.error(err);
                reject(err);
            }
        });
    }

    getConfigsRaw() {
        return new Promise((resolve, reject) => {
            const reads = [];

            this.configFiles.forEach(configFile => {
                const filePath = `${this.configsPath}/${configFile}`;
                reads.push(fs.readFile(filePath).then(file => file.toString()));
            });

            Promise.all(reads).then(raw => {
                resolve(raw);
            });
        });
    }

    getConfigsData() {
        const configs = [];
        this.configsRaw.forEach(configData => {
            const configDot = dotenv.parse(configData);
            const config = {};
            Object.keys(configDot).forEach(k => config[k.toLowerCase()] = configDot[k]);
            configs.push(config);
        });
        return configs;
    }

}
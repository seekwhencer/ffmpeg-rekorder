import './lib/Globals.js';
import Config from '../shared/lib/Config.js';
import WebServer from './lib/Server/index.js';
import FFmpeg from "./lib/FFmpeg/index.js";
import Mqtt from "./lib/Mqtt/index.js";

export default class WeatherStation extends MODULECLASS {
    constructor() {
        super();

        global.APP = this;

        return new Config(this)
            .then(config => {
                global.CONF = config;
                global.CONFIG = config.configData;
                return new WebServer(this);
            })
            .then(webserver => {
                global.APP.WEBSERVER = webserver;
                return new Mqtt(this);
            })
            .then(mqtt => {
                global.APP.MQTT = mqtt;
                return new FFmpeg(this);
            })
            .then(ffmpeg => {
                global.APP.FFMPEG = ffmpeg;
                return Promise.resolve(this);
            });
    }
}
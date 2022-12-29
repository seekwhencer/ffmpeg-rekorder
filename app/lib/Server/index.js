import express from 'express';
import path from 'path';
import fs from 'fs-extra';
import expressWs from 'express-ws';
import * as Routes from './routes/index.js';

export default class WebServer extends MODULECLASS {
    constructor(parent) {
        super(parent);

        return new Promise((resolve, reject) => {
            this.label = 'WEBSERVER';
            LOG(this.label, 'INIT');

            this.parent = parent;
            this.port = SERVER_PORT || 3000;

            //@TODO
            process.env.NODE_ENV === 'production' ? this.env = 'prod' : this.env = 'dev';
            //this.documentRoot = path.resolve(`${process.cwd()}/../frontend/dist/${this.env}`);

            this.documentRoot = path.resolve(`${process.cwd()}/${FRONTEND_BUNDLE}`);

            const icon = `${this.documentRoot}/favicon.ico`;
            const jsonTopicsData = path.resolve(`${process.cwd()}/../config/topics.json`);

            global.EXPRESS = express;

            this.create().then(() => resolve(this));

        });
    }

    create() {
        this.engine = EXPRESS();
        this.ws = expressWs(this.engine);

        // websocket connection
        this.engine.ws('/live', (ws, req) => {
            ws.on('message', msg => {
                ws.send(msg);
            });
        });

        // statics
        this.engine.use(express.static(this.documentRoot));

        // favicon
        this.engine.get('/favicon.ico', (req, res) => {
            if (fs.existsSync(icon)) {
                res.setHeader('Content-Type', 'application/json');
                res.sendFile(icon);
            } else {
                res.end();
            }
        });

        // static data @the moment
        this.engine.get('/topics', (req, res) => {
            if (fs.existsSync(jsonTopicsData)) {
                res.sendFile(jsonTopicsData);
            } else {
                res.end();
            }
        });

        // the routes
        Object.keys(Routes).forEach(route => this.engine.use(`/`, new Routes[route](this)));

        // start
        return new Promise((resolve, reject) => {
            this.engine.listen(this.port, () => {
                LOG(this.label, 'IS LISTENING ON PORT:', this.port);
                resolve();
            });
        });

    }
}
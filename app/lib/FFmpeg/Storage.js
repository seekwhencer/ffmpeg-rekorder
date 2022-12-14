import {Temporal, Intl, toTemporalInstant} from '@js-temporal/polyfill';
import StorageFolder from './StorageFolder.js';
import StorageFile from './StorageFile.js';
import fs from 'fs-extra';
import path from 'path';


export default class extends MODULECLASS {
    constructor(parent, options) {
        super(parent, options);

        this.label = 'FFMPEG STORAGE';
        this.stream = parent;
        this.includes = ['mp4'];

        LOG(this.label, 'INIT');

        //this.checkAge(); // do it later
        setInterval(() => this.checkAge(), 60000); // this is fixed ;) every minute.

        this.on('data', files => {

            const a = new Date(this.clearDateTime);
            this.files = files.childs.map(file => {
                const b = new Date(file.isotimedate);
                return {
                    //...file,
                    dateTime: file.isotimedate,
                    clearDateTime: this.clearDateTime,
                    fileName: file.fileName,
                    filePath: file.filePath,
                    extension: file.extension,
                    toDrop: (b < a)
                };
            });

            LOG(this.label, this.stream.name, 'GOT', this.files.length, 'FILES IN', this.stream.recordPath, 'TO DROP', this.files.filter(f => f.toDrop).length, {verbose: 2});

            // finally ;)
            this.dropFiles();
        });
    }

    dropFiles() {
        LOG(this.label, this.stream.name, 'DROPPING FILES IF NECESSARY', {verbose: 2});
        this.files.filter(f => f.toDrop).forEach(file => {
            LOG(this.label, this.stream.name, 'DROPPING', file.filePath, {verbose: 2});
            fs.remove(file.filePath);
        });
    }

    checkAge() {
        const now = Temporal.Now.plainDateTimeISO();
        const duration = Temporal.Duration.from(this.stream.storageAge);
        const result = now.subtract(duration);
        this.clearDateTime = result.toString();
        LOG(this.label, this.stream.name, 'DROP RECORDINGS OLDER THEN', this.clearDateTime, {verbose: 2});

        this
            .collect(this.stream.recordPath, false, this.includes)
            .then(data => this.emit('data', data));
    }

    collect(folder, recursive, includes, withDirs, depth,) {
        return new Promise((resolve, reject) => {
            let rootFolderOptions = {
                id: 'rootfolder', path: '', folderName: ''
            };

            if (folder) {
                const folderName = folder.split('/')[folder.split('/').length - 1];
                rootFolderOptions = {
                    id: folderName, path: folder, folderName: folderName
                };
            }
            const data = new StorageFolder(this, rootFolderOptions);

            // the complete folder content
            data.childs = this.readFolder(folder, recursive, includes, withDirs, depth);

            if (data.childs) {
                resolve(data);
            } else {
                reject('Nothing found in place.');
            }
        });
    }

    // walk thru the disk tree and fetch it
    readFolder(folder, recursive, includes, withDirs, depth) {

        // local recursive function
        const walk = (folder, recursive, level) => {
            let collection = [];

            if (fs.existsSync(folder)) {
                const dir = fs.readdirSync(folder);

                dir.forEach(i => {
                    let itemPath = `${folder}/${i}`;

                    if (fs.existsSync(itemPath)) {

                        try {
                            const xstat = fs.statSync(itemPath);
                            const xstatItem = {
                                atime: 'at' + xstat.atime.getTime(),
                                mtime: 'mt' + xstat.mtime.getTime(),
                                ctime: 'ct' + xstat.ctime.getTime(),
                                btime: `bt${xstat.birthtime.getTime()}`,
                                isotimedate: xstat.birthtime.toISOString()
                            };
                            let item = false;

                            // the directories
                            if (xstat.isDirectory()) {
                                if (withDirs === true || withDirs === 'only') {
                                    let folderName = path.basename(itemPath);

                                    item = new StorageFolder(this, {
                                        id: folderName, path: itemPath, folderName: folderName, ...xstatItem
                                    });

                                    if (recursive === true || level < depth) {
                                        LOG(this.label, this.stream.name, 'DEPTH PATH', level, itemPath, {verbose: 2});
                                        item.childs = walk(itemPath, recursive, level + 1);
                                    }

                                    collection.push(item);
                                }
                            }

                            // the files
                            if (!xstat.isDirectory() && withDirs !== 'only') {
                                let fileName = path.basename(itemPath).replace(path.extname(itemPath), '');
                                let extension = path.extname(itemPath).replace('.', '');

                                const regexExtensions = new RegExp(includes.join("|"), "i");
                                if (regexExtensions.test(extension)) {
                                    item = new StorageFile(this, {
                                        id: fileName,
                                        filePath: itemPath,
                                        fileName: fileName,
                                        extension: extension,
                                        size: xstat.size, ...xstatItem
                                    });

                                    collection.push(item);
                                }
                            }

                        } catch (err) {
                            LOG(this.label, this.stream.name, 'NOT READABLE', itemPath, err, {verbose: 2});
                            collection = walk(itemPath, recursive, level + 1);
                        }
                    } else {
                        LOG(this.label, this.stream.name, 'NOT EXISTS', itemPath, {verbose: 2});
                        collection = walk(itemPath, recursive, level + 1);
                    }


                });
            } else {
                LOG(this.label, this.stream.name, 'NOT EXISTS ', folder, {verbose: 2});
            }

            return collection;
        };

        return walk(folder, recursive, 0);
    };
}
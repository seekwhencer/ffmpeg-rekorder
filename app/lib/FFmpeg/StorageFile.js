import StorageItem from './StorageItem.js';

export default class StorageFile extends StorageItem {
    constructor(parent, options) {
        super(parent, options);

        this.options = options;
        this.type = 'video';
        this.id = options.id;

        this.generateHash();

        this.filePath = options.filePath;
        this.fileName = options.fileName;
        this.extension = options.extension;
        this.size = options.size;

        this.pathExtracted = this.filePath.replace(`${this.parent.rootPath}/`, '');
        this.pathCrumped = this.pathExtracted.split('/');

        this.uri = encodeURI(this.pathCrumped.join('/')).replace(/^\//, '').replace(/\/$/, '');
    }

    aggregate() {
        return {
            type: this.type,
            id: this.id,
            hash: this.hash,
            filePath: this.filePath,
            fileName: this.fileName,
            extension: this.extension,
            size: this.size,

            pathExtracted: this.pathExtracted,
            pathCrumped: this.pathCrumped,

            uri: this.uri,

            atime: this.options.atime,
            btime: this.options.btime,
            ctime: this.options.ctime,
            mtime: this.options.mtime,
            isotimedate: this.options.isotimedate,
        }
    }

};

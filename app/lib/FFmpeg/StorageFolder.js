import StorageItem from './StorageItem.js';

export default class StorageFolder extends StorageItem {
    constructor(parent, options) {
        super(parent, options);

        this.options = options;

        this.type = 'folder';
        this.id = options.id;
        this.path = options.path;
        this.folderName = options.folderName;

        this.pathExtracted = this.path.replace(`${this.parent.rootPath}/`, '');
        this.pathCrumped = this.pathExtracted.split('/');
        this.uri = encodeURI(this.pathCrumped.join('/')).replace(/^\//, '').replace(/\/$/, '');

        this.generateHash();

    }

    /**
     * @TODO from item class
     */
    aggregate() {
        return {
            type: this.type,
            id: this.id,
            hash: this.hash,
            path: this.path,
            folderName: this.folderName,

            pathExtracted: this.pathExtracted,
            pathCrumped: this.pathCrumped,
            uri: this.uri,

            atime: this.options.atime,
            btime: this.options.btime,
            ctime: this.options.ctime,
            mtime: this.options.mtime,
            isotimedate: this.options.isotimedate,

            childs: (this.childs ? this.childs.map(c => c.aggregate()) : null)
        };
    }
};

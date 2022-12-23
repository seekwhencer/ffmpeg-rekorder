import Crypto from 'crypto';

export default class StorageItem extends MODULECLASS {
    constructor(parent, options) {
        super(parent, options);

        this.options = options;

        this.atime = options.atime;
        this.btime = options.btime;
        this.mtime = options.mtime;
        this.ctime = options.ctime;
        this.isotimedate = options.isotimedate;
    }

    generateHash() {
        let toHash = `${this.isotimedate}${this.options.folderName}`;
        this.hash = Crypto.createHash('md5').update(toHash).digest("hex");
    }

    get hash() {
        return this._hash;
    }

    set hash(value) {
        this._hash = value;
    }
};

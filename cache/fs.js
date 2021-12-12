const fs = require('fs/promises');
const {createReadStream, createWriteStream} = require('fs')
const crypto = require("crypto");
const {Cache} = require("./cache");
const {NullLogger, Logger} = require("../logging");

class FileSystemCache extends Cache {
    /**
     * @param {string} baseDir
     * @param {number?} mode
     * @param {Logger?} logger
     */
    constructor(baseDir, mode, logger) {
        super();
        this._baseDir = baseDir;
        this._mode = mode || undefined;
        this._logger = logger || new NullLogger();
    }

    /** @inheritdoc */
    async get(key) {
        const filename = this.convertKeyToFilename(key);
        let fd;
        try {
            fd = await fs.open(filename);
        } catch (err) {
            if (err.code === 'ENOENT') {
                return null;
            }
            this._logger.error(`Error while opening file for reading: ${err.message}`, {
                key: key,
                bucket: this._bucket,
            }).then(() => {
            });
            throw err;
        }
        return fd.createReadStream();
    }

    /** @inheritdoc */
    async set4(key, value, ttl = null) {
        const filename = this.convertKeyToFilename(key);
        let fd;
        try {
            fd = await fs.open(filename, 'w');
        } catch (err) {
            if (err.code === 'ENOENT') {
                return null;
            }
            this._logger.error(`Error while opening file for reading: ${err.message}`, {
                key: key,
                bucket: this._bucket,
            }).then(() => {
            });
            throw err;
        }
    }

    /** @inheritdoc */
    async set2(key, value, ttl = null) {
        const filename = this.convertKeyToFilename(key);
        const stream = createWriteStream(filename);
        stream.on('open', () => {
            value.pipe(stream);
        });

        // try {
        //     await value.pipe(stream);
        // } catch (err) {
        //     this._logger.error(`Error while piping file for writing: ${err.message}`, {
        //         key: key,
        //         bucket: this._bucket,
        //     }).then(() => {
        //     });
        //     throw err;
        // }
        // stream.end();
    }

    /** @inheritdoc */
    async set(key, value, ttl = null) {
        const filename = this.convertKeyToFilename(key);
        let fd;
        try {
            fd = await fs.open(filename, 'w', this._mode);
        } catch (err) {
            this._logger.error(`Error while opening file for writing: ${err.message}`, {
                key: key,
                bucket: this._bucket,
            }).then(() => {
            });
            throw err;
        }
        const stream = fd.createWriteStream();
        await value.pipe(stream);
        await fd.sync();
        stream.end();
        fd.close();
    }

    /**
     * @param {string} key
     * @return {string}
     */
    convertKeyToFilename(key) {
        return this._baseDir + '/' + crypto.createHash('md5').update(key).digest("hex");
    }
}

module.exports = {FileSystemCache}

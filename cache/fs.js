const fs = require('fs/promises');
const crypto = require("crypto");
const {Cache} = require("./cache");
const {NullLogger, Logger} = require("../logging");
const {DEBUG, ERROR} = require("../logging/level");

/**
 * FileSystemCache (currently) DOES NOT support ttl restriction
 */
class FileSystemCache extends Cache {
    /**
     * @param {string} baseDir
     * @param {(number|string)} [mode]
     * @param {Logger?} [logger]
     */
    constructor(baseDir, mode, logger) {
        super();
        this._baseDir = baseDir;
        this._mode = mode || undefined;
        this._logger = logger || new NullLogger();
    }

    /**
     * FileSystemCache (currently) DOES NOT support ttl restriction
     * @inheritdoc
     */
    async get(key, ttl) {
        const filename = this.convertKeyToFilename(key);
        this.#log(DEBUG, 'Reading data from file', {
            filename: filename,
        });
        let fd;
        try {
            fd = await fs.open(filename);
        } catch (err) {
            if (err.code === 'ENOENT') {
                this.#log(DEBUG, 'File does not exist', {
                    filename: filename,
                });
                return null;
            }
            this._logger.error(`Error while opening file for reading: ${err.message}`, {
                key: key,
                bucket: this._bucket,
            }).then(() => {
            });
            throw err;
        }
        this.#log(DEBUG, 'File exists', {
            filename: filename,
        });
        return fd.createReadStream();
    }

    /** @inheritdoc */
    async set(key, value) {
        const filename = this.convertKeyToFilename(key);
        this.#log(DEBUG, 'Writing data to file', {
            filename: filename,
        });
        let handler;
        try {
            handler = await fs.open(filename, 'w', this._mode);
        } catch (err) {
            this.#log(ERROR, `Error while opening file for writing: ${err.message}`, {
                key: key,
                bucket: this._bucket,
            });
            throw err;
        }
        if (typeof value.pipe === 'function') {
            const stream = handler.createWriteStream();
            await value.pipe(stream);
        } else {
            await handler.write(value);
        }
        await handler.sync();
        await handler.close();
    }

    async close() {};

    /** @inheritdoc */
    describe() {
        return {
            driver: this.constructor.name,
            baseDir: this._baseDir,
            mode: this._mode,
        };
    }

    /**
     * @param {string} key
     * @return {string}
     */
    convertKeyToFilename(key) {
        return this._baseDir + '/' + crypto.createHash('md5').update(key).digest("hex");
    }

    /**
     * @param {!number} level
     * @param {!string} message
     * @param {Object.<string, *>} [context]
     * @return {void}
     */
    async #log(level, message, context) {
        message = `${this.constructor.name}: ${message}`;
        await this._logger.log(level, message, context);
    }
}

module.exports = {FileSystemCache}

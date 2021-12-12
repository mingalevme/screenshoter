const {
    S3Client,
    GetObjectCommand,
    GetObjectCommandInput,
    GetObjectOutput,
    PutObjectCommand,
    PutObjectCommandInput
} = require("@aws-sdk/client-s3");
const {Logger, NullLogger, ERROR, DEBUG, NOTICE} = require("../logging");
const {Cache} = require("./cache");
const crypto = require("crypto");

class S3Cache extends Cache {
    /**
     * @param {!S3Client} s3client
     * @param {!string} bucket
     * @param {Logger?} logger
     * @param {(function(): Date)?} now
     */
    constructor(s3client, bucket, logger, now) {
        super();
        this._s3client = s3client;
        this._bucket = bucket;
        this._logger = logger || new NullLogger();
        this._now = now || (() => new Date());
    }

    /** @inheritdoc */
    async get(key, ttl) {
        const filename = this.convertKeyToFilename(key);
        this.#log(DEBUG, `Getting data from storage`, {
            key: key,
            object: `${this._bucket}/${filename}`,
        });
        /** @see GetObjectCommandInput */
        const getObjectCommand = new GetObjectCommand({
            Bucket: this._bucket,
            Key: filename,
        });
        /** @type {GetObjectOutput} */
        let response;
        try {
            response = await this._s3client.send(getObjectCommand);
        } catch (err) {
            if (err.name === 'NoSuchKey') {
                this.#log(DEBUG, 'Storage does not contain object', {
                    key: key,
                    object: `${this._bucket}/${filename}`,
                });
                return null;
            }
            this.#log(ERROR, `Error while getting an object from s3: ${err.message}`, {
                key: key,
                object: `${this._bucket}/${filename}`,
            });
            throw err;
        }
        if (!ttl) {
            this.#log(DEBUG, 'Object found (ttl is not set)', {
                key: key,
                object: `${this._bucket}/${filename}`,
            });
            return response.Body;
        }
        if (ttl && !response.LastModified) {
            this.#log(NOTICE, 'Object found but Last-Modified is empty', {
                key: key,
                object: `${this._bucket}/${filename}`,
            });
            return null;
        }
        if (response.LastModified.getTime() + ttl*1000 < this._now().getTime()) {
            this.#log(DEBUG, 'Object found, but is too old', {
                key: key,
                object: `${this._bucket}/${filename}`,
                LastModified: response.LastModified.toISOString(),
            });
            return null;
        }
        this.#log(DEBUG, 'Object found (ttl checked)', {
            key: key,
            object: `${this._bucket}/${filename}`,
        });
        return response.Body;
    };

    /** @inheritdoc */
    async set(key, value) {
        const filename = this.convertKeyToFilename(key);
        this.#log(DEBUG, `Putting data to storage`, {
            key: key,
            object: `${this._bucket}/${filename}`,
        });
        /** @see PutObjectCommandInput */
        const putObjectCommand = new PutObjectCommand({
            Bucket: this._bucket,
            Key: filename,
            Body: value,
        });
        try {
            await this._s3client.send(putObjectCommand)
        } catch (err) {
            this.#log(ERROR, `Error while putting an object to storage: ${err.message}`, {
                key: key,
                object: `${this._bucket}/${filename}`,
            });
            throw err;
        }
        this.#log(DEBUG, `Data has been successfully put to storage`, {
            key: key,
            object: `${this._bucket}/${filename}`,
        });
    };

    /** @inheritdoc */
    describe() {
        return {
            driver: this.constructor.name,
            bucket: this._bucket,
        };
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

    /**
     * @param {string} key
     * @return {string}
     */
    convertKeyToFilename(key) {
        return crypto.createHash('md5').update(key).digest("hex");
    }
}

module.exports = {S3Cache};

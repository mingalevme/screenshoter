
const {GetObjectCommand, GetObjectCommandInput, S3Client} = require("@aws-sdk/client-s3");
const {Logger, NullLogger} = require("../logging");

const {Cache} = require("./cache");

class S3Cache extends Cache {
    /**
     * @param {S3Client} s3client
     * @param {string} bucket
     * @param {Logger?} logger
     */
    constructor(s3client, bucket, logger) {
        super();
        this._s3client = s3client;
        this._bucket = bucket;
        this._logger = logger || new NullLogger();
    }

    /** @inheritdoc */
    async get(key) {
        this._logger.debug(`Requesting s3`, {
            key: key,
            bucket: this._bucket,
        }).then(() => {});
        /** @type {GetObjectCommandInput} */
        const input = {
            Bucket: this._bucket,
            Key: key,
        };
        const getObjectCommand = new GetObjectCommand(input);
        try {
            return (await this._s3client.send(getObjectCommand)).Body;
        } catch (err) {
            if (err.name === 'NoSuchKey') {
                return null;
            }
            this._logger.error(`Error while requesting s3: ${err.message}`, {
                key: key,
                bucket: this._bucket,
            }).then(() => {});
            return null;
        }
    };

    /** @inheritdoc */
    async set(key, value, ttl = null) {
        throw new Error('Unimplemented');
    };
}

module.exports = {S3Cache};

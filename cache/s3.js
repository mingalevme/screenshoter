const {
    S3Client,
    GetObjectCommand,
    GetObjectCommandInput,
    GetObjectOutput,
    PutObjectCommand,
    PutObjectCommandInput
} = require("@aws-sdk/client-s3");
const {Logger, NullLogger} = require("../logging");
const {Cache} = require("./cache");

class S3Cache extends Cache {
    /**
     * @param {S3Client} s3client
     * @param {string} bucket
     * @param {Logger?} logger
     * @param {?(function(): Date)} now
     */
    constructor(s3client, bucket, logger, now) {
        super();
        this._s3client = s3client;
        this._bucket = bucket;
        this._logger = logger || new NullLogger();
        this._now = now || (() => new Date());
    }

    /** @inheritdoc */
    async get(key) {
        this._logger.debug(`Requesting s3`, {
            key: key,
            bucket: this._bucket,
        }).then(() => {
        });
        /** @see GetObjectCommandInput */
        const getObjectCommand = new GetObjectCommand({
            Bucket: this._bucket,
            Key: key,
        });
        /** @type {GetObjectOutput} */
        let response;
        try {
            response = await this._s3client.send(getObjectCommand);
        } catch (err) {
            if (err.name === 'NoSuchKey') {
                return null;
            }
            this._logger.error(`Error while getting an object from s3: ${err.message}`, {
                key: key,
                bucket: this._bucket,
            }).then(() => {
            });
            throw err;
        }
        if (response.Expires) {
            if (response.Expires.getTime() < this._now().getTime()) {
                return null;
            }
        }
        return response.Body;
    };

    /** @inheritdoc */
    async set(key, value, ttl = null) {
        /** @see PutObjectCommandInput */
        const putObjectCommand = new PutObjectCommand({
            Bucket: this._bucket,
            Key: key,
            Body: value,
            Expires: ttl
                ? new Date(this._now().getTime() + 1000*ttl)
                : null,
        });
        try {
            await this._s3client.send(putObjectCommand)
        } catch (err) {
            this._logger.error(`Error while putting an object to s3: ${err.message}`, {
                key: key,
                bucket: this._bucket,
            }).then(() => {
            });
            throw err;
        }
    };
}

module.exports = {S3Cache};

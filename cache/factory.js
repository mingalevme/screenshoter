const {S3Client, S3ClientConfig} = require("@aws-sdk/client-s3")
const os = require("os");
const fs = require("fs");
const Logger = require("../logging").Logger;
const Cache = require("./cache").Cache;
const NullCache = require("./null").NullCache;
const S3Cache = require('./s3').S3Cache;
const FileSystemCache = require('./fs').FileSystemCache;

class CacheFactoryCreateConfig {
    /** @type {?string} */
    Driver;

    /** @type {?string} */
    S3EndpointUrl;
    /** @type {?string} */
    S3Region;
    /** @type {?string} */
    S3AccessKeyId;
    /** @type {?string} */
    S3SecretAccessKey;
    /** @type {?string} */
    S3Bucket;
    /** @type {boolean} */
    S3ForcePathStyle = false;

    /** @type {?string} */
    FileSystemBaseDir;
    /** @type {?string} */
    FileSystemMode;
}

class CacheFactory {

    /**
     * @param {?Logger} logger
     */
    constructor(logger) {
        this._logger = logger;
    }

    /**
     * @param {CacheFactoryCreateConfig} config
     * @return {(Cache|null)}
     */
    create(config,) {
        if (config.Driver === 's3') {
            return this.createS3Driver(config);
        }
        if (config.Driver === 'filesystem') {
            return this.createFileSystemDriver(config);
        }
        if (config.Driver === 'null') {
            return this.createNullDriver(config);
        }
        if (config.Driver === undefined) {
            return null;
        }
        throw new Error(`Unknown driver: ${config.Driver}`)
    }

    /**
     * @param {CacheFactoryCreateConfig} config
     * @return {NullCache}
     */
    createNullDriver(config) {
        return new NullCache();
    }

    /**
     * @param {CacheFactoryCreateConfig} config
     * @return {S3Cache}
     */
    createS3Driver(config) {
        if (!config.S3Bucket) {
            throw new Error('bucket name is empty');
        }
        /** @see {S3ClientConfig} */
        const configuration = {
            endpoint: config.S3EndpointUrl || undefined,
            region: config.S3Region || 'us-east-1',
            credentials: {
                accessKeyId: config.S3AccessKeyId,
                secretAccessKey: config.S3SecretAccessKey,
            },
            forcePathStyle: !!config.S3ForcePathStyle,
        };
        const s3client = new S3Client(configuration);
        return new S3Cache(s3client, config.S3Bucket || '', this._logger);
    };

    /**
     * @param {CacheFactoryCreateConfig} config
     * @return {FileSystemCache}
     */
    createFileSystemDriver(config) {
        const baseDir = config.FileSystemBaseDir || `${os.tmpdir()}/screenshoter`;
        fs.mkdirSync(baseDir, {
            recursive: true,
            mode: config.FileSystemMode || undefined,
        });
        return new FileSystemCache(baseDir, config.FileSystemMode || undefined, this._logger);
    }
}

module.exports = {CacheFactory, CacheFactoryCreateConfig};

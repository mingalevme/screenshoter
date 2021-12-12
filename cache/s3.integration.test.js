const {S3Client, S3ClientConfig, GetObjectCommand, DeleteObjectCommand} = require("@aws-sdk/client-s3")
const {S3Cache} = require("./s3");
const crypto = require("crypto");

const {ConsoleLogger} = require("../logging");
const {streamToString} = require("../stream-to-string");

const s3endpointUrl = process.env.SCREENSHOTER_TEST_S3_ENDPOINT_URL;
const s3region = process.env.SCREENSHOTER_TEST_S3_REGION || 'us-east-1';
const s3accessKeyId = process.env.SCREENSHOTER_TEST_S3_ACCESS_KEY_ID || '';
const s3secretAccessKey = process.env.SCREENSHOTER_TEST_S3_SECRET_ACCESS_KEY || '';
const s3bucket = process.env.SCREENSHOTER_TEST_S3_BUCKET || 'screenshoter';
const s3forcePathStyle = !!(process.env.SCREENSHOTER_TEST_S3_FORCE_PATH_STYLE);

describe('cache: s3 (integration)', () => {
    if (!s3accessKeyId && !s3secretAccessKey) {
        console && console.log('Test is skipped');
        test('test is skipped', async () => {
            expect(true).toBe(true);
        });
        return;
    }
    /** @see {S3ClientConfig} */
    const configuration = {
        endpoint: s3endpointUrl || undefined,
        region: s3region,
        credentials: {
            accessKeyId: s3accessKeyId,
            secretAccessKey: s3secretAccessKey,
        },
        forcePathStyle: s3forcePathStyle,
    };
    const s3client = new S3Client(configuration);

    test('set/get', async () => {
        const cache = new S3Cache(s3client, s3bucket, new ConsoleLogger());
        const key = 'foo';
        const s3FileName = crypto.createHash('md5').update(key).digest("hex");
        const deleteObjectCommand = new DeleteObjectCommand({
            Bucket: s3bucket,
            Key: s3FileName,
        });
        await s3client.send(deleteObjectCommand);
        // Reading 1
        const result1 = await cache.get(key);
        expect(result1).toBe(null);
        // Setting
        const value = crypto.randomBytes(16).toString('hex');
        await cache.set(key, value);
        const getObjectCommand = new GetObjectCommand({
            Bucket: s3bucket,
            Key: s3FileName,
        });
        const response = await s3client.send(getObjectCommand);
        expect(await streamToString(response.Body)).toBe(value);
        // Reading 2
        const result2 = await cache.get(key);
        expect(await streamToString(result2)).toBe(value);
    });
});

const {S3Client, S3ClientConfig} = require("@aws-sdk/client-s3")
const {S3Cache} = require("./s3");
const {ConsoleLogger} = require("../logging");

const s3endpointUrl = process.env.SCREENSHOTER_TEST_S3_ENDPOINT_URL;
const s3region = process.env.SCREENSHOTER_TEST_S3_REGION || 'us-east-1';
const s3accessKeyId = process.env.SCREENSHOTER_TEST_S3_ACCESS_KEY_ID || '';
const s3secretAccessKey = process.env.SCREENSHOTER_TEST_S3_SECRET_ACCESS_KEY || '';
const s3bucket = process.env.SCREENSHOTER_TEST_S3_BUCKET || 'screenshoter';

describe('cache: s3', () => {
    if (!s3accessKeyId && !s3secretAccessKey) {
        console && console.log('Test is skipped');
        return;
    }
    /** @type {S3ClientConfig} */
    const configuration = {
        endpoint: s3endpointUrl || undefined,
        region: s3region,
        credentials: {
            accessKeyId: s3accessKeyId,
            secretAccessKey: s3secretAccessKey,
        },
        forcePathStyle: true,
    };
    const s3client = new S3Client(configuration);

    test('404', async () => {
        const cache = new S3Cache(s3client, s3bucket, new ConsoleLogger());
        const result = await cache.get('foobar');
        expect(result).toBe(null);
    });
});

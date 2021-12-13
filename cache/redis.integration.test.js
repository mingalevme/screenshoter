const {createClient} = require('redis');
const Readable = require('stream').Readable;
const {RedisCache, RedisCacheOptions} = require("./redis");
const {streamToString} = require("../stream-to-string");

const redisEnable = !!process.env.SCREENSHOTER_TEST_REDIS_ENABLE;
const redisHost = !!process.env.SCREENSHOTER_TEST_REDIS_HOST || '127.0.0.1';
const redisPort = !!process.env.SCREENSHOTER_TEST_REDIS_PORT || 6379;
const redisUsername = !!process.env.SCREENSHOTER_TEST_REDIS_USERNAME || '';
const redisPassword = !!process.env.SCREENSHOTER_TEST_REDIS_PASSWORD || '';
const redisDatabase = !!process.env.SCREENSHOTER_TEST_REDIS_DATABASE || 0;

describe('cache: redis (integration)', () => {
    test('get', async () => {
        if (!redisEnable) {
            await console.log('Test is skipped');
            expect(true).toBe(true);
            return;
        }
        // redis[s]://[[username][:password]@][host][:port][/db-number]
        const url = `redis://${redisUsername}:${redisPassword}@${redisHost}:${redisPort}/${redisDatabase}`;
        const redisClient = createClient({
            url: url,
        });
        await redisClient.connect();
        let timeoutId = setTimeout(() => {
            redisClient.disconnect();
        }, 1000);
        const key = 'foo';
        const prefix = 'screenshoter-test-';
        await redisClient.del("screenshoter-test-acbd18db4cc2f85cedef654fccc4a4d8");
        const redisCacheOptions = new RedisCacheOptions();
        redisCacheOptions.Prefix = prefix;
        redisCacheOptions.ExpirationTime = 10;
        const cache = new RedisCache(redisClient, redisCacheOptions);
        let result = await cache.get(key);
        expect(result).toBe(null);
        const data = Readable.from('bar');
        await cache.set(key, data);
        result = await cache.get(key);
        expect(await streamToString(result)).toBe('bar');
        clearTimeout(timeoutId);
        await redisClient.disconnect();
    });
});

const {createClient} = require('redis');
const Readable = require('stream').Readable;
const {RedisCache, RedisCacheOptions} = require("./redis");
const {ConsoleLogger} = require("../logging");

describe('cache: redis (integration)', () => {
    test('get', async () => {
        const redisClient = createClient();
        try {
            redisClient.connect();
        } catch (err) {
            console.log('Test is skipped');
            return;
        }
        const key = 'foo';
        const prefix = 'screenshoter-test-';
        await redisClient.del("screenshoter-test-acbd18db4cc2f85cedef654fccc4a4d8");
        const redisCacheOptions = new RedisCacheOptions();
        redisCacheOptions.Prefix = prefix;
        redisCacheOptions.ExpirationTime = 10;
        const cache = new RedisCache(redisClient, redisCacheOptions, new ConsoleLogger());
        let result = await cache.get(key);
        expect(result).toBe(null);
        const data = Readable.from('bar');
        await cache.set(key, data);
        result = await cache.get(key);
        expect(result).toBe('bar');
        redisClient.disconnect();
    });
});

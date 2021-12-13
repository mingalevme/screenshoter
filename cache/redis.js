const {RedisClient, RedisCommandArguments} = require('redis');
const {Logger, NullLogger} = require("../logging");
const {Cache} = require("./cache");
const crypto = require("crypto");
const {streamToString} = require("../stream-to-string");

class RedisCacheOptions {
    /** @type {?string} */
    Prefix;
    /** @type {?number} */
    ExpirationTime;
}

class RedisCache extends Cache {
    /**
     * @param {!RedisClient} client
     * @param {RedisCacheOptions?} [options]
     * @param {Logger?} [logger]
     * @param {(function(): Date)?} [now]
     */
    constructor(client, options, logger, now) {
        super();
        this._client = client;
        this._options = options || new RedisCacheOptions();
        this._logger = logger || new NullLogger();
        this._now = now || (() => new Date());
    }

    /** @inheritdoc */
    async get(key, ttl) {
        const redisKey = this.#convertKeyToRedisKey(key);
        const time = Math.floor(this._now().getTime()/1000);
        //const result = await this._client.eval(this.#getGetDataLuaScript(), 2, redisKey, `${redisKey}:time`, (ttl || '60').toString(), time.toString());
        this._logger.debug('Getting data from Redis', {
            key: key,
            redisKey: redisKey,
            time: time,
        }).then();
        return this._client.sendCommand(['EVAL', this.#getGetDataLuaScript(), '2', redisKey, `${redisKey}:time`, (ttl || '0').toString(), time.toString()]);
    };

    /** @inheritdoc */
    async set(key, value) {
        const redisKey = this.#convertKeyToRedisKey(key);
        const time = Math.floor(this._now().getTime()/1000);
        this._logger.debug('Getting data from Redis', {
            key: key,
            redisKey: redisKey,
            time: time,
        }).then();
        await this._client.sendCommand(['EVAL', this.#getSetDataLuaScript(), '2', redisKey, `${redisKey}:time`, await streamToString(value), (this._options.ExpirationTime || '0').toString(), time.toString()]);
    };

    /** @inheritdoc */
    describe() {
        return {
            driver: this.constructor.name,
        };
    }

    /**
     * @param {!string} key
     * @return {string}
     */
    #convertKeyToRedisKey(key) {
        const hash = crypto.createHash('md5').update(key).digest("hex");
        return `${this._options.Prefix}${hash}`;
    }

    /**
     * @return {string}
     */
    #getGetDataLuaScript() {
        return `
            -- https://redis.io/commands/eval
            -- KEYS[1] - Cache key
            -- KEYS[2] - Cache object creation time
            -- ARGV[1] - Max TTL (not older than N seconds), 0 - disable
            -- ARGV[2] - Current Unix time
            
            local ttl = tonumber(ARGV[1] or '0')
            if ttl < 1 then
                return redis.call("get", KEYS[1])
            end
            
            local creationTime = redis.call("get", KEYS[2])
            
            -- If no creation time
            if (creationTime or '') == '' then
                return nil
            end
            
            local now = tonumber(ARGV[2])
            
            if (creationTime + ttl < now) then
                return nil
            end
            
            return redis.call('get', KEYS[1])
        `;
    }

    /**
     * @return {string}
     */
    #getSetDataLuaScript() {
        return `
            -- https://redis.io/commands/eval
            -- KEYS[1] - Cache key
            -- KEYS[2] - Cache object creation time
            -- ARGV[1] - Value
            -- ARGV[3] - Redis SET expire time (EX)
            -- ARGV[2] - Current Unix time
            
            local now = tonumber(ARGV[2])
            local ex = tonumber(ARGV[3] or '0')
            
            if ex > 0 then
                redis.call('set', KEYS[2], now, "EX", ex)
                redis.call('set', KEYS[1], ARGV[1], "EX", ex)
            else
                redis.call('set', KEYS[2], now)
                redis.call('set', KEYS[1], ARGV[1])
            end
        `;
    }
}

module.exports = {RedisCache, RedisCacheOptions};

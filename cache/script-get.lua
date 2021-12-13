-- https://redis.io/commands/eval
-- KEYS[1] - Cache key
-- KEYS[2] - Cache object creation time
-- ARGV[1] - Max TTL (not older than N seconds), 0 - disable
-- ARGV[2] - Current Unix time

local ttl = tonumber(ARGV[1] or '0')
if ttl < 1 then
    return redis.call('GET', KEYS[1])
end

local creationTime = redis.call('get', KEYS[2])

-- If no creation time
if (creationTime or '') == '' then
    return nil
end

local now = tonumber(ARGV[2])

if (creationTime + ttl < now) then
    return nil
end

return redis.call('get', KEYS[1])

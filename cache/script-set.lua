            -- https://redis.io/commands/eval
            -- KEYS[1] - Cache key
            -- KEYS[2] - Cache object creation time
            -- ARGV[1] - Value
            -- ARGV[3] - Redis SET expire time (EX)
            -- ARGV[2] - Current Unix time
            
            local now = tonumber(ARGV[2])
            local ex = tonumber(ARGV[3] or '0')
            
            if ex > 0 then
                local expireTime = tonumber(ARGV[3])
                redis.call('set', KEYS[2], now, "EX", expireTime)
                redis.call('set', KEYS[1], ARGV[1], "EX", expireTime)
            else
                redis.call('set', KEYS[2], now)
                redis.call('set', KEYS[1], ARGV[1])
            end

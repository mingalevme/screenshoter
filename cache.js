
const fs = require('fs');
const crypto = require('crypto');

exports.Cache = class {

    constructor(path) {
        this.path = path;
    }

    filename(key) {
        return this.path + '/' + crypto.createHash('md5').update(key).digest("hex");
    }

    get(key, ttl) {

        let filename = this.filename(key);

        try {
            var stat = fs.statSync(filename);
        } catch (e) {
            console.debug(`Cache does not exist`, {
                key: key,
                filename: filename,
            });
            return null;
        }

        if (ttl) {
            let modifiedAt = Date.parse(stat.mtime) / 1000;
            let now = Date.now() / 1000;
            console.log({
                modifiedAt: modifiedAt,
                modifiedAtIso8601: new Date(modifiedAt*1000).toISOString(),
                now: now,
                nowIso8601: new Date(now*1000).toISOString(),
                ttl: ttl,
            })
            if (modifiedAt + ttl < now) {
                console.debug(`Cache has been expired`, {
                    key: key,
                    filename: filename,
                });
                return null;
            }
        }

        console.debug(`Read from cache`, {
            key: key,
            filename: filename,
        });

        return fs.readFileSync(filename, {
            encoding: 'binary',
        });

    }

    set(key, data) {

        let filename = this.filename(key);

        fs.writeFileSync(filename, data, {
            encoding: 'binary',
        });

    }
};

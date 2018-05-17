
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

    async set(key, data) {

        let filename = this.filename(key);

        let proxy = filename + '.' + crypto.randomBytes(64).toString('hex').substr(0, 4) + '.tmp';

        return fs.writeFile(proxy, data, {
            encoding: 'binary',
        }, (err) => {
            if (err) {
                console.error('Error while writing proxy-file', {
                    proxy: proxy,
                    final: filename,
                    error: err,
                });
            } else {
                console.debug('Proxy file has been successfully written', {
                    proxy: proxy,
                    final: filename,
                    error: err,
                });
                fs.rename(proxy, filename, (err) => {
                    if (err) {
                        console.error('Error while renaming proxy-file to final', {
                            proxy: proxy,
                            final: filename,
                            error: err,
                        });
                    } else {
                        console.debug('Proxy-file has been successfully renamed to final', {
                            proxy: proxy,
                            final: filename,
                            error: err,
                        });
                    }
                });
            }
        });

    }
};

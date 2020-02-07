
const fs = require('fs');
const crypto = require('crypto');

exports.Cache = class {

    constructor(path) {
        this.path = path;
    }

    filename(key) {
        return this.path + '/' + crypto.createHash('md5').update(key).digest("hex");
    }

    async get(key, ttl) {
        let filename = this.filename(key);
        if (ttl) {
            return new Promise((resolve, reject) => {
                return this._getFileModifiedAt(filename).then(modifiedAt => {
                    if (!modifiedAt) {
                        return null;
                    }
                    let now = Math.floor(Date.now() / 1000);
                    if (modifiedAt + ttl < now) {
                        console.debug(`Cache has been expired ${now - modifiedAt} seconds ago`, {
                            filename: filename,
                        });
                        return null;
                    }
                    return this._readFile(filename);
                }, reject).then(resolve, reject);
            });
        } else {
            return this._readFile(filename);
        }
    }

    async getV2(key, ttl) {
        let filename = this.filename(key);

        if (!ttl) {
            return this._readFile(filename);
        }

        let stats;

        try {
            stats = await this._statFile(filename);
        } catch (err) {
            console.error("Error while reading cache file metadata", err);
            return null;
        }

        if (!stats) {
            return null;
        }

        let modifiedAt = Math.floor(Date.parse(stats.mtime) / 1000);
        let now = Math.floor(Date.now() / 1000);

        if (modifiedAt + ttl < now) {
            console.debug(`Cache has been expired ${now - modifiedAt} seconds ago`, {
                filename: filename,
            });
            return null;
        }

        return this._readFile(filename);
    }

    async _getFileModifiedAt(filename) {
        return new Promise((resolve, reject) => {
            this._statFile(filename).then(stats => {
                if (!stats) {
                    return resolve(null);
                }
                let modifiedAt = Math.floor(Date.parse(stats.mtime) / 1000);
                console.debug('Cache file modification timestamp has been received', {
                    modifiedAt: modifiedAt,
                    modifiedAtIso8601: stats.mtime,
                });
                return resolve(modifiedAt);
            }, reject);
        });
    }

    async _statFile(filename) {
        return new Promise((resolve, reject) => {
            fs.stat(filename, function(err, stats) {
                if (err) {
                    if (err.code === 'ENOENT') {
                        console.debug("Cache file does not exist", {
                            filename: filename,
                        });
                        return resolve(null);
                    } else {
                        console.debug("Error while reading cache file metadata", {
                            filename: filename,
                            error: err,
                        });
                        return reject(null);
                    }
                }
                console.debug("Cache file metadata has been received", stats);
                return resolve(stats);
            });
        });
    }

    async _readFile(filename) {
        return new Promise((resolve, reject) => {
            console.debug(`Reading data from cache`, {
                filename: filename,
            });
            fs.readFile(filename, {
                encoding: 'binary',
            }, (err, data) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        console.debug("File does not exist", {
                            filename: filename,
                        });
                        return resolve(null);
                    } else {
                        return reject(err);
                    }
                }
                return resolve(data);
            });
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

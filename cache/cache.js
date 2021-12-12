class Cache {
    /**
     * @param {!string} key
     * @return {(ReadableStream|null)}
     */
    async get(key) {
        throw new Error('Unimplemented');
    };

    /**
     * @param {!string} key
     * @param {!ReadableStream} value
     * @param {?number} ttl in seconds
     * @return {void}
     */
    async set(key, value, ttl = null) {
        throw new Error('Unimplemented');
    };
}

module.exports = {Cache}

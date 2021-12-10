class Cache {
    /**
     * @param {string} key
     * @return {ReadableStream | null}
     */
    async get(key) {
        throw new Error('Unimplemented');
    };

    /**
     * @param {string} key
     * @param {string} value
     * @param {number|null} ttl
     * @return {void}
     */
    async set(key, value, ttl = null) {
        throw new Error('Unimplemented');
    };
}

module.exports = {Cache}

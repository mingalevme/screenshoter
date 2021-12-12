class Cache {
    /**
     * @param {!string} key
     * @param {(number|null)} [ttl] Fetch data not older than ${ttl} seconds only
     * @return {(ReadableStream|null)}
     */
    async get(key, ttl) {
        throw new Error('Unimplemented');
    };

    /**
     * @param {!string} key
     * @param {(!ReadableStream|!Buffer|!string)} value
     * @return {void}
     */
    async set(key, value) {
        throw new Error('Unimplemented');
    };

    /**
     * @return {Object.<string, *>}
     */
    describe() {
        throw new Error('Unimplemented');
    }
}

module.exports = {Cache}

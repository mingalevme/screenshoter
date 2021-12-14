const {Cache} = require("./cache");

class NullCache extends Cache {
    /** @inheritdoc */
    async get(key, ttl) {
        return null;
    };

    /** @inheritdoc */
    async set(key, value) {
    };

    /** @inheritdoc */
    describe() {
        return {
            driver: this.constructor.name,
        };
    }
}

module.exports = {NullCache};

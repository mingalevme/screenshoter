const {Logger} = require('./logger');

class NullLogger extends Logger {
    /** @inheritdoc */
    async log(level, message, context) {}
}

module.exports = {NullLogger};

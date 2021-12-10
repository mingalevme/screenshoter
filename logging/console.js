const {DEBUG, INFO, Logger, WARNING} = require('./logger');

class ConsoleLogger extends Logger {
    /**
     * @param {Console?} output
     */
    constructor(output) {
        super();
        this._console = output || console;
    }
    /** @inheritdoc */
    async log(level, message, context) {
        context = context || {};
        if (level <= DEBUG) {
            this._console.debug(message, context);
            return;
        }
        if (level <= INFO) {
            this._console.info(message, context);
            return;
        }
        if (level <= WARNING) {
            this._console.warn(message, context);
            return;
        }
        this._console.error(message, context);
    }
}

module.exports = {ConsoleLogger};

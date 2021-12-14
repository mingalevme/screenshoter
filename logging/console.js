const {DEBUG, INFO, WARNING, stringify} = require('./level');
const {Logger} = require("./logger");

class ConsoleLogger extends Logger {
    /**
     * @param {number?} level
     * @param {Console?} output
     */
    constructor(level, output) {
        super();
        this.level = level || DEBUG;
        this._console = output || console;
    }

    /** @inheritdoc */
    async log(level, message, context) {
        if (level < this.level) {
            return;
        }
        message = `[${stringify(level).toUpperCase()}] ${message}`;
        context = JSON.stringify(context || {});
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

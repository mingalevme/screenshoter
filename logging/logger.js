const {DEBUG, INFO, NOTICE, WARNING, ERROR, CRITICAL, ALERT, EMERGENCY} = require("./level");

class Logger {
    async emergency(message, context) {
        await this.log(EMERGENCY, message, context);
    }

    async alert(message, context) {
        await this.log(ALERT, message, context);
    }

    async critical(message, context) {
        await this.log(CRITICAL, message, context);
    }

    async error(message, context) {
        await this.log(ERROR, message, context);
    }

    async warning(message, context) {
        await this.log(WARNING, message, context);
    }

    async notice(message, context) {
        await this.log(NOTICE, message, context);
    }

    async info(message, context) {
        await this.log(INFO, message, context);
    }

    async debug(message, context) {
        await this.log(DEBUG, message, context);
    }

    /**
     *
     * @param {number} level
     * @param {string} message
     * @param {Object|null} context
     * @return {Promise<void>}
     */
    async log(level, message, context) {
        throw new Error('Unimplemented');
    }
}

module.exports = {Logger};

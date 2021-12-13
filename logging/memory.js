const {Logger} = require('./logger');

class MemoryLogger extends Logger {
    constructor() {
        super();
        /** @type {MemoryLogger.LogItem[]} */
        this._history = [];
    }

    /** @inheritdoc */
    async log(level, message, context) {
        this._history.push(new this.LogItem(level, message, context));
    }

    /**
     * @return {MemoryLogger.LogItem[]}
     */
    getHistory() {
        return [...this._history];
    }

    LogItem = class {
        /**
         * @param {number} level
         * @param {string} message
         * @param {(Object|null)} context
         */
        constructor(level, message, context) {
            this._level = level;
            this._message = message;
            this._context = context;
        }

        /**
         * @return {number}
         */
        getLevel() {
            return this._level;
        }

        /**
         * @return {string}
         */
        getMessage() {
            return this._message;
        }

        /**
         * @return {Object|null}
         */
        getContext() {
            return this._context;
        }
    };
}

module.exports = {MemoryLogger};

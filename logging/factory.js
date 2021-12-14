const {Logger} = require('./logger')
const {NullLogger} = require('./null')
const {ConsoleLogger} = require('./console')
const {parseLevel} = require('./level')

class LoggerFactoryCreateConfig {
    /** @type {?string} */
    Channel;
    /** @type {?string} */
    Level;

    /** @type {?string} */
    ConsoleLevel;
}

class LoggerFactory {
    /**
     * @param {LoggerFactoryCreateConfig} config
     * @return {Logger}
     */
    create(config) {
        const channel = config.Channel || 'console';
        if (channel === 'console') {
            return this.createConsoleLogger(config);
        }
        if (channel === 'null') {
            return this.createNullLogger(config);
        }
        throw new Error(`Unknown logger channel: ${channel}`);
    }

    /**
     * @param {LoggerFactoryCreateConfig} config
     * @return {ConsoleLogger}
     */
    createConsoleLogger(config) {
        const level = parseLevel(config.ConsoleLevel || config.Level || 'debug');
        return new ConsoleLogger(level);
    }

    /**
     * @param {LoggerFactoryCreateConfig} config
     * @return {NullLogger}
     */
    createNullLogger(config) {
        return new NullLogger();
    }
}

module.exports = {LoggerFactoryCreateConfig, LoggerFactory}

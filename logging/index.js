const Logger = require('./logger');
const {ConsoleLogger} = require('./console');
const {NullLogger} = require('./null');
const {DEBUG, INFO, NOTICE, WARNING, ERROR, CRITICAL, ALERT, EMERGENCY, parseLevel} = require("./level");

module.exports = {
    Logger,
    ConsoleLogger,
    NullLogger,
    DEBUG,
    INFO,
    NOTICE,
    WARNING,
    ERROR,
    CRITICAL,
    ALERT,
    EMERGENCY,
    parseLevel
};

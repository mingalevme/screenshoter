const Logger = require('./logger');
const {ConsoleLogger} = require('./console');
const {NullLogger} = require('./null');

module.exports = {Logger, ConsoleLogger, NullLogger};

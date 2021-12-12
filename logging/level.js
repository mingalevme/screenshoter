const DEBUG = 100;
const INFO = 200;
const NOTICE = 250;
const WARNING = 300;
const ERROR = 400;
const CRITICAL = 500;
const ALERT = 550;
const EMERGENCY = 600;

/**
 * @param {string} level
 * @return {number}
 */
function parseLevel(level) {
    level = level.toLowerCase();
    if (level === 'debug') {
        return DEBUG;
    }
    if (level === 'info') {
        return INFO;
    }
    if (level === 'notice') {
        return NOTICE;
    }
    if (level === 'warning') {
        return WARNING;
    }
    if (level === 'error') {
        return ERROR;
    }
    if (level === 'critical') {
        return CRITICAL;
    }
    if (level === 'alert') {
        return ALERT;
    }
    if (level === 'emergency') {
        return EMERGENCY;
    }
    throw new Error(`Unknown log level: ${level}`)
}

/**
 * @param {number} level
 * @return {string}
 */
function stringify(level) {
    if (level === DEBUG) {
        return 'debug';
    }
    if (level === INFO) {
        return 'info';
    }
    if (level === NOTICE) {
        return 'notice';
    }
    if (level === WARNING) {
        return 'warning';
    }
    if (level === ERROR) {
        return 'error';
    }
    if (level === CRITICAL) {
        return 'critical';
    }
    if (level === ALERT) {
        return 'alert';
    }
    if (level === EMERGENCY) {
        return 'emergency';
    }
    return level.toString();
}

module.exports = {DEBUG, INFO, NOTICE, WARNING, ERROR, CRITICAL, ALERT, EMERGENCY, parseLevel, stringify}

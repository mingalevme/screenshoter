
const express = require('express');
const process = require('process');
const puppeteer = require('puppeteer');
const minimist = require('minimist');
const controller = require('./controller');

const argv = minimist(process.argv.slice(2));

const HOST = argv.host
    ? argv.host
    : '0.0.0.0';

const PORT = parseInt(argv.port) > 0
    ? parseInt(argv.port)
    : 8080;

const CHROMIUM_EXECUTABLE_PATH = argv['chromium-executable-path']
    ? argv['chromium-executable-path']
    : null;

puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    executablePath: CHROMIUM_EXECUTABLE_PATH,
    headless: true,
}).then(function (browser) {

    const app = express();

    /** @deprecated */
    app.get('/screenshot', (req, res) => {
        try {
            controller(browser, req, res);
        } catch (e) {
            console.error(e);
            res.status(400).end('Error while processing a request: ' + e.message);
        }
    });

    app.get('/take', (req, res) => {
        try {
            controller(browser, req, res);
        } catch (e) {
            console.error(e);
            res.status(400).end('Error while processing a request: ' + e.message);
        }
    });

    var server = app.listen(PORT, HOST, () => console.log(`Running on http://${HOST}:${PORT}`));

    server.on('close', function() {
        browser.close();
        console.log("\nBye!");
    });

    process.on('SIGINT', function() {
        browser.close();
        server.close();
    });

});

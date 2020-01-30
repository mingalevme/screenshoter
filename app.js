
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

const puppeteerLaunchOptions = {
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    executablePath: CHROMIUM_EXECUTABLE_PATH,
    headless: true,
};

puppeteer.launch(puppeteerLaunchOptions).then(browser => {

    const app = express();

    /** @deprecated Use /take instead */
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

    const server = app.listen(PORT, HOST, () => console.log(`Running on http://${HOST}:${PORT}`));

    server.on('close', () => {
        browser.close();
        console.log("\nBye!");
    });

    process.on('SIGINT', () => {
        try {
            browser.close();
        } catch (e) {
            console.error("Error closing browser while handling SIGINT: " . e.message);
        }
        server.close();
    });

    process.on("unhandledRejection", (reason, p) => {
        console.error("Unhandled Rejection at: Promise", p, "reason:", reason);
        try {
            browser.close();
        } catch (e) {
            console.error("Error closing browser while handling unhandledRejection: " . e.message);
        }
        server.close();
    });

    browser.on('disconnected', async () => {
        console.error("Browser has been disconnected");
        try {
            browser.close();
        } catch (e) {
            console.error("Error closing browser while gracefully handling browser disconnecting: " . e.message);
        }
        server.close();
    });

});

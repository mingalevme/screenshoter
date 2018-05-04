
const express = require('express');
const process = require('process');
const puppeteer = require('puppeteer');
const minimist = require('minimist');
const cache = require('./cache');

const argv = minimist(process.argv.slice(2));

const HOST = argv.host
    ? argv.host
    : '0.0.0.0';

const PORT = argv.port
    ? argv.port
    : 8080;

const CACHE_DIR = argv['cache-dir']
    ? argv['cache-dir']
    : '/var/cache/screenshoter';

const CHROMIUM_EXECUTABLE_PATH = argv['chromium-executable-path']
    ? argv['chromium-executable-path']
    : null;

const app = express();
const store = new cache.Cache(CACHE_DIR);

app.get('/screenshot', async (req, res) => {

    console.debug('Request Query Args:', req.query);

    let url = req.query.url;

    let format = ['png', 'jpeg'].indexOf(req.query.format) > -1
        ? req.query.format
        : 'png';

    let quality = Math.abs(parseInt(req.query.quality)%100)
        ? Math.abs(parseInt(req.query.quality)%100)
        : undefined;

    let fullPage = !!parseInt(req.query.full_page);

    let viewportWidth = parseInt(req.query.viewport_width)
        ? parseInt(req.query.viewport_width)
        : 800;

    let viewportHeight = parseInt(req.query.viewport_height)
        ? parseInt(req.query.viewport_height)
        : 600;

    let deviceScaleFactor = parseInt(req.query.device_scale_factor)
        ? parseInt(req.query.device_scale_factor)
        : 1;

    let delay = req.query.delay;

    let waitUntilEvent = req.query.wait_until_event;

    let element = req.query.element;

    let isMobile = !!parseInt(req.query.is_mobile);

    let hasTouch = !!parseInt(req.query.has_touch);

    let cacheable = parseInt(req.query.cacheable) > 0
        ? parseInt(req.query.cacheable)
        : false;

    let cacheKey = `|${url}|${format}|${quality}|${fullPage}|${viewportWidth}|${viewportHeight}|${deviceScaleFactor}|${delay}|${waitUntilEvent}|${element}|${isMobile}|${hasTouch}|`;

    if (!url) {
        res.status(400).end('Missed url param');
        return;
    }

    /*let cacheKey = cache
        ? JSON.stringify(req.query)
        : null;*/

    let image = cacheable
        ? store.get(cacheKey, cacheable)
        : null;

    if (image) {
        res.writeHead(200, {'Content-Type': 'image/' + format });
        res.end(image, 'binary');
        return;
    }

    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        executablePath: CHROMIUM_EXECUTABLE_PATH,
        headless: true,
    });

    const page = await browser.newPage();

    page.setViewport({
        width: viewportWidth,
        height: viewportHeight,
        isMobile: isMobile,
        hasTouch: hasTouch,
        deviceScaleFactor: deviceScaleFactor,
    });

    let options = {};

    if (waitUntilEvent) {
        options.waitUntil = waitUntilEvent;
    }

    await page.goto(url, options);

    if (delay) {
        await (async (timeout) => {
            return new Promise(resolve => {
                setTimeout(resolve, timeout)
            })
        })(delay);
    }

    var clip = undefined;

    if (element) {
        try {
            var rect = await page.evaluate((selector) => {
                var rect = document.querySelector(selector).getBoundingClientRect();
                return {
                    left: rect.left,
                    top: rect.top,
                    right: rect.right,
                    bottom: rect.bottom,
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height,
                };
            }, element);
        } catch (e) {
            console.log(e);
            res.status(400).end('Element has not been found');
            return;
        }

        clip = {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
        }
    }

    console.debug('Taking screenshot', {
        'url': url,
        'element': element,
        'subarea': clip,
        'format': format,
    });

    image = await page.screenshot({
        type: format,
        quality: quality,
        fullPage: fullPage,
        clip: clip,
    })

    browser.close();

    if (cacheable) {
        store.set(cacheKey, image);
    }

    res.writeHead(200, {'Content-Type': 'image/' + format });
    res.end(image, 'binary');

});

var server = app.listen(PORT, HOST, () => console.log(`Running on http://${HOST}:${PORT}`));

server.on('close', function() {
    console.log("\nGood buy!");
});

process.on('SIGINT', function() {
    server.close();
});

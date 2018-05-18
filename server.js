
const express = require('express');
const process = require('process');
const puppeteer = require('puppeteer');
const minimist = require('minimist');
const cache = require('./cache');
const sharp = require('sharp');

// The smaller stack size of musl libc means libvips may need to be used without a cache via
sharp.cache(false) // to avoid a stack overflow

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

    let viewportWidth = parseInt(req.query['viewport-width']) > 0
        ? parseInt(req.query['viewport-width'])
        : 800;

    let viewportHeight = parseInt(req.query['viewport-height']) > 0
        ? parseInt(req.query['viewport-height'])
        : 600;

    let deviceScaleFactor = parseInt(req.query['device-scale-factor'])
        ? parseInt(req.query['device-scale-factor'])
        : 1;

    let fullPage = !!parseInt(req.query.full);

    let maxHeight = parseInt(req.query['max-height']) > 0
        ? parseInt(req.query['max-height'])
        : null;

    let transparency = !!parseInt(req.query.transparency);

    let delay = req.query.delay;

    let waitUntilEvent = req.query['wait-until-event'];

    let element = req.query.element;

    let isMobile = !!parseInt(req.query['is_mobile']);

    let hasTouch = !!parseInt(req.query['has-touch']);

    let ttl = parseInt(req.query.ttl) > 0
        ? parseInt(req.query.ttl)
        : false;

    let cacheKey = `|${url}|${format}|${quality}|${viewportWidth}|${viewportHeight}|${deviceScaleFactor}|${fullPage}|${maxHeight}|${transparency}|${delay}|${waitUntilEvent}|${element}|${isMobile}|${hasTouch}|`;

    if (!url) {
        res.status(400).end('Missed url param');
        return;
    }

    if (element && fullPage) {
        res.status(400).end('Args "element" and "full" are exclusive');
        return;
    }

    /*let cacheKey = cache
        ? JSON.stringify(req.query)
        : null;*/

    let image = ttl
        ? store.get(cacheKey, ttl)
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

    try {
        page.setViewport({
            width: viewportWidth,
            height: viewportHeight,
            isMobile: isMobile,
            hasTouch: hasTouch,
            deviceScaleFactor: deviceScaleFactor,
        });
    } catch (e) {
        console.error(err);
        res.status(400).end('Error while setting viewport: ' + err.message);
        return;
    }

    let options = {};

    if (waitUntilEvent) {
        options.waitUntil = waitUntilEvent;
    }
    try {
        await page.goto(url, options);
    } catch (err) {
        console.error(err);
        res.status(400).end('Error while requesting resource: ' + err.message);
        return;
    }

    if (delay) {
        await (async (timeout) => {
            return new Promise(resolve => {
                setTimeout(resolve, timeout);
            });
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
        } catch (err) {
            console.error(err);
            res.status(400).end('Element has not been found: ' + err.message);
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

    try {
        image = await page.screenshot({
            type: format,
            quality: quality,
            fullPage: fullPage,
            clip: clip,
        });
    } catch (err) {
        console.error(err);
        res.status(400).end('Error while taking a screenshot: ' + err.message);
        return;
    }

    if (maxHeight) {
        let imgObj = sharp(image);
        let metadata = await imgObj.metadata();
        if (metadata.height > maxHeight) {
            try {
                image = await imgObj.resize(metadata.width, maxHeight).crop(sharp.gravity.northeast).toBuffer();
            } catch (err) {
                console.error(err);
                res.status(400).end('Error while cropping image: ' + err.message);
                return;
            }
        }
    }

    browser.close();

    if (ttl) {
        await store.set(cacheKey, image);
    }

    res.writeHead(200, {'Content-Type': 'image/' + format });
    res.end(image, 'binary');

});

var server = app.listen(PORT, HOST, () => console.log(`Running on http://${HOST}:${PORT}`));

server.on('close', function() {
    console.log("\nBye!");
});

process.on('SIGINT', function() {
    server.close();
});


const express = require('express');
const process = require('process');
const puppeteer = require('puppeteer');
const minimist = require('minimist');
const sharp = require('sharp');
const devices = require('puppeteer/DeviceDescriptors');
const cache = require('./cache');

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

let handler = async (req, res) => {

    console.debug('Request Query Args:', req.query);

    let url = req.query.url;

    let format = ['png', 'jpeg'].indexOf(req.query.format) > -1
        ? req.query.format
        : 'png';

    let quality = Math.abs(parseInt(req.query.quality)%100)
        ? Math.abs(parseInt(req.query.quality)%100)
        : null;

    let device = req.query.device && typeof req.query.device === "string"
        ? req.query.device
        : null;

    let viewportWidth = parseInt(req.query['viewport-width']) > 0
        ? parseInt(req.query['viewport-width'])
        : null;

    let viewportHeight = parseInt(req.query['viewport-height']) > 0
        ? parseInt(req.query['viewport-height'])
        : null;

    let deviceScaleFactor = parseInt(req.query['device-scale-factor'])
        ? parseInt(req.query['device-scale-factor'])
        : null;

    let isMobile = typeof req.query['is-mobile'] === "string"
        ? !!parseInt(req.query['is-mobile'])
        : null;

    let hasTouch = typeof req.query['has-touch'] === "string"
        ? !!parseInt(req.query['has-touch'])
        : null;

    let isLandscape = typeof req.query['is-landscape'] === "string"
        ? !!parseInt(req.query['is-landscape'])
        : null;

    let userAgent = typeof req.query['user-agent'] === "string"
        ? req.query['user-agent']
        : null;

    let fullPage = !!parseInt(req.query.full);

    let width = parseInt(req.query['width']) > 0
        ? parseInt(req.query['width'])
        : null;

    let maxHeight = parseInt(req.query['max-height']) > 0
        ? parseInt(req.query['max-height'])
        : null;

    let transparency = !!parseInt(req.query.transparency);

    let delay = req.query.delay;

    let waitUntilEvent = req.query['wait-until-event'];

    let element = req.query.element;

    let ttl = parseInt(req.query.ttl) > 0
        ? parseInt(req.query.ttl)
        : false;

    if (!url) {
        res.status(400).end('Missed url param');
        return;
    }

    if (device && !devices[device]) {
        let supported = Object.getOwnPropertyNames(devices).filter(device => {
            return device !== 'length' && device !== '0' && isNaN(parseInt(device));
        });
        console.log(supported);
        res.status(400).end('Unsupported device, supported: ' + supported.join(', '));
    }

    /*if (device &&(viewportWidth || viewportHeight || deviceScaleFactor || typeof isMobile === "boolean" || typeof hasTouch === "boolean" || typeof isLandscape === "boolean")) {
        res.status(400).end('Args "device" and at least one of ' +
            '"viewport-width", "viewport-height", "device-scale-factor", "is-mobile", "has-touch", "is-landscape" ' +
            'are exclusive');
        return;
    }*/

    if (element && fullPage) {
        res.status(400).end('Args "element" and "full" are exclusive');
        return;
    }

    let cacheKey = "|" + [
        url,
        format,
        quality,
        device,
        viewportWidth,
        viewportHeight,
        deviceScaleFactor,
        isMobile,
        hasTouch,
        isLandscape,
        userAgent,
        fullPage,
        maxHeight,
        transparency,
        delay,
        waitUntilEvent,
        element,
    ].join("|") + "|";

    let image = ttl
        ? store.get(cacheKey, ttl)
        : null;

    if (image) {
        res.writeHead(200, {'Content-Type': 'image/' + format });
        res.end(image, 'binary');
        return;
    }

    try {
        var browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            executablePath: CHROMIUM_EXECUTABLE_PATH,
            headless: true,
        });
    } catch (e) {
        console.error(e);
        res.status(400).end('Error while launching puppeteer: ' + e.message);
        return;
    }

    try {
        var page = await browser.newPage();
    } catch (e) {
        console.error(e);
        res.status(400).end('Error while creating a new page: ' + e.message);
        return;
    }

    if (device) {
        try {
            await page.emulate(devices[device]);
        } catch (e) {
            console.error(e);
            res.status(400).end('Error while emulating device: ' + e.message);
            return;
        }
    }

    if (viewportWidth || viewportHeight) {
        try {
            let viewport = {
                width: viewportWidth
                    ? viewportWidth
                    : 600,
                height: viewportHeight
                    ? viewportHeight
                    : 600,
                deviceScaleFactor: deviceScaleFactor
                    ? deviceScaleFactor
                    : 1,
                isMobile: isMobile
                    ? isMobile
                    : false,
                hasTouch: hasTouch
                    ? hasTouch
                    : false,
                isLandscape: isLandscape
                    ? isMobile
                    : false,
            };
            console.debug('Setting viewport', viewport);
            await page.setViewport(viewport);
        } catch (e) {
            console.error(e);
            res.status(400).end('Error while setting viewport: ' + e.message);
            return;
        }
    }

    if (userAgent) {
        try {
            await page.setUserAgent(userAgent)
        } catch (e) {
            console.error(e);
            res.status(400).end('Error while setting User-Agent: ' + e.message);
            return;
        }
    }

    let options = {};

    if (waitUntilEvent) {
        options.waitUntil = waitUntilEvent;
    }

    try {
        await page.goto(url, options);
    } catch (e) {
        console.error(e);
        res.status(400).end('Error while requesting resource: ' + e.message);
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
            console.debug('Element has been found', rect);
        } catch (e) {
            console.error(e);
            res.status(400).end('Element has not been found: ' + e.message);
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
        url: url,
        element: element,
        full: fullPage,
        subarea: clip,
        format: format,
        transparency: transparency,
    });

    try {
        image = await page.screenshot({
            type: format,
            quality: quality ? quality : undefined,
            fullPage: fullPage,
            clip: clip,
            omitBackground: transparency
                ? true
                : undefined,
        });
    } catch (e) {
        console.error(e);
        res.status(400).end('Error while taking a screenshot: ' + e.message);
        return;
    }

    if (width || maxHeight) {

        let imgObj = sharp(image);
        let metadata = await imgObj.metadata();

        if (width && width !== metadata.width) {

            let newHeight = parseInt(metadata.height * width / metadata.width);

            if (maxHeight && newHeight > maxHeight) {
                image = await imgObj.resize(width, maxHeight).crop(sharp.gravity.northeast).toBuffer();
            } else {
                image = await imgObj.resize(width).toBuffer();
            }

        } else if (maxHeight && metadata.height > maxHeight) {

            image = await imgObj.resize(metadata.width, maxHeight).crop(sharp.gravity.northeast).toBuffer();

        }

    }

    /*if (maxHeight) {
        let imgObj = sharp(image);
        let metadata = await imgObj.metadata();
        if (metadata.height > maxHeight) {
            try {
                image = await imgObj.resize(metadata.width, maxHeight).crop(sharp.gravity.northeast).toBuffer();
            } catch (e) {
                console.error(e);
                res.status(400).end('Error while cropping image: ' + e.message);
                return;
            }
        }
    }*/

    browser.close();

    if (ttl) {
        await store.set(cacheKey, image);
    }

    res.writeHead(200, {'Content-Type': 'image/' + format });
    res.end(image, 'binary');

};

app.get('/screenshot', (req, res) => {
    try {
        handler(req, res);
    } catch (e) {
        console.error(e);
        res.status(400).end('Error while processing a request: ' + e.message);
        return;
    }
});

var server = app.listen(PORT, HOST, () => console.log(`Running on http://${HOST}:${PORT}`));

server.on('close', function() {
    console.log("\nBye!");
});

process.on('SIGINT', function() {
    server.close();
});

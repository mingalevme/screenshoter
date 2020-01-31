const process = require('process');
const sharp = require('sharp');
const cache = require('./cache');
const devices = require('puppeteer/DeviceDescriptors');

const FORMAT_JPEG = 'jpeg';
const FORMAT_PNG = 'png';

const MAX_JPEG_DIMENSION_SIZE = 16384;

// The smaller stack size of musl libc means libvips may need to be used without a cache via
sharp.cache(false) // to avoid a stack overflow

module.exports = async (browser, req, res) => {

    console.debug('Request Query Args:', req.query);

    try {
        var defaultUserAgent = (await browser.userAgent()).replace("HeadlessChrome", "Chrome");
    } catch (e) {
        console.error(e);
        res.status(400).end('Error while fetching a default user agent: ' + e.message);
        return;
    }

    console.debug('Default user agent: ', defaultUserAgent);

    let url = req.query.url;

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

    let cookies = typeof req.query['cookies'] === "string"
        ? req.query['cookies']
        : null;

    let waitUntilEvent = req.query['wait-until-event'];

    let timeout = parseInt(req.query.timeout) >= 0
        ? parseInt(req.query.timeout)
        : null;

    let failOnTimeout = typeof req.query['fail-on-timeout'] === "string"
        ? !!parseInt(req.query['fail-on-timeout'])
        : null;

    let delay = req.query.delay;

    let format = [FORMAT_PNG, FORMAT_JPEG].indexOf(req.query.format) > -1
        ? req.query.format
        : FORMAT_PNG;

    let quality = Math.abs(parseInt(req.query.quality)%100)
        ? Math.abs(parseInt(req.query.quality)%100)
        : null;

    let fullPage = !!parseInt(req.query.full);

    let element = req.query.element;

    let transparency = !!parseInt(req.query.transparency);

    let width = parseInt(req.query['width']) > 0
        ? parseInt(req.query['width'])
        : null;

    let maxHeight = parseInt(req.query['max-height']) > 0
        ? parseInt(req.query['max-height'])
        : null;

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
        res.status(400).end('Unsupported device, supported: ' + supported.join(', '));
        return;
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

    let cacheKey = (() => {
        let entries = Object.entries(req.query).map(entry => entry[0] + '=' + entry[1]);
        entries.sort();
        return '|' + entries.join('|') + '|';
    })();

    const cacheDir = process.env.CACHE_DIR
        ? process.env.CACHE_DIR
        : '/var/cache/screenshoter';

    const store = new cache.Cache(cacheDir);

    let image = ttl
        ? store.get(cacheKey, ttl)
        : null;

    if (image) {
        res.writeHead(200, {'Content-Type': 'image/' + format });
        res.end(image, 'binary');
        return;
    }

    try {
        var page = await browser.newPage();
    } catch (e) {
        console.error(e);
        res.status(400).end('Error while creating a new page: ' + e.message);
        return;
    }

    page.on('error', (e) => {
        console.error(e);
        res.status(400).end('Page crashed!');
        page.close();
    });

    let viewport = {};

    if (device) {
        viewport = JSON.parse(JSON.stringify(devices[device].viewport));
        if (!userAgent) {
            userAgent = devices[device].userAgent;
        }
    }

    if (viewportWidth !== null) {
        viewport.width = viewportWidth;
    } else if (!viewport.width) {
        viewport.width = 800;
    }

    if (viewportHeight !== null) {
        viewport.height = viewportHeight;
    } else if (!viewport.height) {
        viewport.height = 600;
    }

    if (deviceScaleFactor !== null) {
        viewport.deviceScaleFactor = deviceScaleFactor;
    } else if (!viewport.deviceScaleFactor) {
        viewport.deviceScaleFactor = 1;
    }

    if (isMobile !== null) {
        viewport.isMobile = isMobile;
    } else if (!viewport.isMobile) {
        viewport.isMobile = false;
    }

    if (hasTouch !== null) {
        viewport.hasTouch = hasTouch;
    } else if (!viewport.hasTouch) {
        viewport.hasTouch = false;
    }

    if (isLandscape !== null) {
        viewport.isLandscape = isLandscape;
    } else if (!viewport.isLandscape) {
        viewport.isLandscape = false;
    }

    console.debug('Setting viewport', viewport);

    try {
        await page.setViewport(viewport);
    } catch (e) {
        console.error(e);
        res.status(400).end('Error while setting viewport: ' + e.message);
        await page.close();
        return;
    }

    userAgent = userAgent || defaultUserAgent;

    console.debug('Setting user agent: ', userAgent);

    try {
        await page.setUserAgent(userAgent)
    } catch (e) {
        console.error(e);
        res.status(400).end('Error while setting user agent: ' + e.message);
        await page.close();
        return;
    }

    if (cookies) {
        try {
            cookies = JSON.parse(cookies);
        } catch (e) {
            console.error(e);
            res.status(400).end('Error while parsing cookies: ' + e.message);
            await page.close();
            return;
        }
        console.debug('Setting cookies: ', cookies);
        try {
            await page.setCookie(...cookies);
        } catch (e) {
            console.error(e);
            res.status(400).end('Error while setting cookies: ' + e.message);
            await page.close();
            return;
        }
    }

    let options = {};

    if (timeout !== null) {
        options.timeout = timeout;
    }

    if (waitUntilEvent) {
        options.waitUntil = waitUntilEvent;
    }

    console.debug('Navigating to url: ', {
        url: url,
        options: options,
        viewport: viewport,
        userAgent: userAgent
            ? userAgent
            : '<default>',
    });

    try {
        await page.goto(url, options);
    } catch (e) {
        console.error(e);
        if (e.message.indexOf('Navigation Timeout Exceeded') !== -1) {
            if (failOnTimeout) {
                res.status(504).end('Error while requesting resource: ' + e.message);
                await page.close();
                return;
            }
        } else {
            res.status(400).end('Error while requesting resource: ' + e.message);
            await page.close();
            return;
        }
    }

    if (delay) {
        console.debug('Delaying ...', delay);
        await (async (timeout) => {
            return new Promise(resolve => {
                setTimeout(resolve, timeout);
            });
        })(delay);
    }

    let clip = undefined;

    if (element) {
        try {
            var rect = await page.evaluate((selector) => {
                const rect = document.querySelector(selector).getBoundingClientRect();
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
            await page.close();
            return;
        }

        if (rect.width === 0 || rect.height === 0) {
            console.error('Invalid element dimensions', rect);
            res.status(400).end('Invalid element dimensions: ' + JSON.stringify(rect));
            await page.close();
            return;
        }

        clip = {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
        }

        if (format === FORMAT_JPEG && (clip.height * viewport.deviceScaleFactor > MAX_JPEG_DIMENSION_SIZE || clip.width * viewport.deviceScaleFactor > MAX_JPEG_DIMENSION_SIZE)) {
            format = FORMAT_PNG;
            console.info('Width and/or height are greater than jpeg-image dimension limit, format has been changed to ' + FORMAT_PNG);
        }
    }

    if (format === FORMAT_JPEG && (fullPage || !clip)) { // Check if width/height if greater than MAX_JPEG_DIMENSION_SIZE
        console.debug('Determining size of page ...');
        const bodyBoundingClientRect = await page.evaluate((selector) => {
            const rect = document.querySelector(selector).getBoundingClientRect();
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
        }, 'body');
        if (bodyBoundingClientRect.width === 0 || bodyBoundingClientRect.height === 0) {
            console.error('Invalid body dimensions while checking page size', bodyBoundingClientRect);
        } else {
            console.debug('Size of page', {
                width: bodyBoundingClientRect.width * viewport.deviceScaleFactor,
                height: bodyBoundingClientRect.height * viewport.deviceScaleFactor,
            });
            if (format === FORMAT_JPEG && (bodyBoundingClientRect.height * viewport.deviceScaleFactor > MAX_JPEG_DIMENSION_SIZE || bodyBoundingClientRect.width * viewport.deviceScaleFactor > MAX_JPEG_DIMENSION_SIZE)) {
                format = FORMAT_PNG;
                console.info('Width and/or height are greater than jpeg-image dimension limit, format has been changed to ' + FORMAT_PNG);
            }
            // if (bodyBoundingClientRect.height * viewport.deviceScaleFactor > MAX_JPEG_DIMENSION_SIZE || bodyBoundingClientRect.width * viewport.deviceScaleFactor > MAX_JPEG_DIMENSION_SIZE) {
            //     console.info('Width and/or height are greater than jpeg-image dimension limit, screenshot will be cropped to', clip);
            //     clip = {
            //         x: bodyBoundingClientRect.x,
            //         y: bodyBoundingClientRect.y,
            //         width: bodyBoundingClientRect.width * viewport.deviceScaleFactor > MAX_JPEG_DIMENSION_SIZE
            //             ? Math.floor(MAX_JPEG_DIMENSION_SIZE/viewport.deviceScaleFactor)
            //             : bodyBoundingClientRect.width,
            //         height: bodyBoundingClientRect.height * viewport.deviceScaleFactor > MAX_JPEG_DIMENSION_SIZE
            //             ? Math.floor(MAX_JPEG_DIMENSION_SIZE/viewport.deviceScaleFactor)
            //             : bodyBoundingClientRect.height,
            //     }
            //     console.debug('Width and/or height are greater than MAX_JPEG_DIMENSION_SIZE, screenshot will be cropped to', clip);
            //     fullPage = false;
            // }
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
            quality: quality
                ? quality
                : undefined,
            fullPage: fullPage,
            clip: clip,
            omitBackground: transparency
                ? true
                : undefined,
        });
    } catch (e) {
        console.error(e);
        res.status(400).end('Error while taking a screenshot: ' + e.message);
        await page.close();
        return;
    }

    if (image.byteLength === 0) {
        const e = new Error('Page is too big?');
        console.error('Error while taking screenshot: ' + e.message);
        res.status(400).end('Error while taking a screenshot: ' + e.message);
        await page.close();
        return;
    }

    if (width || maxHeight) {

        try {
            var imgObj = sharp(image);
        } catch (e) {
            console.error(e);
            res.status(400).end('Error while creating sharp-object: ' + e.message);
            await page.close();
            return;
        }

        try {
            var metadata = await imgObj.metadata();
        } catch (e) {
            console.error(e);
            res.status(400).end('Error while fetching metadata from sharp-object: ' + e.message);
            await page.close();
            return;
        }

        try {
            if (width && width !== metadata.width) {

                let newHeight = parseInt(metadata.height * width / metadata.width);

                if (maxHeight && newHeight > maxHeight) {
                    //image = await imgObj.resize(width, maxHeight).crop(sharp.gravity.northeast).toBuffer();
                    image = await imgObj.resize(width, maxHeight, {
                        position: sharp.gravity.northeast,
                    }).toBuffer();
                } else {
                    image = await imgObj.resize(width).toBuffer();
                }

            } else if (maxHeight && metadata.height > maxHeight) {

                //image = await imgObj.resize(metadata.width, maxHeight).crop(sharp.gravity.northeast).toBuffer();
                image = await imgObj.resize(metadata.width, maxHeight, {
                    position: sharp.gravity.northeast,
                }).toBuffer();

            }
        } catch (e) {
            console.error(e);
            res.status(400).end('Error while resizing sharp-object: ' + e.message);
            await page.close();
            return;
        }

    }

    res.writeHead(200, {
        'Content-Type': 'image/' + format,
        'Cache-Control': 'max-age=' + (ttl
            ? ttl
            : 0),
        'X-Puppeteer-Version': await browser.version(),
    });

    res.end(image, 'binary');

    await page.close();

    if (ttl) {
        store.set(cacheKey, image);
    }

};

const puppeteer = require('puppeteer-core');
const sharp = require('sharp');
const scroller = require('puppeteer-autoscroll-down');
const {Logger, NullLogger} = require("./logging");

const devices = puppeteer.KnownDevices;

const FORMAT_JPEG = 'jpeg';
const FORMAT_PNG = 'png';

const MAX_JPEG_DIMENSION_SIZE = 16384;

// The smaller stack size of musl libc means libvips may need to be used without a cache via
sharp.cache(false) // to avoid a stack overflow

/** @type {string|null} */
let browserVersion = null;

/** @type {string|null} */
let defaultUserAgent = null;

/**
 *
 * @param browser
 * @param req
 * @param res
 * @param {(Cache|null)} cache
 * @return {Promise<void>}
 */
module.exports = async (browser, req, res, cache) => {

    /** @type {Logger} */
    const logger = req.logger || new NullLogger();

    if (!browserVersion) {
        try {
            browserVersion = await browser.version();
        } catch (e) {
            logger.error(e);
            res.status(500).end('Error while fetching browser version: ' + e.message);
            return;
        }
        logger.debug('Browser version:', browserVersion);
    }

    if (!defaultUserAgent) {
        try {
            defaultUserAgent = (await browser.userAgent()).replace("HeadlessChrome", "Chrome");
        } catch (e) {
            logger.error(e);
            res.status(500).end('Error while fetching a default user agent: ' + e.message);
            return;
        }
        logger.debug('Default user agent:', defaultUserAgent);
    }

    logger.debug('Request Query Args:', req.query);

    /**
     * https://pptr.dev/api/puppeteer.page.emulatetimezone
     * https://github.com/unicode-org/icu/blob/main/icu4c/source/data/misc/metaZones.txt
     */
    const timezone = req.query.timezone;

    const url = req.query.url;

    const device = req.query.device && typeof req.query.device === "string"
        ? req.query.device
        : null;

    const viewportWidth = parseInt(req.query['viewport-width']) > 0
        ? parseInt(req.query['viewport-width'])
        : null;

    const viewportHeight = parseInt(req.query['viewport-height']) > 0
        ? parseInt(req.query['viewport-height'])
        : null;

    const deviceScaleFactor = parseInt(req.query['device-scale-factor'])
        ? parseInt(req.query['device-scale-factor'])
        : null;

    const isMobile = typeof req.query['is-mobile'] === "string"
        ? !!parseInt(req.query['is-mobile'])
        : null;

    const hasTouch = typeof req.query['has-touch'] === "string"
        ? !!parseInt(req.query['has-touch'])
        : null;

    const isLandscape = typeof req.query['is-landscape'] === "string"
        ? !!parseInt(req.query['is-landscape'])
        : null;

    let userAgent = typeof req.query['user-agent'] === "string"
        ? req.query['user-agent']
        : null;

    let cookies = typeof req.query['cookies'] === "string"
        ? req.query['cookies']
        : null;

    let navigationTimeoutMs = typeof req.query['navigation-timeout-ms'] === "string" && req.query['navigation-timeout-ms'] && parseInt(req.query['navigation-timeout-ms']) >= 0
        ? parseInt(req.query['navigation-timeout-ms'])
        : null;

    /** @type {string|null} */
    const proxy = typeof req.query['proxy'] === "string"
        ? req.query['proxy']
        : null;

    /** @type {string[]|null} */
    const proxyBypassList = typeof req.query['proxy-bypass-list'] === "string"
        ? req.query['proxy-bypass-list'].split(',')
        : null;

    /**
     * @deprecated Use navigationTimeoutMs instead
     * @type {number|null}
     */
    let timeout = parseInt(req.query.timeout) >= 0
        ? parseInt(req.query.timeout)
        : null;
    if (!navigationTimeoutMs && timeout) {
        navigationTimeoutMs = timeout;
    }
    let failOnTimeout = !!parseInt(req.query['fail-on-timeout'])

    let waitUntilEvent = req.query['wait-until-event'];

    let waitForSelector = req.query['wait-for-selector'];
    let waitForSelectorTimeoutMs = typeof req.query['wait-for-selector-timeout-ms'] === "string" && req.query['wait-for-selector-timeout-ms'] && parseInt(req.query['wait-for-selector-timeout-ms']) >= 0
        ? parseInt(req.query['wait-for-selector-timeout-ms'])
        : null;
    let failOnWaitForSelectorTimeout = !!parseInt(req.query['fail-on-wait-for-selector-timeout']);

    let waitForXPath = req.query['wait-for-xpath'];
    let waitForXPathTimeoutMs = typeof req.query['wait-for-xpath-timeout-ms'] === "string" && req.query['wait-for-xpath-timeout-ms'] && parseInt(req.query['wait-for-xpath-timeout-ms']) >= 0
        ? parseInt(req.query['wait-for-xpath-timeout-ms'])
        : null;
    let failOnWaitForXPathTimeout = !!parseInt(req.query['fail-on-wait-for-xpath-timeout']);

    let waitForFunction = req.query['wait-for-function'];
    let waitForFunctionTimeoutMs = typeof req.query['wait-for-function-timeout-ms'] === "string" && req.query['wait-for-function-timeout-ms'] && parseInt(req.query['wait-for-function-timeout-ms']) >= 0
        ? parseInt(req.query['wait-for-function-timeout-ms'])
        : null;
    /** @type {'raf'|'mutation'|number|null} */
    let waitForFunctionPolling = typeof req.query['wait-for-function-polling'] === "string" && req.query['wait-for-function-polling']
        ? (
            ['raf', 'mutation'].indexOf(req.query['wait-for-function-polling']) > -1
                ? req.query['wait-for-function-polling']
                : (
                    req.query['wait-for-function-polling'].match(/[\d+]/)
                        ? parseInt(req.query['wait-for-function-polling'])
                        : null
                )
        )
        : null;
    let failOnWaitForFunctionTimeout = !!parseInt(req.query['fail-on-wait-for-function-timeout']);

    let delayMs = parseInt(req.query['delay-ms']) > 0
        ? parseInt(req.query['delay-ms'])
        : null;

    /**
     * @deprecated Use delaysMs
     * @type {number|null}
     */
    let delay = parseInt(req.query.delay) > 0
        ? parseInt(req.query.delay)
        : null;

    if (!delayMs && delay) {
        delayMs = delay;
    }

    let format = [FORMAT_PNG, FORMAT_JPEG].indexOf(req.query.format) > -1
        ? req.query.format
        : FORMAT_PNG;

    let quality = Math.abs(parseInt(req.query.quality) % 100)
        ? Math.abs(parseInt(req.query.quality) % 100)
        : null;

    let fullPage = !!parseInt(req.query.full);

    let element = req.query.element;

    let transparency = !!parseInt(req.query.transparency);

    let captureBeyondViewport = !!parseInt(req.query['capture-beyond-viewport']);

    let scrollPageToBottom = typeof req.query['scroll-page-to-bottom'] === "string"
        ? !!parseInt(req.query['scroll-page-to-bottom'])
        : null;

    let scrollPageToBottomSize = parseInt(req.query['scroll-page-to-bottom-size']) > 0
        ? parseInt(req.query['scroll-page-to-bottom-size'])
        : null;

    let scrollPageToBottomDelayMs = parseInt(req.query['scroll-page-to-bottom-delay-ms']) > 0
        ? parseInt(req.query['scroll-page-to-bottom-delay-ms'])
        : null;

    let scrollPageToBottomStepsLimit = parseInt(req.query['scroll-page-to-bottom-steps-limit']) > 0
        ? parseInt(req.query['scroll-page-to-bottom-steps-limit'])
        : null;

    let width = parseInt(req.query['width']) > 0
        ? parseInt(req.query['width'])
        : null;

    let maxHeight = parseInt(req.query['max-height']) > 0
        ? parseInt(req.query['max-height'])
        : null;

    /** @type {number|null} */
    let ttl = parseInt(req.query.ttl) > 0
        ? parseInt(req.query.ttl)
        : null;

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
        const query = JSON.parse(JSON.stringify(req.query));
        delete query.ttl;
        let entries = Object.entries(query).map(entry => entry[0] + '=' + entry[1]);
        entries.sort();
        return `|${entries.join('|')}|`;
    })();

    /** @type {(ReadableStream|Buffer|null)} */
    let image;

    if (cache) {
        logger.debug('Fetching the entry from the cache', {
            'key': cacheKey,
            'cache': cache.describe(),
        });
        try {
            image = await cache.get(cacheKey, ttl);
        } catch (err) {
            logger.error("Error while fetching a cache entry", err);
        }
    }

    if (image) {
        logger.debug('Cache contains the entry', {
            'key': cacheKey,
            'cache': cache.describe(),
        });
        res.writeHead(200, {
            'Content-Type': 'image/' + format,
            'Cache-Control': 'max-age=' + (ttl || 0),
            'Content-Disposition': 'inline; filename=screenshot.' + format,
            'X-Browser-Version': browserVersion,
            'X-Cache-Status': 'hit',
        });
        image.pipe(res);
        return;
    }

    if (cache) {
        logger.debug('Cache does not contain the entry', {
            'key': cacheKey,
            'cache': cache.describe(),
        });
    }

    const contextOptions = {};

    if (proxy) {
        contextOptions.proxyServer = proxy;
    }

    if (proxyBypassList) {
        contextOptions.proxyBypassList = proxyBypassList;
    }

    let context;

    try {
        context = await browser.createBrowserContext(contextOptions);
    } catch (e) {
        logger.error(e);
        res.status(400).end('Error while creating a new browser context: ' + e.message);
        return;
    }

    let page;

    try {
        // https://github.com/puppeteer/puppeteer/blob/main/docs/api.md#class-page
        page = await context.newPage();
    } catch (e) {
        logger.error(e);
        res.status(400).end('Error while creating a new page: ' + e.message);
        return;
    }

    page.on('error', (e) => {
        logger.error(e);
        res.status(400).end('Page crashed!');
        page.close();
        context.close();
    });

    if (timezone) {
        try {
            await page.emulateTimezone(timezone);
        } catch (e) {
            logger.error('Error while setting timezone: ' + e.message);
            res.status(400).end('Error while setting timezone: ' + e.message);
            await page.close();
            await context.close();
            return;
        }
    }

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

    logger.debug('Setting viewport', viewport);

    try {
        await page.setViewport(viewport);
    } catch (e) {
        logger.error(e);
        res.status(400).end('Error while setting viewport: ' + e.message);
        await page.close();
        await context.close();
        return;
    }

    userAgent = userAgent || defaultUserAgent || 'mingalevme/screenshoter';

    logger.debug('Setting user agent: ', userAgent);

    try {
        await page.setUserAgent(userAgent);
    } catch (e) {
        logger.error(e);
        res.status(400).end('Error while setting user agent: ' + e.message);
        await page.close();
        await context.close();
        return;
    }

    if (cookies) {
        try {
            cookies = JSON.parse(cookies);
        } catch (e) {
            logger.error(e);
            res.status(400).end('Error while parsing cookies: ' + e.message);
            await page.close();
            await context.close();
            return;
        }
        logger.debug('Setting cookies: ', cookies);
        try {
            await page.setCookie(...cookies);
        } catch (e) {
            logger.error(e);
            res.status(400).end('Error while setting cookies: ' + e.message);
            await page.close();
            await context.close();
            return;
        }
    }

    const navigateOptions = {};

    if (navigationTimeoutMs !== null) {
        navigateOptions.timeout = navigationTimeoutMs;
    }

    if (waitUntilEvent) {
        navigateOptions.waitUntil = waitUntilEvent;
    }

    logger.debug('Navigating to url: ', {
        url: url,
        contextOptions: contextOptions,
        navigateOptions: navigateOptions,
        viewport: viewport,
        userAgent: userAgent
            ? userAgent
            : '<default>',
    });

    try {
        await page.goto(url, navigateOptions);
    } catch (e) {
        if (e instanceof puppeteer.TimeoutError) {
            if (failOnTimeout) {
                logger.error('Error while navigating to url: ' + e.message);
                res.status(504).end(e.message);
                await page.close();
                await context.close();
                return;
            } else {
                logger.info('Non-Fatal error while navigating to url: ' + e.message, {
                    url: url,
                });
            }
        } else {
            logger.error(e);
            await page.close();
            await context.close();
            res.status(502).end('Error while navigating to url: ' + e.message);
            return;
        }
    }

    if (waitForSelector) {
        let waitForSelectorOptions = {};
        if (waitForSelectorTimeoutMs !== null) {
            waitForSelectorOptions.timeout = waitForSelectorTimeoutMs;
        }
        logger.debug('Waiting for selector: ', {
            selector: waitForSelector,
            options: waitForSelectorOptions,
        });
        try {
            await page.waitForSelector(waitForSelector, waitForSelectorOptions);
            logger.debug('Selector has been found: ', {
                selector: waitForSelector,
                options: waitForSelectorOptions,
            });
        } catch (e) {
            if (!(e instanceof puppeteer.TimeoutError) || failOnWaitForSelectorTimeout) {
                logger.error('Error while waiting for selector: ' + e.message, {
                    selector: waitForSelector,
                    options: waitForSelectorOptions,
                });
                res.status(504).end(e.message);
                await page.close();
                await context.close();
                return;
            } else {
                logger.info('Non-Fatal error while waiting for selector: ' + e.message, {
                    selector: waitForSelector,
                    options: waitForSelectorOptions,
                });
            }
        }
    }

    if (waitForXPath) {
        let waitForXPathOptions = {};
        if (waitForXPathTimeoutMs !== null) {
            waitForXPathOptions.timeout = waitForXPathTimeoutMs;
        }
        logger.debug('Waiting for xpath: ', {
            xpath: waitForXPath,
            options: waitForXPathOptions,
        });
        try {
            await page.waitForXPath(waitForXPath, waitForXPathOptions);
            logger.debug('XPath has been found: ', {
                xpath: waitForXPath,
                options: waitForXPathOptions,
            });
        } catch (e) {
            if (!(e instanceof puppeteer.TimeoutError) || failOnWaitForXPathTimeout) {
                logger.error('Error while waiting for xpath: ' + e.message, {
                    xpath: waitForXPath,
                    options: waitForXPathOptions,
                });
                res.status(504).end(e.message);
                await page.close();
                await context.close();
                return;
            } else {
                logger.info('Non-Fatal error while waiting for xpath: ' + e.message, {
                    xpath: waitForSelector,
                    options: waitForXPathOptions,
                });
            }
        }
    }

    if (waitForFunction) {
        let waitForFunctionOptions = {};
        if (waitForFunctionTimeoutMs !== null) {
            waitForFunctionOptions.timeout = waitForFunctionTimeoutMs;
        }
        if (waitForFunctionPolling !== null) {
            waitForFunctionOptions.polling = waitForFunctionPolling;
        }
        logger.debug('Waiting for function', {
            function: waitForFunction,
            options: waitForFunctionOptions,
        });
        try {
            await page.waitForFunction(waitForFunction, waitForFunctionOptions);
            logger.debug('Waited for function', {
                function: waitForFunction,
                options: waitForFunctionOptions,
            });
        } catch (e) {
            if (!(e instanceof puppeteer.TimeoutError) || failOnWaitForFunctionTimeout) {
                logger.error('Error while waiting for function: ' + e.message, {
                    function: waitForFunction,
                    options: waitForFunctionOptions,
                });
                res.status(504).end(e.message);
                await page.close();
                await context.close();
                return;
            } else {
                logger.info('Non-Fatal error while waiting for function: ' + e.message, {
                    function: waitForFunction,
                    options: waitForFunctionOptions,
                });
            }
        }
    }

    if (delayMs) {
        logger.debug('Delaying (ms) ...', delayMs);
        await (async (timeoutMs) => {
            return new Promise(resolve => {
                setTimeout(resolve, timeoutMs);
            });
        })(delayMs);
    }

    if (scrollPageToBottom) {
        let scrollingToBottomOptions = {}
        if (scrollPageToBottomSize) {
            scrollingToBottomOptions.size = scrollPageToBottomSize
        }
        if (scrollPageToBottomDelayMs) {
            scrollingToBottomOptions.delay = scrollPageToBottomDelayMs
        }
        if (scrollPageToBottomStepsLimit) {
            scrollingToBottomOptions.stepsLimit = scrollPageToBottomStepsLimit
        }
        logger.debug('Scrolling the page to the bottom ...', scrollingToBottomOptions);
        try {
            await scroller.scrollPageToBottom(page, scrollingToBottomOptions)
        } catch (e) {
            logger.error('Error while scrolling page to the bottom: ' + e.message, {
                options: scrollingToBottomOptions,
            });
            res.status(400).end('Error while scrolling page to the bottom: ' + e.message);
            await page.close();
            await context.close();
            return;
        }
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
            logger.debug('Element has been found', rect);
        } catch (e) {
            logger.error(e);
            res.status(400).end('Element has not been found: ' + e.message);
            await page.close();
            await context.close();
            return;
        }

        if (rect.width === 0 || rect.height === 0) {
            logger.error('Invalid element dimensions', rect);
            res.status(400).end('Invalid element dimensions: ' + JSON.stringify(rect));
            await page.close();
            await context.close();
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
            logger.info('Width and/or height are greater than jpeg-image dimension limit, format has been changed to ' + FORMAT_PNG);
        }
    }

    if (format === FORMAT_JPEG && (fullPage || !clip)) { // Check if width/height if greater than MAX_JPEG_DIMENSION_SIZE
        logger.debug('Determining size of page ...');
        let bodyBoundingClientRect;
        try {
            bodyBoundingClientRect = await page.evaluate((selector) => {
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
        } catch (e) {
            logger.error(e);
            res.status(400).end('Error while determining size of the page: ' + e.message);
            await page.close();
            await context.close();
            return;
        }

        if (bodyBoundingClientRect) {
            if (bodyBoundingClientRect.width === 0 || bodyBoundingClientRect.height === 0) {
                logger.error('Invalid body dimensions while checking page size', bodyBoundingClientRect);
            } else {
                logger.debug('Size of page', {
                    width: bodyBoundingClientRect.width * viewport.deviceScaleFactor,
                    height: bodyBoundingClientRect.height * viewport.deviceScaleFactor,
                });
                if (format === FORMAT_JPEG && (bodyBoundingClientRect.height * viewport.deviceScaleFactor > MAX_JPEG_DIMENSION_SIZE || bodyBoundingClientRect.width * viewport.deviceScaleFactor > MAX_JPEG_DIMENSION_SIZE)) {
                    format = FORMAT_PNG;
                    logger.info('Width and/or height are greater than jpeg-image dimension limit, format has been changed to ' + FORMAT_PNG);
                }
                // if (bodyBoundingClientRect.height * viewport.deviceScaleFactor > MAX_JPEG_DIMENSION_SIZE || bodyBoundingClientRect.width * viewport.deviceScaleFactor > MAX_JPEG_DIMENSION_SIZE) {
                //     logger.info('Width and/or height are greater than jpeg-image dimension limit, screenshot will be cropped to', clip);
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
                //     logger.debug('Width and/or height are greater than MAX_JPEG_DIMENSION_SIZE, screenshot will be cropped to', clip);
                //     fullPage = false;
                // }
            }
        }
    }

    logger.debug('Taking screenshot', {
        url: url,
        element: element,
        full: fullPage,
        subarea: clip,
        format: format,
        transparency: transparency,
        captureBeyondViewport: captureBeyondViewport,
    });

    try {
        /** @type {Buffer} */
        image = await page.screenshot({
            type: format,
            quality: quality
                ? quality
                : undefined,
            fullPage: fullPage,
            captureBeyondViewport: captureBeyondViewport,
            clip: clip,
            omitBackground: transparency
                ? true
                : undefined,
        });
        logger.debug('Screenshot has been taken', {
            url: url,
            element: element,
            full: fullPage,
            subarea: clip,
            format: format,
            transparency: transparency,
            captureBeyondViewport: captureBeyondViewport,
        });
    } catch (e) {
        logger.error(e);
        res.status(400).end('Error while taking a screenshot: ' + e.message);
        await page.close();
        await context.close();
        return;
    }

    if (image.byteLength === 0) {
        const e = new Error('Page is too big?');
        logger.error('Error while taking screenshot: ' + e.message);
        res.status(400).end('Error while taking a screenshot: ' + e.message);
        await page.close();
        await context.close();
        return;
    }

    if (width || maxHeight) {

        try {
            var imgObj = sharp(image);
        } catch (e) {
            logger.error(e);
            res.status(400).end('Error while creating sharp-object: ' + e.message);
            await page.close();
            await context.close();
            return;
        }

        try {
            var metadata = await imgObj.metadata();
        } catch (e) {
            logger.error(e);
            res.status(400).end('Error while fetching metadata from sharp-object: ' + e.message);
            await page.close();
            await context.close();
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
            logger.error(e);
            res.status(400).end('Error while resizing sharp-object: ' + e.message);
            await page.close();
            await context.close();
            return;
        }

    }

    res.writeHead(200, {
        'Content-Type': 'image/' + format,
        'Cache-Control': 'max-age=' + (ttl || 0),
        'Content-Disposition': 'inline; filename=screenshot.' + format,
        'X-Browser-Version': browserVersion,
        'X-Cache-Status': 'miss',
    });

    res.end(image, 'binary');

    if (cache) {
        logger.debug('Setting cache entry', {
            'key': cacheKey,
            'cache': cache.describe(),
        });
        cache.set(cacheKey, image);
    }

    await page.close();
    await context.close();

};

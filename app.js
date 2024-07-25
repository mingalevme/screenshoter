require('log-timestamp');
const express = require('express');
const process = require('process');
const puppeteer = require('puppeteer-core');
const minimist = require('minimist');
const controller = require('./controller');
const secureLinkMiddleware = require('./secure-link');
const {SecureLink, Md5Hasher, Sha1Hasher} = require("@mingalevme/secure-link");
const {CacheFactoryCreateConfig, CacheFactory} = require("./cache/factory");
const {LoggerFactory, LoggerFactoryCreateConfig} = require("./logging/factory");

const argv = minimist(process.argv.slice(2));

const loggerFactoryCreateConfig = new LoggerFactoryCreateConfig();
loggerFactoryCreateConfig.Channel = argv['logger-channel'] || process.env.SCREENSHOTER_LOGGER_CHANNEL || 'console';
loggerFactoryCreateConfig.Level = argv['logger-level'] || process.env.SCREENSHOTER_LOGGER_LEVEL || 'debug';
loggerFactoryCreateConfig.ConsoleLevel = argv['logger-console-level'] || process.env.SCREENSHOTER_LOGGER_CONSOLE_LEVEL || loggerFactoryCreateConfig.Level;

const logger = (new LoggerFactory()).create(loggerFactoryCreateConfig);

/** @type {string} */
const host = argv.host || process.env.SCREENSHOTER_HOST || '0.0.0.0';

/** @type {number} */
const port = parseInt(argv.port || process.env.SCREENSHOTER_PORT || 8080);

/** @type {boolean} */
const metrics = (() => {
    if (argv.metrics !== undefined) {
        return !!argv.metrics;
    }
    if (process.env.SCREENSHOTER_METRICS !== undefined) {
        return !!process.env.SCREENSHOTER_METRICS;
    }
    return false;
})();
/** @type {boolean} */
const metricsCollectDefault = (() => {
    if (argv['metrics-collect-default'] !== undefined) {
        return !!argv['metrics-collect-default'];
    }
    if (process.env.SCREENSHOTER_METRICS_COLLECT_DEFAULT !== undefined) {
        return !!process.env.SCREENSHOTER_METRICS_COLLECT_DEFAULT;
    }
    return false;
})();
/** @type {number[] | null} */
const metricsBuckets = (() => {
    const value = String(argv['metrics-buckets'] || process.env.SCREENSHOTER_METRICS_BUCKETS || '');
    return value
        ? value.split(/,\s*/).map(v => +v)
        : null;
})();

/** @type {string|null} */
const secureLinkSecret = argv['secure-link-secret'] || process.env.SCREENSHOTER_SECURE_LINK_SECRET || null;
/** @type {string|null} */
const secureLinkHasher = argv['secure-link-hasher'] || process.env.SCREENSHOTER_SECURE_LINK_HASHER || null;
/** @type {string|null} */
const secureLinkSignatureArg = argv['secure-link-signature-arg'] || process.env.SCREENSHOTER_SECURE_SIGNATURE_ARG || null;
/** @type {string|null} */
const secureLinkExpiresArg = argv['secure-link-expires-arg'] || process.env.SCREENSHOTER_SECURE_EXPIRES_ARG || null;

/** @type {string|null} */
const chromiumExecutablePath = argv['chromium-executable-path'] || process.env.SCREENSHOTER_CHROMIUM_EXECUTABLE_PATH || null;

/** @type {string[]} */
const puppeteerLaunchOptionsArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--incognito',
];

for (let [key, value] of Object.entries(argv)) {
    if (key.startsWith('puppeteer')) {
        let puppeteerArgName = key.substring('puppeteer'.length);
        if (value === true) {
            puppeteerLaunchOptionsArgs.push(puppeteerArgName);
        } else {
            puppeteerLaunchOptionsArgs.push(`${puppeteerArgName}=${value}`);
        }
    }
}

const puppeteerLaunchOptions = {
    args: puppeteerLaunchOptionsArgs,
    executablePath: chromiumExecutablePath,
    headless: true,
};

logger.info('Puppeteer launch options: ', puppeteerLaunchOptions);

const cacheFactoryCreateConfig = new CacheFactoryCreateConfig();
cacheFactoryCreateConfig.Driver = argv['cache-driver'] || process.env.SCREENSHOTER_CACHE_DRIVER || undefined;
cacheFactoryCreateConfig.S3EndpointUrl = argv['cache-s3-endpoint-url'] || process.env.SCREENSHOTER_CACHE_S3_ENDPOINT_URL || undefined;
cacheFactoryCreateConfig.S3Region = argv['cache-s3-region'] || process.env.SCREENSHOTER_CACHE_S3_REGION || undefined;
cacheFactoryCreateConfig.S3AccessKeyId = argv['cache-s3-access-key-id'] || process.env.SCREENSHOTER_CACHE_S3_ACCESS_KEY_ID || undefined;
cacheFactoryCreateConfig.S3SecretAccessKey = argv['cache-s3-secret-access-key'] || process.env.SCREENSHOTER_CACHE_S3_SECRET_ACCESS_KEY || undefined;
cacheFactoryCreateConfig.S3Bucket = argv['cache-s3-bucket'] || process.env.SCREENSHOTER_CACHE_S3_BUCKET || undefined;
cacheFactoryCreateConfig.S3ForcePathStyle = !!(argv['cache-s3-force-path-style'] || process.env.SCREENSHOTER_CACHE_S3_FORCE_PATH_STYLE || undefined);
cacheFactoryCreateConfig.FileSystemBaseDir = argv['cache-file-system-base-dir'] || process.env.SCREENSHOTER_CACHE_FILE_SYSTEM_BASE_DIR || undefined;
cacheFactoryCreateConfig.FileSystemMode = argv['cache-file-system-mode'] || process.env.SCREENSHOTER_CACHE_FILE_SYSTEM_MODE || undefined;
cacheFactoryCreateConfig.RedisHost = argv['cache-redis-host'] || process.env.SCREENSHOTER_CACHE_REDIS_HOST || undefined;
cacheFactoryCreateConfig.RedisPort = parseInt(argv['cache-redis-port'] || process.env.SCREENSHOTER_CACHE_REDIS_PORT) || undefined;
cacheFactoryCreateConfig.RedisUsername = argv['cache-redis-username'] || process.env.SCREENSHOTER_CACHE_REDIS_USERNAME || undefined;
cacheFactoryCreateConfig.RedisPassword = argv['cache-redis-password'] || process.env.SCREENSHOTER_CACHE_REDIS_PASSWORD || undefined;
cacheFactoryCreateConfig.RedisDatabase = parseInt(argv['cache-redis-database'] || process.env.SCREENSHOTER_CACHE_REDIS_DATABASE) || undefined;
cacheFactoryCreateConfig.RedisKeyPrefix = argv['cache-redis-key-prefix'] || process.env.SCREENSHOTER_CACHE_REDIS_KEY_PREFIX || undefined;
cacheFactoryCreateConfig.RedisExpirationTime = parseInt(argv['cache-redis-expiration-time'] || process.env.SCREENSHOTER_CACHE_REDIS_EXPIRATION_TIME) || undefined; // 30 days

/** @type {(Cache|null)} */
const cache = (new CacheFactory(logger)).create(cacheFactoryCreateConfig);

if (cache) {
    logger.info('Using cache', cache.describe());
}

(async () => {
    const browser = await puppeteer.launch(puppeteerLaunchOptions);

    const app = express();

    app.use((req, res, next) => {
        req.logger = logger;
        next();
    });

    // We're not going to include "ping" to the metrics
    app.get('/ping', (req, res) => {
        res.status(200).end('pong');
    });

    if (metrics) {
        let opts = {
            buckets: metricsBuckets
                ? metricsBuckets
                : [0.1, 0.5, 1, 3, 5, 10, 20],
        }
        if (metricsCollectDefault) {
            opts["promClient"] = {
                collectDefaultMetrics: {},
            };
        }
        logger.info('Setting Prometheus middleware', {opts: opts})
        const middleware = require("express-prom-bundle")(opts)
        app.use(middleware);
    }

    if (secureLinkSecret) {
        const hasher = (() => {
            if ((secureLinkHasher || 'md5') === 'md5') {
                return new Md5Hasher()
            } else if (secureLinkHasher === 'sha1') {
                return new Sha1Hasher()
            }
            throw new Error(`Unknown secure link hasher: ${secureLinkHasher}`)
        })();
        const secureLinkService = new SecureLink(secureLinkSecret, hasher, secureLinkSignatureArg, secureLinkExpiresArg);
        const middleware = new secureLinkMiddleware(secureLinkService, logger);
        logger.info('Setting SecureLink middleware', {
            hasher: hasher.constructor.name,
            signatureArg: secureLinkSignatureArg,
            expiresArg: secureLinkExpiresArg,
        })
        app.get('/take', (req, res, next) => {
            middleware.handle(req, res, next);
        });
        /** @deprecated Use /take instead */
        app.get('/screenshot', (req, res, next) => {
            middleware.handle(req, res, next);
        });
    }

    app.get('/take', (req, res) => {
        try {
            controller(browser, req, res, cache);
        } catch (e) {
            logger.error(e);
            res.status(400).end('Error while processing a request: ' + e.message);
        }
    });

    /** @deprecated Use /take instead */
    app.get('/screenshot', (req, res) => {
        try {
            controller(browser, req, res, cache);
        } catch (e) {
            logger.error(e);
            res.status(400).end('Error while processing a request: ' + e.message);
        }
    });

    const server = app.listen(port, host, () => logger.info(`Running on http://${host}:${port}`));

    server.on('close', async () => {
        try {
            await browser.close();
        } catch (err) {
            logger.error(`Error while closing browser on server close: ${err.message}`, err);
        }
        if (cache) {
            try {
                await cache.close();
            } catch (err) {
                logger.error(`Error while closing cache on server close: ${err.message}`, err);
            }
        }
        logger.info("\nBye!");
    });

    process.on('SIGINT', async () => {
        logger.error("SIGINT has been received");
        try {
            await browser.close();
        } catch (err) {
            logger.error(`Error while closing browser while handling SIGINT: ${err.message}`, err);
        }
        await server.close();
    });

    process.on("unhandledRejection", async (reason, p) => {
        logger.error("Unhandled Rejection has been received", {
            reason: reason,
            promise: p,
        });
        try {
            await browser.close();
        } catch (err) {
            logger.error(`Error while closing browser while handling unhandledRejection: ${err.message}`, err);
        }
        await server.close();
    });

    browser.on('disconnected', async () => {
        logger.error("Browser has been disconnected");
        try {
            await browser.close();
        } catch (err) {
            logger.error(`Error closing browser while gracefully handling browser disconnecting: ${err.message}`, err);
        }
        await server.close();
    });
})();

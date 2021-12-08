const {InvalidSignatureError, LinkHasExpiredError, SecureLink} = require("@mingalevme/secure-link");

class SecureLinkMiddleware {
    /**
     * @param {SecureLink} secureLinkService
     * @param logger
     */
    constructor(secureLinkService, logger) {
        this.secureLinkService = secureLinkService;
        this.logger = logger;
    }

    /**
     * @param {IncomingMessage} req
     * @param {ServerResponse} res
     * @param {function()} next
     * @return void
     */
    handle(req, res, next) {
        const url = new URL(req.url, `${req.protocol}://${req.hostname}`)
        this.#log(`${this.constructor.name}: handling request`, {"url": url.toString()});
        try {
            this.secureLinkService.validate(url)
        } catch (e) {
            if (e instanceof InvalidSignatureError) {
                this.#log(`Invalid link signature`, {"url": url.toString()});
                res.status(403)
                    .set('Content-Type', 'text/plain')
                    .send('Invalid signature')
            } else if (e instanceof LinkHasExpiredError) {
                this.#log(`Invalid is expired`, {"url": url.toString()});
                res.status(410)
                    .set('Content-Type', 'text/plain')
                    .send('Link has expired')
            } else {
                this.#log(`Unknown error while validating link`, {
                    'link': url.toString(),
                    'err': e,
                });
                throw e
            }
            return
        }
        this.#log(`${this.constructor.name}: link is valid`, {"url": url.toString()});
        next();
    }

    /**
     *
     * @param {string} message
     * @param {any} meta
     * @return void
     */
    #log(message, meta) {
        if (!this.logger) {
            return
        }
        this.logger.debug(message, meta)
    }
}

module.exports = SecureLinkMiddleware;

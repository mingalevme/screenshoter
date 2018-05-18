# https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md#running-on-alpine

#FROM node:carbon-alpine
FROM node:9-alpine

# Installs latest Chromium (64) package.
RUN echo @edge http://nl.alpinelinux.org/alpine/edge/community >> /etc/apk/repositories && \
    echo @edge http://nl.alpinelinux.org/alpine/edge/main >> /etc/apk/repositories && \
    apk update && apk upgrade && \
    apk add --no-cache \
        build-base \
        chromium@edge \
        nss@edge

RUN apk add vips-dev fftw-dev --update-cache --repository https://dl-3.alpinelinux.org/alpine/edge/testing/

# Create app directory
WORKDIR /app

RUN mkdir -p /var/cache/screenshoter

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

# Puppeteer v0.13.0 works with Chromium 64.
#RUN yarn add puppeteer@0.13.0

# Add user so we don't need --no-sandbox.
RUN addgroup -S pptruser && adduser -S -g pptruser pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app \
    && chown -R pptruser:pptruser /var/cache/screenshoter

# Run everything after as non-privileged user.
USER pptruser

COPY package*.json ./

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

RUN npm install
 node-gyp && npm install --only=production

COPY . .

EXPOSE 8080

CMD ["node", "server.js", "--chromium-executable-path", "/usr/bin/chromium-browser"]

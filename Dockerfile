# https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md#running-on-alpine

FROM alpine:edge

ARG BUILD_DATE
ARG VCS_REF

LABEL MAINTAINER=mingalevme@gmail.com \
    org.label-schema.schema-version="1.0" \
    org.label-schema.name="Google Puppeteer (screenshot) as a Dockerized HTTP-service" \
    org.label-schema.version="1.0.0" \
    org.label-schema.build-date=$BUILD_DATE \
    org.label-schema.vcs-url="https://github.com/mingalevme/screenshoter" \
    org.label-schema.vcs-ref=$VCS_REF \
    org.label-schema.docker.cmd="docker run -d --restart always -p 8080:8080 --name screenshoter mingalevme/screenshoter"

# Installs latest Chromium package.
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    npm

# Add user so we don't need --no-sandbox.
RUN addgroup -S pptruser && adduser -S -g pptruser pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser \
    && mkdir -p /app && chown -R pptruser:pptruser /app \
    && mkdir -p /var/cache/screenshoter && chown -R pptruser:pptruser /var/cache/screenshoter

# Run everything after as non-privileged user.
USER pptruser

# Create app directory
WORKDIR /app

COPY package*.json ./

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

RUN npm install node-gyp && npm install --only=production

COPY . .

# Empji support
RUN mkdir -p /home/pptruser/.fonts && mv /app/Emoji.ttf /home/pptruser/.fonts/Emoji.ttf && fc-cache -fv

EXPOSE 8080

ENTRYPOINT ["node", "app.js"]
CMD ["--chromium-executable-path", "/usr/bin/chromium-browser"]

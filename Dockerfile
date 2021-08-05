# https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md#running-on-alpine

FROM node:alpine

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

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

# Installs latest Chromium package.
RUN apk --update add --no-cache \
        python3 \
        make \
        g++ \
        chromium \
        nss \
        freetype \
        freetype-dev \
        harfbuzz \
        ca-certificates \
        ttf-freefont && \
    addgroup -S pptruser && \
    adduser -S pptruser -G pptruser && \
    mkdir -p /home/pptruser/Downloads && \
    chown -R pptruser:pptruser /home/pptruser && \
    mkdir -p /app && \
    chown -R pptruser:pptruser /app && \
    mkdir -p /var/cache/screenshoter && \
    chown -R pptruser:pptruser /var/cache/screenshoter

WORKDIR /app
USER pptruser
COPY --chown=pptruser:pptruser package*.json ./
RUN npm install --unsafe-perm node-gyp && \
    npm install --only=production
COPY --chown=pptruser:pptruser . .
# Emoji support
RUN mkdir -p /home/pptruser/.fonts && \
    mv /app/Emoji.ttf /home/pptruser/.fonts/Emoji.ttf && \
    fc-cache -fv
ENTRYPOINT ["node", "app.js"]
CMD ["--chromium-executable-path", "/usr/bin/chromium-browser"]
EXPOSE 8080

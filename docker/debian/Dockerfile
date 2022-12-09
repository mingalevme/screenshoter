# https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md#running-on-alpine

FROM node:19-slim

ARG VERSION
ENV VERSION=${VERSION:-dirty}
ARG BUILD_DATE
ARG VCS_REF

LABEL MAINTAINER=mingalevme@gmail.com \
    org.label-schema.schema-version="1.0" \
    org.label-schema.name="Google Puppeteer (screenshot) as a Dockerized HTTP-service" \
    org.label-schema.version="$VERSION" \
    org.label-schema.build-date=$BUILD_DATE \
    org.label-schema.vcs-url="https://github.com/mingalevme/screenshoter" \
    org.label-schema.vcs-ref=$VCS_REF \
    org.label-schema.vendor="Mikhail Mingalev" \
    org.label-schema.docker.cmd="docker run -d --restart always -p 8080:8080 --name screenshoter mingalevme/screenshoter"

RUN apt-get update && \
    apt-get install -y wget gnupg && \
    apt-get update && \
    apt-get install -y \
        chromium \
        fonts-ipafont-gothic \
        fonts-wqy-zenhei \
        fonts-thai-tlwg \
        fonts-kacst \
        fonts-freefont-ttf \
        libxss1 \
        --no-install-recommends && \
    rm -rf /var/lib/apt/lists/* && \
    mkdir -p /app

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

# Installs latest Chromium package.
WORKDIR /app
COPY --chown=pptruser:pptruser package*.json ./
RUN npm install --unsafe-perm node-gyp && \
    npm install --only=production && \
    groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser && \
    mkdir -p /home/pptruser/Downloads && \
    chown -R pptruser:pptruser /home/pptruser && \
    chown -R pptruser:pptruser /app && \
    mkdir -p /var/cache/screenshoter && \
    chown -R pptruser:pptruser /var/cache/screenshoter
COPY --chown=pptruser:pptruser ../.. .
# Emoji support https://github.com/samuelngs/apple-emoji-linux
RUN mkdir -p /home/pptruser/.local/share/fonts && \
    mv /app/AppleColorEmoji.ttf /home/pptruser/.local/share/fonts/AppleColorEmoji.ttf && \
    fc-cache -fv
USER pptruser
ENTRYPOINT ["node", "app.js", "--chromium-executable-path", "/usr/bin/chromium"]
CMD []
EXPOSE 8080

HEALTHCHECK --interval=1m --timeout=1s \
  CMD wget -O- http://127.0.0.1:8080/ping > /dev/null 2>&1

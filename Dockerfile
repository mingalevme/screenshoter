# https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md#running-on-alpine

FROM node:19.2.0-slim

ARG VERSION
ENV VERSION=${VERSION:-dirty}
ARG BUILD_DATE
ARG VCS_REF

# We don't need the standalone Chromium
# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

LABEL MAINTAINER=mingalevme@gmail.com \
    org.label-schema.schema-version="1.0" \
    org.label-schema.name="Google Puppeteer (screenshot) as a Dockerized HTTP-service" \
    org.label-schema.version="$VERSION" \
    org.label-schema.build-date=$BUILD_DATE \
    org.label-schema.vcs-url="https://github.com/mingalevme/screenshoter" \
    org.label-schema.vcs-ref=$VCS_REF \
    org.label-schema.vendor="Mikhail Mingalev" \
    org.label-schema.docker.cmd="docker run -d --restart always -p 8080:8080 --name screenshoter mingalevme/screenshoter"

WORKDIR /app

COPY . .

# https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md
# https://dev.to/cloudx/how-to-use-puppeteer-inside-a-docker-container-568c
# https://javascript.plainenglish.io/visit-websites-without-opening-the-browser-9ee3cf18abdd font list #1
# https://wiki.alpinelinux.org/wiki/Fonts font list #2
RUN apt-get update && \
    apt-get install -y wget gnupg && \
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        google-chrome-stable \
        fonts-ipafont-gothic \
        fonts-wqy-zenhei \
        fonts-thai-tlwg \
        fonts-kacst \
        fonts-freefont-ttf fonts-terminus fonts-inconsolata fonts-dejavu ttf-bitstream-vera fonts-noto-core fonts-noto-cjk fonts-noto-extra fonts-font-awesome \
        libxss1 \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/* /tmp/*.deb && \
    mv ./AppleColorEmoji.ttf /usr/local/share/fonts/AppleColorEmoji.ttf && \
    #mkdir -p /app && \
    rm -rf ./node_modules && \
    #npm install --unsafe-perm node-gyp && \
    npm install --only=production && \
    npm cache clean --force && \
    groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser && \
    mkdir -p /home/pptruser/Downloads && \
    chown -R pptruser:pptruser /home/pptruser && \
    chown -R pptruser:pptruser /app && \
    mkdir -p /var/cache/screenshoter && \
    chown -R pptruser:pptruser /var/cache/screenshoter && \
    fc-cache -fv

USER pptruser

ENTRYPOINT ["node", "app.js", "--chromium-executable-path", "/usr/bin/google-chrome"]

CMD []

EXPOSE 8080

HEALTHCHECK --interval=1m --timeout=1s \
  CMD wget -O- http://127.0.0.1:8080/ping > /dev/null 2>&1

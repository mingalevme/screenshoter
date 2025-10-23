# https://www.docker.com/blog/9-tips-for-containerizing-your-node-js-application/
# https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md
# https://dev.to/cloudx/how-to-use-puppeteer-inside-a-docker-container-568c
# https://javascript.plainenglish.io/visit-websites-without-opening-the-browser-9ee3cf18abdd font list #1
FROM node:25-slim

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

ENV XDG_CONFIG_HOME=/tmp/.chromium-config
ENV XDG_CACHE_HOME=/tmp/.chromium-cache

ENV SCREENSHOTER_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome

RUN apt-get update && \
    apt-get install -y wget gnupg && \
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
    apt-get update

RUN apt-get install -y --no-install-recommends \
        google-chrome-stable \
        fonts-ipafont-gothic \
        fonts-wqy-zenhei \
        fonts-thai-tlwg \
        fonts-kacst \
        fonts-freefont-ttf fonts-terminus fonts-inconsolata fonts-dejavu ttf-bitstream-vera fonts-noto-core fonts-noto-cjk fonts-noto-extra fonts-font-awesome \
        libxss1 \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/* /tmp/*.deb

WORKDIR /app

COPY package.json ./package.json
COPY package-lock.json ./package-lock.json

RUN rm -rf ./node_modules && \
    #npm install --unsafe-perm node-gyp && \
    # Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true" npm install --only=production && \
    npm cache clean --force

COPY AppleColorEmoji.ttf /usr/local/share/fonts/AppleColorEmoji.ttf
RUN fc-cache -fv

COPY . .

RUN rm ./AppleColorEmoji.ttf && \
    mv /usr/local/bin/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh.bak && \
    mv docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh && \
    groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser && \
    mkdir -p /home/pptruser && \
    #mkdir -p /home/pptruser/Downloads && \
    chown -R pptruser:pptruser /home/pptruser && \
    chown -R pptruser:pptruser /app && \
    mkdir -p /var/cache/screenshoter && \
    chown -R pptruser:pptruser /var/cache/screenshoter

USER pptruser

ENTRYPOINT ["docker-entrypoint.sh"]
# notice: ENV SCREENSHOTER_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome
CMD ["node", "app.js"]

EXPOSE 8080

HEALTHCHECK --interval=1m --timeout=1s \
  CMD wget -O- http://127.0.0.1:8080/ping > /dev/null 2>&1

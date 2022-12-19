# https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md#running-on-alpine

FROM node:alpine

ARG VERSION
ENV VERSION=${VERSION:-dirty}
ARG BUILD_DATE
ARG VCS_REF

ARG EXTRA_FONTS_BASE
ARG EXTRA_FONTS_CYRILLIC
ARG EXTRA_FONTS_OTHER

LABEL MAINTAINER=mingalevme@gmail.com \
    org.label-schema.schema-version="1.0" \
    org.label-schema.name="Google Puppeteer (screenshot) as a Dockerized HTTP-service" \
    org.label-schema.version="$VERSION" \
    org.label-schema.build-date=$BUILD_DATE \
    org.label-schema.vcs-url="https://github.com/mingalevme/screenshoter" \
    org.label-schema.vcs-ref=$VCS_REF \
    org.label-schema.vendor="Mikhail Mingalev" \
    org.label-schema.docker.cmd="docker run -d --restart always -p 8080:8080 --name screenshoter mingalevme/screenshoter"

RUN apk --update add --no-cache \
        python3 \
        make \
        g++ \
        chromium \
        nss \
        freetype \
        freetype-dev \
        harfbuzz \
        ca-certificates && \
    addgroup -S pptruser && \
    adduser -S pptruser -G pptruser && \
    mkdir -p /home/pptruser/Downloads && \
    chown -R pptruser:pptruser /home/pptruser && \
    mkdir -p /app && \
    chown -R pptruser:pptruser /app && \
    mkdir -p /var/cache/screenshoter && \
    chown -R pptruser:pptruser /var/cache/screenshoter

# Font list is provided by https://wiki.alpinelinux.org/wiki/Fonts
RUN apk --update add --no-cache ttf-freefont && \
    ( \
        if [ -n "$EXTRA_FONTS_BASE" ]; then \
            apk --update add --no-cache terminus-font ttf-inconsolata ttf-dejavu font-noto font-noto-cjk font-noto-extra ttf-font-awesome; \
            apk search -qe "font-bitstream-*" | xargs apk add --no-cache; \
        else \
            echo "" > /dev/null; \
        fi \
    ) && \
    ( \
        if [ -n "$EXTRA_FONTS_CYRILLIC" ]; then \
            apk --update add --no-cache font-vollkorn font-misc-cyrillic font-mutt-misc font-screen-cyrillic font-winitzki-cyrillic font-cronyx-cyrillic; \
        else \
            echo "" > /dev/null; \
        fi \
    ) && \
    ( \
        if [ -n "$EXTRA_FONTS_OTHER" ]; then \
            apk add --no-cache font-arabic-misc; \
            apk add --no-cache font-noto-arabic font-noto-armenian font-noto-cherokee font-noto-devanagari font-noto-ethiopic font-noto-georgian; \
            apk add --no-cache font-noto font-noto-thai font-noto-tibetan font-ipa font-sony-misc font-daewoo-misc font-jis-misc; \
            apk add --no-cache font-noto-hebrew font-noto-lao font-noto-malayalam font-noto-tamil font-noto-thaana font-noto-thai; \
            apk add --no-cache font-isas-misc; \
        else \
            echo "" > /dev/null; \
        fi \
    )

WORKDIR /app

USER pptruser

COPY --chown=pptruser:pptruser package*.json ./

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

RUN npm install --unsafe-perm node-gyp && \
    npm install --only=production

COPY --chown=pptruser:pptruser . .

# Emoji support https://github.com/samuelngs/apple-emoji-linux
RUN mkdir -p /home/pptruser/.local/share/fonts && \
    mv /app/AppleColorEmoji.ttf /home/pptruser/.local/share/fonts/AppleColorEmoji.ttf && \
    fc-cache -fv

ENTRYPOINT ["node", "app.js", "--chromium-executable-path", "/usr/bin/chromium-browser"]

CMD []

EXPOSE 8080

HEALTHCHECK --interval=1m --timeout=1s \
  CMD wget -O- http://127.0.0.1:8080/ping > /dev/null 2>&1

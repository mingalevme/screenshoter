# screenshoter

[Google Puppeteer](https://github.com/GoogleChrome/puppeteer) as a Dockerized HTTP-service for making screenshots.

![DockerHub](https://github.com/mingalevme/screenshoter/actions/workflows/dockerhub.yml/badge.svg)

## installation

```
docker pull mingalevme/screenshoter
```

# Usage

### Basic usage

```shell
docker run -d --restart always -p 8080:8080 --name screenshoter mingalevme/screenshoter
```

### Setting Browser Launch Arguments

To pass any arguments to browser use `--browser`-prefix before the argument.

For example, to set **Proxy Server (--proxy-server)** you must provide `--browser--proxy-server=VALUE`-console-arg:

```shell
docker run -d --restart always -p 8080:8080 --name screenshoter mingalevme/screenshoter \
  --browser--proxy-server=socks5://example.com:1080
```

It will add `--proxy-server=socks5://example.com:1080` to browser launch args.

> **Note** "--" (double-dash) after `--browser`-prefix.

For a full list of **Chromium Command Line Switches**
visit https://peter.sh/experiments/chromium-command-line-switches/.

### Building an image

```shell
docker build -t screenshoter .
docker run --rm -p 8080:8080 --name screenshoter screenshoter --metrics --metrics-collect-default
```

### Run via NodeJS (OSX with Google Chrome)

```shell
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
npm install
node app.js --host 127.0.0.1 --port 8080 \
  --chromium-executable-path "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

Then navigate to url

```shell
curl "http://localhost:8080/take?url=https%3A%2F%2Fhub.docker.com%2Fr%2Fmingalevme%2Fscreenshoter%2F" > /tmp/screenshot.png
```

### Docker Read-Only mode

To use the image in read-only mode you have to override some Chrome-directories :

- system config dir (~
  /.config) (https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/user_data_dir.md#linux)
- system cache dir (~
  /.cache) (https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/user_data_dir.md#user-cache-directory)

The default values for these parameters are (`mingalevme/screenshoter`-docker-image):

- `XDG_CONFIG_HOME=/tmp/.chromium-config`
- `XDG_CACHE_HOME=/tmp/.chromium-cache`

So you have to run image with writable `/tmp`-dir:

```shell
docker run --rm -p 8080:8080 --read-only -v "/tmp" --name screenshoter mingalevme/screenshoter
```

But you can override it while `docker run`-command, e.g.:

```shell
docker run --rm -p 8080:8080 --read-only -v "/var/lib/chromium" -v "/var/cache/chromium" -e "XDG_CONFIG_HOME=/var/lib/chromium/config" -e "XDG_CACHE_HOME=/var/cache/chromium" --name screenshoter mingalevme/screenshoter
```

### Puppeteer

| CLI arg                    | EnvVar                                | Default | Comment                                                                                                                                                       |
|----------------------------|---------------------------------------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|
| --chromium-executable-path | SCREENSHOTER_CHROMIUM_EXECUTABLE_PATH |         | Chromium executable path                                                                                                                                      |
| --chromium-user-data-dir   | SCREENSHOTER_CHROMIUM_USER_DATA_DIR   |         | Path to a user data directory. [See the Chromium docs](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/user_data_dir.md) for more info. |

### Logging

| CLI arg                | EnvVar                            | Default | Comment                                                                                    |
|------------------------|-----------------------------------|---------|--------------------------------------------------------------------------------------------|
| --logger-channel       | SCREENSHOTER_LOGGER_CHANNEL       | console | Console (StdOut/StdErr)                                                                    |
| --logger-level         | SCREENSHOTER_LOGGER_LEVEL         | debug   | Global default log level (debug, info, notice, warning, error, critical, alert, emergency) |
| --logger-console-level | SCREENSHOTER_LOGGER_CONSOLE_LEVEL |         | Console logger level                                                                       |

### Cache

| CLI arg        | EnvVar                    | Default | Comment                                        |
|----------------|---------------------------|---------|------------------------------------------------|
| --cache-driver | SCREENSHOTER_CACHE_DRIVER |         | Cache driver (available: null, s3, filesystem) |

#### S3

| CLI arg                      | EnvVar                                  | Default                  | Comment              |
|------------------------------|-----------------------------------------|--------------------------|----------------------|
| --cache-s3-endpoint-url      | SCREENSHOTER_CACHE_S3_ENDPOINT_URL      | https://s3.amazonaws.com | s3 endpoint url      |
| --cache-s3-region            | SCREENSHOTER_CACHE_S3_REGION            | us-east-1                | s3 region            |
| --cache-s3-access-key-id     | SCREENSHOTER_CACHE_S3_ACCESS_KEY_ID     |                          | S3 access key id     |
| --cache-s3-secret-access-key | SCREENSHOTER_CACHE_S3_SECRET_ACCESS_KEY |                          | S3 secret access key |
| --cache-s3-bucket            | SCREENSHOTER_CACHE_S3_BUCKET            |                          | S3 bucket            |
| --cache-s3-force-path-style  | SCREENSHOTER_CACHE_S3_FORCE_PATH_STYLE  | 0                        | Use path-style       |

#### FileSystem

| CLI arg                      | EnvVar                                  | Default           | Comment                                                                        |
|------------------------------|-----------------------------------------|-------------------|--------------------------------------------------------------------------------|
| --cache-file-system-base-dir | SCREENSHOTER_CACHE_FILE_SYSTEM_BASE_DIR | $TMP/screenshoter | Cache dir (**/var/cache/screenshoter** is a good alternative to default value) |
| --cache-file-system-mode     | SCREENSHOTER_CACHE_FILE_SYSTEM_MODE     | 0o666             | File creation mode                                                             |

### Prometheus metrics

To enable export Prometheus metrics (https://www.npmjs.com/package/express-prom-bundle) add `--metrics` arg or set
`SCREENSHOTER_METRICS` env var.

| CLI arg                   | EnvVar                               | Default             | Comment                                  |
|---------------------------|--------------------------------------|---------------------|------------------------------------------|
| --metrics                 | SCREENSHOTER_METRICS                 |                     | Enable metrics export                    |
| --metrics-collect-default | SCREENSHOTER_METRICS_COLLECT_DEFAULT |                     | Export default Prometheus NodeJS metrics |
| --metrics-buckets         | SCREENSHOTER_METRICS_BUCKETS         | 0.1,0.5,1,3,5,10,20 | "http_request_duration_seconds" buckets  |

Example:

```shell
docker run -d --restart always -p 8080:8080 --name screenshoter mingalevme/screenshoter --metrics --metrics-collect-default --metrics-buckets "1,3,5,10,20,30,60"
```

Metrics are available on `/metrics`-path.

### Secure Link

You can restrict access to the service via link signing (https://www.npmjs.com/package/@mingalevme/secure-link).
To enable the restriction run the service with `secure-link-secret` arg or `SCREENSHOTER_SECURE_LINK_SECRET` env var,
that is you private key to sign/validate links.

| CLI arg                     | EnvVar                            | Default   | Comment                     |
|-----------------------------|-----------------------------------|-----------|-----------------------------|
| --secure-link-secret        | SCREENSHOTER_SECURE_LINK_SECRET   |           | Secret key                  |
| --secure-link-hasher        | SCREENSHOTER_SECURE_LINK_HASHER   | md5       | Hasher, md5/sha1            |
| --secure-link-signature-arg | SCREENSHOTER_SECURE_SIGNATURE_ARG | signature | signature query param name  |
| --secure-link-expires-arg   | SCREENSHOTER_SECURE_EXPIRES_ARG   | expires   | expiration query param name |

Example:

```shell
docker run -d --restart always -p 8080:8080 --name screenshoter -e "SCREENSHOTER_SECURE_LINK_SECRET=secret" mingalevme/screenshoter --secure-link-hasher sha1 --secure-link-signature-arg _sig --secure-link-expires-arg _expires --secure-link-secret "secret"
```

NOTE the example uses both env var and arg for setting a secret, any one is enough.

# API Reference

```
GET /take
```

### Arguments

|     | Arg                               | Type       | Required | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
|:----|-----------------------------------|------------|----------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|     | url                               | string     | true     | Absolute URL of the page to screenshot. Example: 'https://www.google.com'                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
|     | timezone                          | string     | true     | Changes the timezone of the page. Example: 'Europe/Madrid'. Details: https://pptr.dev/api/puppeteer.page.emulatetimezone                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
|     | format                            | string     | false    | Image file format. Supported types are png or jpeg. Defaults to png.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
|     | quality                           | int        | false    | The quality of the image, between 1-100. Not applicable to png images.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
|     | full                              | int        | false    | When true, takes a screenshot of the full scrollable page. Defaults to false.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
|     | device                            | string     | false    | One of supported device, e.g. iPhone X, see https://pptr.dev/api/puppeteer.knowndevices for a full list of devices                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
|     | viewport-width                    | int        | false    | Width in pixels of the viewport when taking the screenshot. Using lower values like 460 can help emulate what the page looks like on mobile devices. Defaults to 800.                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
|     | viewport-height                   | int        | false    | Height in pixels of the viewport when taking the screenshot. Defaults to 600.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
|     | capture-beyond-viewport           | bool (int) | false    | Capture the screenshot beyond the viewport (https://pptr.dev/api/puppeteer.screenshotoptions.capturebeyondviewport). Defaults to **false**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
|     | transparency                      | bool (int) | false    | Hides default white webpage background for capturing screenshots with transparency, only works when `format` is `png`. Defaults to 0.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
|     | is-mobile                         | bool (int) | false    | Whether the meta viewport tag is taken into account. Defaults to false.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
|     | has-touch                         | bool (int) | false    | Specifies if viewport supports touch events. Defaults to false.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
|     | is-landscape                      | bool (int) | false    | Specifies if viewport is in landscape mode. Defaults to false.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
|     | device-scale-factor               | int        | false    | Sets device scale factor (basically dpr) to emulate high-res/retina displays. Number from 1 to 4. Defaults to 1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
|     | user-agent                        | string     | false    | Sets user agent                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
|     | cookies                           | json       | false    | List with cookies objects (https://github.com/puppeteer/puppeteer/blob/main/docs/api.md#pagesetcookiecookies), e.g. [{"name":"foo","value":"bar","domain":".example.com"}]                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
|     | navigation-timeout-ms             | int        | false    | Maximum navigation time in milliseconds, defaults to 30 seconds, pass 0 to disable timeout.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
|     | timeout                           | int        | false    | (DEPRECATED, see navigation-timeout-ms) Maximum navigation time in milliseconds, defaults to 30 seconds, pass 0 to disable timeout.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
|     | fail-on-timeout                   | bool (int) | false    | If set to false, we will take a screenshot when timeout is reached instead of failing the request. Defaults to false.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
|     | wait-until-event                  | string     | false    | Controls when the screenshot is taken as the page loads (https://pptr.dev/api/puppeteer.waitforoptions.waituntil). Supported events include: load - window load event fired (default); domcontentloaded - DOMContentLoaded event fired; networkidle0 - wait until there are zero network connections for at least 500ms; networkidle2 - wait until there are no more than 2 network connections for at least 500ms. domcontentloaded is the fastest but riskiest option–many images and other asynchronous resources may not have loaded yet. networkidle0 is the safest but slowest option. load is a nice middle ground. Defaults to **load**. |
|     | wait-for-selector<sup>*</sup>     | string     | false    | Wait for the **selector** to appear in page (https://pptr.dev/api/puppeteer.page.waitforselector). Example: 'body > #my-element'.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
|     | wait-for-selector-timeout-ms      | int        | false    | Maximum time to wait in milliseconds. Pass 0 to disable timeout. Defaults to 30 seconds. Example: '5000'.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
|     | fail-on-wait-for-selector-timeout | bool (int) | false    | If set to false, we will take a screenshot when timeout is reached instead of failing the request. Defaults to false.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
|     | wait-for-xpath<sup>*</sup>        | string     | false    | Wait for the **xpath** to appear in page (https://pptr.dev/api/puppeteer.page.waitforxpath). Example: '//*\[@id="my-element"\]/div'.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
|     | wait-for-xpath-timeout-ms         | int        | false    | Maximum time to wait in milliseconds. Pass 0 to disable timeout. Defaults to 30 seconds. Example: '5000'.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
|     | fail-on-wait-for-xpath-timeout    | bool (int) | false    | If set to false, we will take a screenshot when timeout is reached instead of failing the request. Defaults to false.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
|     | wait-for-function<sup>*</sup>     | string     | false    | Waits for a function to finish evaluating in the page's context (https://pptr.dev/api/puppeteer.page.waitforfunction). Example: 'window.innerWidth < 100'.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
|     | wait-for-function-timeout-ms      | int        | false    | Maximum time to wait in milliseconds. Pass 0 to disable timeout. Defaults to 30 seconds. Example: '5000'.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
|     | wait-for-function-polling         | int or str | false    | An interval at which the pageFunction is executed, defaults to **raf** (https://pptr.dev/api/puppeteer.framewaitforfunctionoptions.polling). Example: '100'.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
|     | fail-on-wait-for-function-timeout | bool (int) | false    | If set to false, we will take a screenshot when timeout is reached instead of failing the request. Defaults to false.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
|     | delay-ms                          | int        | false    | If set, we'll wait for the specified number of seconds after the page load event before taking a screenshot.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
|     | delay                             | int        | false    | (DEPRECATED, delay-ms) If set, we'll wait for the specified number of seconds after the page load event before taking a screenshot.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
|     | scroll-page-to-bottom             | bool (int) | false    | (thx https://github.com/Kiuber) Scroll the page to the bottom (https://www.npmjs.com/package/puppeteer-autoscroll-down).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
|     | scroll-page-to-bottom-size        | int        | false    | (scroll-page-to-bottom) Number of pixels to scroll on each step (default: 250).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
|     | scroll-page-to-bottom-delay-ms    | int        | false    | (scroll-page-to-bottom) Delay in ms after each completed scroll step (default: 100).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
|     | scroll-page-to-bottom-steps-limit | int        | false    | (scroll-page-to-bottom) Max number of steps to scroll.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
|     | element                           | string     | false    | Query selector of element to screenshot. Example: 'Body > div'                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
|     | width                             | int        | false    | If resulted image's width is greater than provided value then image will be proportionally resized to provided width. This action runs before max-height checking. Defaults to 0 (do not resize).                                                                                                                                                                                                                                                                                                                                                                                                                                                |
|     | max-height                        | int        | false    | If resulted image's height is greater than provided value then image's height will be cropped to provided value. Defaults to 0 (do not crop).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
|     | ttl                               | int        | false    | If last cached screenshot was made less than provided seconds then the cached image will be returned otherwise image will be cached for future use.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
|     | proxy                             | string     | false    | Proxy server(*anonymous only*) with optional port to use for all requests (BrowserContextOptions.proxyServer).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
|     | proxy-bypass-list                 | string     | false    | Comma-separated list of hosts to bypass the proxy (BrowserContextOptions.proxyBypassList).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

> **NOTICE**<br>
> **wait-for-<span>*</span>** checks (wait-for-selector, wait-for-xpath, wait-for-function) are performed sequentially
> and not simultaneous because of the complexity of error handling.

# Troubleshooting

### BUS_ADRERR

If you got page crash with
`BUS_ADRERR` ([chromium issue](https://bugs.chromium.org/p/chromium/issues/detail?id=571394)), increase shm-size on
docker run with `--shm-size` argument

```shell
docker run --shm-size 1G mingalevme/screenshoter
```

### Navigation errors (unreachable url, ERR\_NETWORK_CHANGED)

If you're seeing random navigation errors (unreachable url) it's likely due to ipv6 being enabled in docker. Navigation
errors are caused by ERR_NETWORK_CHANGED (-21) in chromium. Disable ipv6 in your container using
`--sysctl net.ipv6.conf.all.disable_ipv6=1` to fix:

```shell
docker run --shm-size 1G --sysctl net.ipv6.conf.all.disable_ipv6=1 mingalevme/screenshoter
```

### SSH to container

```shell
docker run --rm -it --entrypoint /bin/bash --user root mingalevme/screenshoter
```

### Thanks

- https://github.com/Kiuber ([puppeteer-autoscroll-down](https://www.npmjs.com/package/puppeteer-autoscroll-down)
  integration, timezone, capture-beyond-viewport, fonts)

# screenshoter

[Google Puppeteer](https://github.com/GoogleChrome/puppeteer) as a Dockerized HTTP-service.

[![nodesource/node](http://dockeri.co/image/mingalevme/screenshoter)](https://hub.docker.com/r/mingalevme/screenshoter/)

## docker tags

- `latest`
- `1`
- `1.0.0`

## installation

```
docker pull mingalevme/screenshoter
```

# Usage

### Basic usage
```bash
docker run -d --restart always -p 8080:8080 --name screenshoter mingalevme/screenshoter
```

```bash
curl "http://localhost:8080/screenshot?url=https%3A%2F%2Fhub.docker.com%2Fr%2Fmingalevme%2Fscreenshoter%2F" > /tmp/screenshot.png
```

### Specifying the cache dir
```bash
docker run -p 8080:8080 -v <cache_dir>:/var/cache/screenshoter mingalevme/screenshoter
```
First request:
```bash
time curl "http://localhost:8080/screenshot?url=https%3A%2F%2Fhub.docker.com%2Fr%2Fmingalevme%2Fscreenshoter%2F&ttl=3600" > /tmp/screenshot.png
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100 43589    0 43589    0     0   4119      0 --:--:--  0:00:10 --:--:-- 10020

real	0m10.597s
user	0m0.007s
sys	0m0.005s
```
Second request:
```bash
time curl "http://localhost:8080/screenshot?url=https%3A%2F%2Fhub.docker.com%2Fr%2Fmingalevme%2Fscreenshoter%2F&ttl=3600" > /tmp/screenshot.png
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100 43589    0 43589    0     0  5545k      0 --:--:-- --:--:-- --:--:-- 6081k

real	0m0.022s
user	0m0.006s
sys	0m0.004s
```
# API Reference
```
GET /screenshot
```
### Arguments
| Arg                 | Type       | Required | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
|---------------------|------------|----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| url                 | string     | true     | Absolute URL of the page to screenshot. Example: 'https://www.google.com'                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| format              | string     | false    | Image file format. Supported types are png or jpeg. Defaults to png.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| quality             | int        | false    | The quality of the image, between 1-100. Not applicable to png images.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| full                | int        | false    | When true, takes a screenshot of the full scrollable page. Defaults to false.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| viewport-width      | int        | false    | Width in pixels of the viewport when taking the screenshot. Using lower values like 460 can help emulate what the page looks like on mobile devices. Defaults to 800.                                                                                                                                                                                                                                                                                                                                                                                                       |
| viewport-height     | int        | false    | Height in pixels of the viewport when taking the screenshot. Defaults to 600.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| max-height          | int        | false    | The max height in pixels of the resulted image. Defaults to 0 (do not crop).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| is-mobile           | bool (int) | false    | Whether the meta viewport tag is taken into account. Defaults to false.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| has-touch           | bool (int) | false    | Specifies if viewport supports touch events. Defaults to false.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| device-scale-factor | int        | false    | Sets device scale factor (basically dpr) to emulate high-res/retina displays. Number from 1 to 4. Defaults to 1.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| delay               | int        | false    | If set, we'll wait for the specified number of seconds after the page load event before taking a screenshot.                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| wait-until-event    | string     | false    | Controls when the screenshot is taken as the page loads. Supported events include: load - window load event fired (default); domcontentloaded - DOMContentLoaded event fired; networkidle0 - wait until there are zero network connections for at least 500ms; networkidle2 - wait until there are no more than 2 network connections for at least 500ms. domcontentloaded is the fastest but riskiest option–many images and other asynchronous resources may not have loaded yet. networkidle0 is the safest but slowest option. load is a nice middle ground.Defaults to load. |
| element             | string     | false    | Query selector of element to screenshot.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ttl                 | int        | false    | If provided and greater than 0 then cache will be enabled and valid for provided value of seconds.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

# Troubleshooting

### BUS_ADRERR
If you got page crash with `BUS_ADRERR` ([chromium issue](https://bugs.chromium.org/p/chromium/issues/detail?id=571394)), increase shm-size on docker run with `--shm-size` argument

```bash
docker run --shm-size 1G mingalevme/screenshoter
```

### Navigation errors (unreachable url, ERR\_NETWORK_CHANGED)
If you're seeing random navigation errors (unreachable url) it's likely due to ipv6 being enabled in docker. Navigation errors are caused by ERR_NETWORK_CHANGED (-21) in chromium. Disable ipv6 in your container using `--sysctl net.ipv6.conf.all.disable_ipv6=1` to fix:
```bash
docker run --shm-size 1G --sysctl net.ipv6.conf.all.disable_ipv6=1 -v <cache_dir>:/var/cache/screenshoter mingalevme/screenshoter
```

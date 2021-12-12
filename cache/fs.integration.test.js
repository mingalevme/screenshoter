const os = require("os");
const fs = require("fs");
const {FileSystemCache} = require("./fs");
const {Readable} = require("stream");
const {streamToString} = require("../stream-to-string");

const baseDir = process.env.SCREENSHOTER_TEST_FS_BASE_DIR || `${os.tmpdir()}/screenshoter`;
fs.mkdirSync(baseDir, {
    recursive: true,
});

const cache = new FileSystemCache(baseDir);

const data = new Readable();
data.push('bar');
data.push(null);

describe('cache: fs', () => {
    test('get/set', async () => {
        const filename = `${baseDir}/acbd18db4cc2f85cedef654fccc4a4d8`; // echo md5('foo');
        fs.rmSync(filename, {
            force: true
        });
        let result = await cache.get('foo');
        expect(result).toBe(null);
        expect(fs.existsSync(filename)).toBe(false);
        await cache.set('foo', data, 60);
        expect(fs.readFileSync(filename).toString()).toBe('bar');
        result = await cache.get('foo');
        expect(await streamToString(result)).toBe('bar');
        fs.rmSync(filename, {
            force: true
        });
    });
})


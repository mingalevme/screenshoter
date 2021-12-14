const Readable = require('stream').Readable;
const {NullCache} = require("./null");

const cache = new NullCache();

test('get', async () => {
    const data = new Readable();
    data.push('foobar');
    data.push(null);
    await cache.set('foobar', data, 60);
    const result = await cache.get('foobar');
    expect(result).toBe(null);
});

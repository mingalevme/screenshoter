const {NullCache} = require("./null");

const cache = new NullCache();
test('get', async () => {
    await cache.set('foobar', 'data', 60);
    const result = await cache.get('foobar');
    expect(result).toBe(null);
});

const {DEBUG} = require("./level");

const MemoryLogger = require("./memory").MemoryLogger;

test('get', async () => {
    const logger = new MemoryLogger();
    await logger.debug('Test', {
        foo: 'bar',
    });
    expect(logger.getHistory().length).toBe(1);
    expect(logger.getHistory()[0].getLevel()).toBe(DEBUG);
    expect(logger.getHistory()[0].getMessage()).toBe('Test');
    expect(logger.getHistory()[0].getContext()['foo']).toBe('bar');
});

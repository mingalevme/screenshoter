const Readable = require('stream').Readable;
const {S3Client, GetObjectCommand, PutObjectCommand, HandlerOptions} = require("@aws-sdk/client-s3");
const {Command} = require("@aws-sdk/smithy-client");
const {S3Cache} = require("./s3");
const {streamToString} = require('../stream-to-string');

class S3ClientMock extends S3Client {
    /** @param {Command} */
    command;
    /** @param {HandlerOptions} */
    options;

    constructor(response) {
        super({});
        this._value = response;
    }

    async send(command, options) {
        this.command = command;
        this.options = options;
        return this._value;
    }
}

describe('cache: s3', () => {
    test('get unexisting value', async () => {
        const data = new Readable();
        data.push('bar');
        data.push(null);
        const s3client = new class extends S3ClientMock {
            async send(command, options) {
                await super.send(command, options);
                throw {
                    name: 'NoSuchKey',
                };
            }
        }({
            Body: new Readable(),
        });
        const cache = new S3Cache(s3client, 's3bucket');
        const result = await cache.get('foo');
        expect(result).toBe(null);
        expect(s3client.command).toBeInstanceOf(GetObjectCommand);
        expect(s3client.command.input.Bucket).toBe('s3bucket');
        expect(s3client.command.input.Key).toBe('acbd18db4cc2f85cedef654fccc4a4d8');
        expect(s3client.options).toBe(undefined);
    });
    test('get existing value w/o ttl', async () => {
        const data = new Readable();
        data.push('bar');
        data.push(null);
        const s3client = new S3ClientMock({
            Body: data,
        });
        const cache = new S3Cache(s3client, 's3bucket');
        const result = await streamToString(await cache.get('foo'));
        expect(result).toBe('bar');
        expect(s3client.command).toBeInstanceOf(GetObjectCommand);
        expect(s3client.command.input.Bucket).toBe('s3bucket');
        expect(s3client.command.input.Key).toBe('acbd18db4cc2f85cedef654fccc4a4d8');
        expect(s3client.options).toBe(undefined);
    });
    test('get stale value', async () => {
        const data = new Readable();
        data.push('bar');
        data.push(null);
        const now = new Date();
        const s3client = new S3ClientMock({
            Body: data,
            LastModified: new Date(now.getTime() - 2*1000), // 2 seconds ago
        });
        const cache = new S3Cache(s3client, 's3bucket', null, () => now);
        const result = await cache.get('foo', 1);
        expect(result).toBe(null);
    });
    test('get fresh value', async () => {
        const data = new Readable();
        data.push('bar');
        data.push(null);
        const now = new Date();
        const s3client = new S3ClientMock({
            Body: data,
            LastModified: new Date(now.getTime() - 2*1000), // 2 seconds ago
        });
        const cache = new S3Cache(s3client, 's3bucket', null, () => now);
        const result = await streamToString(await cache.get('foo', 3));
        expect(result).toBe('bar');
    });
    test('set data', async () => {
        const data = new Readable();
        const s3client = new S3ClientMock({});
        const now = new Date();
        const cache = new S3Cache(s3client, 's3bucket', null, () => now);
        cache.set('foo', data);
        expect(s3client.command).toBeInstanceOf(PutObjectCommand);
        expect(s3client.command.input.Body).toBe(data);
        expect(s3client.command.input.Expires).toBe(undefined);
    });
});

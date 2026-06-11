// tests/unit/adapters/blob/filesystem/index.test.js

const fs = require('fs');
const path = require('path');
const os = require('os');
const { FilesystemBlobAdapter } = require('../../../../../src/adapters/blob/filesystem');

describe('FilesystemBlobAdapter', () => {
  let adapter;
  let tmpDir;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docket-blob-'));
    adapter = new FilesystemBlobAdapter({ basePath: tmpDir });
    await adapter.initialize();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('validates config and parses maxFileSize', () => {
    const a = new FilesystemBlobAdapter({ basePath: tmpDir, maxFileSize: '1mb' });
    expect(a.config.maxFileSize).toBe(1024 * 1024);
  });

  it('parses size strings', () => {
    expect(adapter.parseSize(100)).toBe(100);
    expect(adapter.parseSize('100')).toBe(100);
    expect(adapter.parseSize('1kb')).toBe(1024);
    expect(adapter.parseSize('1.5mb')).toBe(1.5 * 1024 * 1024);
    expect(adapter.parseSize('2gb')).toBe(2 * 1024 ** 3);
    expect(adapter.parseSize('invalid')).toBe(Infinity);
  });

  it('puts and gets a buffer', async () => {
    const result = await adapter.put('test/blob.txt', Buffer.from('hello'));
    expect(result.key).toBe('test/blob.txt');
    expect(result.size).toBe(5);

    const got = await adapter.get('test/blob.txt');
    expect(got.data.toString()).toBe('hello');
    expect(got.metadata.size).toBe(5);
  });

  it('puts string data', async () => {
    await adapter.put('hello.txt', 'world');
    const got = await adapter.get('hello.txt');
    expect(got.data.toString()).toBe('world');
  });

  it('throws when file exceeds maxFileSize', async () => {
    const a = new FilesystemBlobAdapter({ basePath: tmpDir, maxFileSize: 2 });
    await expect(a.put('big.txt', 'hello')).rejects.toThrow('exceeds max');
  });

  it('returns false when deleting missing blob', async () => {
    const result = await adapter.delete('missing.txt');
    expect(result).toBe(false);
  });

  it('deletes existing blob and metadata', async () => {
    await adapter.put('delete-me.txt', 'data');
    const result = await adapter.delete('delete-me.txt');
    expect(result).toBe(true);
    expect(await adapter.exists('delete-me.txt')).toBe(false);
  });

  it('checks existence', async () => {
    expect(await adapter.exists('none.txt')).toBe(false);
    await adapter.put('exists.txt', 'data');
    expect(await adapter.exists('exists.txt')).toBe(true);
  });

  it('returns null for getUrl', async () => {
    expect(await adapter.getUrl('key')).toBeNull();
  });

  it('throws on get missing blob', async () => {
    await expect(adapter.get('missing.txt')).rejects.toThrow('Blob not found');
  });

  it('sanitizes traversal in keys', async () => {
    await adapter.put('../../escape.txt', 'data');
    const resolved = path.join(tmpDir, 'escape.txt');
    expect(fs.existsSync(resolved)).toBe(true);
  });

  it('returns health ok', async () => {
    const health = await adapter.health();
    expect(health.ok).toBe(true);
  });

  it('returns metadata', () => {
    expect(FilesystemBlobAdapter.metadata.name).toBe('filesystem-blob');
  });
});

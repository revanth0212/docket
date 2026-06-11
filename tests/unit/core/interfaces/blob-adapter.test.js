// tests/unit/core/interfaces/blob-adapter.test.js

const { BlobAdapter } = require('../../../../src/core/interfaces/blob-adapter');

describe('BlobAdapter', () => {
  it('validates config', () => {
    const adapter = new BlobAdapter({ path: '/tmp' });
    expect(adapter.config).toEqual({ path: '/tmp' });
  });

  it('throws on invalid config', () => {
    expect(() => new BlobAdapter(null)).toThrow('Config must be an object');
  });

  it('initialize does nothing by default', async () => {
    const adapter = new BlobAdapter({});
    await expect(adapter.initialize()).resolves.toBeUndefined();
  });

  it('put throws by default', async () => {
    const adapter = new BlobAdapter({});
    await expect(adapter.put('k', Buffer.from('d'), {})).rejects.toThrow('Method "put" must be implemented by subclass');
  });

  it('get throws by default', async () => {
    const adapter = new BlobAdapter({});
    await expect(adapter.get('k')).rejects.toThrow('Method "get" must be implemented by subclass');
  });

  it('delete throws by default', async () => {
    const adapter = new BlobAdapter({});
    await expect(adapter.delete('k')).rejects.toThrow('Method "delete" must be implemented by subclass');
  });

  it('exists throws by default', async () => {
    const adapter = new BlobAdapter({});
    await expect(adapter.exists('k')).rejects.toThrow('Method "exists" must be implemented by subclass');
  });

  it('getUrl returns null by default', async () => {
    const adapter = new BlobAdapter({});
    expect(await adapter.getUrl('k')).toBeNull();
  });

  it('health returns ok when put/delete succeed', async () => {
    class GoodAdapter extends BlobAdapter {
      async put() { return { key: 'k' }; }
      async delete() { return true; }
    }
    const adapter = new GoodAdapter({});
    const health = await adapter.health();
    expect(health.ok).toBe(true);
  });

  it('health returns error when put fails', async () => {
    class BadAdapter extends BlobAdapter {
      async put() { throw new Error('down'); }
    }
    const adapter = new BadAdapter({});
    const health = await adapter.health();
    expect(health.ok).toBe(false);
    expect(health.error).toBe('down');
  });

  it('metadata throws by default', () => {
    expect(() => BlobAdapter.metadata).toThrow('Property "metadata" must be implemented by subclass');
  });
});

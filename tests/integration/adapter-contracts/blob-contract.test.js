// tests/integration/adapter-contracts/blob-contract.test.js
// Contract tests for ALL blob adapters
// Run with: ADAPTER=filesystem npm test blob-contract

const { loadConfig } = require('../../../src/core/config/loader');
const { AdapterRegistry } = require('../../../src/core/utils/adapter-registry');

describe('BlobAdapter Contract', () => {
  let blob;
  let registry;

  beforeAll(async () => {
    const config = loadConfig();
    registry = new AdapterRegistry();

    const testAdapter = process.env.ADAPTER || config.docket.adapters.blob.default;
    const providerConfig = config.docket.adapters.blob.providers[testAdapter];

    blob = await registry.loadAdapter('blob', testAdapter, providerConfig);
  });

  describe('metadata', () => {
    it('has required metadata', () => {
      const metadata = blob.constructor.metadata;
      expect(metadata).toBeDefined();
      expect(metadata.name).toBeDefined();
      expect(metadata.version).toBeDefined();
      expect(metadata.capabilities).toBeInstanceOf(Array);
    });
  });

  describe('health', () => {
    it('returns health status', async () => {
      const health = await blob.health();
      expect(health).toHaveProperty('ok');
      expect(health).toHaveProperty('latency');
    });
  });

  describe('blob operations', () => {
    it('stores and retrieves a blob', async () => {
      const data = Buffer.from('test content');
      const putResult = await blob.put('test/file.txt', data, {
        contentType: 'text/plain',
        size: data.length
      });

      expect(putResult).toHaveProperty('key');
      expect(putResult.size).toBe(data.length);

      const getResult = await blob.get('test/file.txt');
      expect(getResult.data).toBeInstanceOf(Buffer);
      expect(getResult.data.toString()).toBe('test content');
      expect(getResult).toHaveProperty('metadata');
    });

    it('checks existence', async () => {
      const data = Buffer.from('existence check');
      await blob.put('test/exists.txt', data, { contentType: 'text/plain' });

      const exists = await blob.exists('test/exists.txt');
      expect(exists).toBe(true);

      const notExists = await blob.exists('test/does-not-exist.txt');
      expect(notExists).toBe(false);
    });

    it('deletes a blob', async () => {
      const data = Buffer.from('to delete');
      await blob.put('test/delete.txt', data, { contentType: 'text/plain' });

      const deleted = await blob.delete('test/delete.txt');
      expect(deleted).toBe(true);

      const exists = await blob.exists('test/delete.txt');
      expect(exists).toBe(false);
    });

    it('returns a url or null', async () => {
      const url = await blob.getUrl('test/file.txt', 3600);
      expect(url === null || typeof url === 'string').toBe(true);
    });
  });
});

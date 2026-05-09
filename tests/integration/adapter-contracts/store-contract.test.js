// tests/integration/adapter-contracts/store-contract.test.js
// Contract tests for ALL store adapters
// Run with: ADAPTER=sqlite npm test store-contract

const { loadConfig } = require('../../../src/core/config/loader');
const { AdapterRegistry } = require('../../../src/core/utils/adapter-registry');

describe('StoreAdapter Contract', () => {
  let store;
  let registry;

  beforeAll(async () => {
    const config = loadConfig();
    registry = new AdapterRegistry();

    const testAdapter = process.env.ADAPTER || config.cortex.adapters.store.default;
    const providerConfig = config.cortex.adapters.store.providers[testAdapter];

    store = await registry.loadAdapter('store', testAdapter, providerConfig);
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('metadata', () => {
    it('has required metadata', () => {
      const metadata = store.constructor.metadata;
      expect(metadata).toBeDefined();
      expect(metadata.name).toBeDefined();
      expect(metadata.version).toBeDefined();
      expect(metadata.capabilities).toBeInstanceOf(Array);
    });
  });

  describe('health', () => {
    it('returns health status', async () => {
      const health = await store.health();
      expect(health).toHaveProperty('ok');
      expect(health).toHaveProperty('latency');
      expect(typeof health.latency).toBe('number');
    });
  });

  describe('CRUD operations', () => {
    it('creates a memory', async () => {
      const memory = await store.createMemory({
        rawRef: 'test/raw.jpg',
        contentType: 'image/jpeg',
        extractedText: 'A red bicycle',
        metadata: { source: 'test' }
      });

      expect(memory.id).toMatch(/^mem_/);
      expect(memory.rawRef).toBe('test/raw.jpg');
      expect(memory.createdAt).toBeInstanceOf(Date);
    });

    it('retrieves a memory by id', async () => {
      const created = await store.createMemory({
        rawRef: 'test/raw2.jpg',
        contentType: 'image/jpeg'
      });

      const retrieved = await store.getMemory(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved.id).toBe(created.id);
    });

    it('returns null for non-existent memory', async () => {
      const result = await store.getMemory('mem_nonexistent');
      expect(result).toBeNull();
    });

    it('updates a memory', async () => {
      const created = await store.createMemory({
        rawRef: 'test/raw3.jpg',
        contentType: 'image/jpeg'
      });

      const updated = await store.updateMemory(created.id, {
        summary: 'Updated summary'
      });

      expect(updated.summary).toBe('Updated summary');
    });

    it('deletes a memory', async () => {
      const created = await store.createMemory({
        rawRef: 'test/raw4.jpg',
        contentType: 'image/jpeg'
      });

      const deleted = await store.deleteMemory(created.id);
      expect(deleted).toBe(true);

      const retrieved = await store.getMemory(created.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('vector search', () => {
    it('finds similar memories', async () => {
      // Create memories with embeddings
      const embedding1 = new Array(768).fill(0).map((_, i) => i === 0 ? 1 : 0);
      const embedding2 = new Array(768).fill(0).map((_, i) => i === 1 ? 1 : 0);

      await store.createMemory({
        rawRef: 'test/vec1.jpg',
        contentType: 'image/jpeg',
        extractedText: 'bicycle photo',
        embedding: embedding1
      });

      await store.createMemory({
        rawRef: 'test/vec2.jpg',
        contentType: 'image/jpeg',
        extractedText: 'motorcycle photo',
        embedding: embedding2
      });

      const results = await store.vectorSearch(embedding1, { limit: 5 });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].memory.extractedText).toBe('bicycle photo');
      expect(results[0]).toHaveProperty('score');
    });
  });
});

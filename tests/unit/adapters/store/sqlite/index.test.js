// tests/unit/adapters/store/sqlite/index.test.js

const { SQLiteStoreAdapter } = require('../../../../../src/adapters/store/sqlite');

describe('SQLiteStoreAdapter', () => {
  let adapter;

  beforeEach(async () => {
    adapter = new SQLiteStoreAdapter({ path: ':memory:', enableWAL: false, vectorDimensions: 4 });
    await adapter.initialize();
  });

  afterEach(() => {
    if (adapter.db) {
      adapter.db.close();
    }
  });

  it('uses default config values', () => {
    const a = new SQLiteStoreAdapter({});
    expect(a.dbPath).toBe('./data/docket.db');
    expect(a.enableWAL).toBe(true);
    expect(a.busyTimeout).toBe(5000);
    expect(a.vectorDimensions).toBe(768);
  });

  it('returns metadata', () => {
    expect(SQLiteStoreAdapter.metadata.name).toBe('sqlite-store');
    expect(SQLiteStoreAdapter.metadata.capabilities).toContain('vectorSearch');
  });

  it('creates a memory', async () => {
    const memory = await adapter.createMemory({
      rawRef: 'test/raw.jpg',
      contentType: 'image/jpeg',
      extractedText: 'A red bicycle',
      metadata: { source: 'test' }
    });

    expect(memory.id).toMatch(/^mem_/);
    expect(memory.rawRef).toBe('test/raw.jpg');
    expect(memory.contentType).toBe('image/jpeg');
    expect(memory.extractedText).toBe('A red bicycle');
    expect(memory.metadata).toEqual({ source: 'test' });
    expect(memory.createdAt).toBeInstanceOf(Date);
  });

  it('retrieves a memory by id', async () => {
    const created = await adapter.createMemory({
      rawRef: 'test/raw2.jpg',
      contentType: 'image/jpeg'
    });

    const retrieved = await adapter.getMemory(created.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved.id).toBe(created.id);
  });

  it('returns null for non-existent memory', async () => {
    expect(await adapter.getMemory('mem_nonexistent')).toBeNull();
  });

  it('updates a memory', async () => {
    const created = await adapter.createMemory({
      rawRef: 'test/raw3.jpg',
      contentType: 'image/jpeg'
    });

    const updated = await adapter.updateMemory(created.id, {
      summary: 'Updated summary'
    });

    expect(updated.summary).toBe('Updated summary');
    expect(updated.updatedAt).toBeInstanceOf(Date);
  });

  it('throws updating non-existent memory', async () => {
    await expect(adapter.updateMemory('mem_missing', { summary: 'x' })).rejects.toThrow('Memory not found');
  });

  it('deletes a memory', async () => {
    const created = await adapter.createMemory({
      rawRef: 'test/raw4.jpg',
      contentType: 'image/jpeg'
    });

    const deleted = await adapter.deleteMemory(created.id);
    expect(deleted).toBe(true);
    expect(await adapter.getMemory(created.id)).toBeNull();
  });

  it('returns false deleting non-existent memory', async () => {
    expect(await adapter.deleteMemory('mem_missing')).toBe(false);
  });

  it('queries memories with filters', async () => {
    await adapter.createMemory({ rawRef: 'a.jpg', contentType: 'image/jpeg' });
    await adapter.createMemory({ rawRef: 'b.png', contentType: 'image/png' });

    const { results, total } = await adapter.queryMemories(
      { contentType: 'image/jpeg' },
      { limit: 10 }
    );

    expect(total).toBe(1);
    expect(results[0].contentType).toBe('image/jpeg');
  });

  it('queries memories with metadata filters', async () => {
    await adapter.createMemory({
      rawRef: 'a.jpg',
      contentType: 'image/jpeg',
      metadata: { tag: 'foo' }
    });
    await adapter.createMemory({
      rawRef: 'b.jpg',
      contentType: 'image/jpeg',
      metadata: { tag: 'bar' }
    });

    const { results, total } = await adapter.queryMemories(
      { metadata: { tag: 'foo' } },
      { limit: 10 }
    );

    expect(total).toBe(1);
    expect(results[0].rawRef).toBe('a.jpg');
  });

  it('queries memories with date range', async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86400000);
    const tomorrow = new Date(now.getTime() + 86400000);

    await adapter.createMemory({ rawRef: 'a.jpg', contentType: 'image/jpeg' });

    const { total } = await adapter.queryMemories(
      { dateFrom: yesterday, dateTo: tomorrow },
      { limit: 10 }
    );
    expect(total).toBe(1);

    const { total: none } = await adapter.queryMemories(
      { dateFrom: yesterday, dateTo: yesterday },
      { limit: 10 }
    );
    expect(none).toBe(0);
  });

  it('ignores unsafe sort columns', async () => {
    await adapter.createMemory({ rawRef: 'a.jpg', contentType: 'image/jpeg' });
    await adapter.queryMemories({}, { sortBy: 'injected; DROP TABLE memories; --' });
    // If unsafe sort were used, the table would be dropped; verify it still exists
    const { total } = await adapter.queryMemories({}, { limit: 10 });
    expect(total).toBe(1);
  });

  it('performs vector search', async () => {
    const embedding1 = [1, 0, 0, 0];
    const embedding2 = [0, 1, 0, 0];

    await adapter.createMemory({
      rawRef: 'vec1.jpg',
      contentType: 'image/jpeg',
      extractedText: 'bicycle',
      embedding: embedding1
    });

    await adapter.createMemory({
      rawRef: 'vec2.jpg',
      contentType: 'image/jpeg',
      extractedText: 'motorcycle',
      embedding: embedding2
    });

    const results = await adapter.vectorSearch(embedding1, { limit: 5 });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].memory.extractedText).toBe('bicycle');
    expect(results[0]).toHaveProperty('score');
  });

  it('filters vector search by threshold', async () => {
    const embedding1 = [1, 0, 0, 0];
    const embedding2 = [0, 1, 0, 0];

    await adapter.createMemory({
      rawRef: 'vec1.jpg',
      contentType: 'image/jpeg',
      embedding: embedding1
    });
    await adapter.createMemory({
      rawRef: 'vec2.jpg',
      contentType: 'image/jpeg',
      embedding: embedding2
    });

    const results = await adapter.vectorSearch(embedding1, { limit: 5, threshold: 0.99 });
    expect(results.length).toBe(1);
  });

  it('throws on invalid vector search input', async () => {
    await expect(adapter.vectorSearch(null)).rejects.toThrow('Embedding must be an array');
  });

  it('updates embedding', async () => {
    const created = await adapter.createMemory({
      rawRef: 'vec.jpg',
      contentType: 'image/jpeg'
    });

    const updated = await adapter.updateMemory(created.id, {
      embedding: [1, 0, 0, 0]
    });

    expect(updated).toBeDefined();

    const results = await adapter.vectorSearch([1, 0, 0, 0], { limit: 5 });
    expect(results.length).toBe(1);
  });

  it('removes embedding when set to null', async () => {
    const created = await adapter.createMemory({
      rawRef: 'vec.jpg',
      contentType: 'image/jpeg',
      embedding: [1, 0, 0, 0]
    });

    await adapter.updateMemory(created.id, { embedding: null });
    const results = await adapter.vectorSearch([1, 0, 0, 0], { limit: 5 });
    expect(results.length).toBe(0);
  });

  it('creates and retrieves relations', async () => {
    const m1 = await adapter.createMemory({ rawRef: 'a.jpg', contentType: 'image/jpeg' });
    const m2 = await adapter.createMemory({ rawRef: 'b.jpg', contentType: 'image/jpeg' });

    const relation = await adapter.createRelation({
      sourceId: m1.id,
      targetId: m2.id,
      type: 'related',
      confidence: 0.9,
      metadata: { reason: 'test' }
    });

    expect(relation.sourceId).toBe(m1.id);
    expect(relation.targetId).toBe(m2.id);
    expect(relation.type).toBe('related');
    expect(relation.confidence).toBe(0.9);
    expect(relation.metadata).toEqual({ reason: 'test' });

    const edges = await adapter.getMemoryGraph(m1.id);
    expect(edges.length).toBe(1);
    expect(edges[0].sourceId).toBe(m1.id);
  });

  it('filters memory graph by type', async () => {
    const m1 = await adapter.createMemory({ rawRef: 'a.jpg', contentType: 'image/jpeg' });
    const m2 = await adapter.createMemory({ rawRef: 'b.jpg', contentType: 'image/jpeg' });
    await adapter.createRelation({ sourceId: m1.id, targetId: m2.id, type: 'related' });

    const edges = await adapter.getMemoryGraph(m1.id, { type: 'other' });
    expect(edges.length).toBe(0);
  });

  it('limits memory graph depth', async () => {
    const m1 = await adapter.createMemory({ rawRef: 'a.jpg', contentType: 'image/jpeg' });
    const m2 = await adapter.createMemory({ rawRef: 'b.jpg', contentType: 'image/jpeg' });
    const m3 = await adapter.createMemory({ rawRef: 'c.jpg', contentType: 'image/jpeg' });

    await adapter.createRelation({ sourceId: m1.id, targetId: m2.id, type: 'related' });
    await adapter.createRelation({ sourceId: m2.id, targetId: m3.id, type: 'related' });

    const edges = await adapter.getMemoryGraph(m1.id, { depth: 1 });
    expect(edges.length).toBe(1);
  });

  it('returns health ok', async () => {
    const health = await adapter.health();
    expect(health.ok).toBe(true);
  });

  it('returns migration version', async () => {
    const version = await adapter.getMigrationVersion();
    expect(typeof version).toBe('string');
  });

  it('runs a migration', async () => {
    await adapter.runMigration('CREATE TABLE IF NOT EXISTS _test_migrations (id TEXT PRIMARY KEY)');
    // If migration ran without error, the table exists
    const row = adapter.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='_test_migrations'").get();
    expect(row).toBeDefined();
  });
});

// tests/unit/adapters/store/cloudflare-d1/index.test.js

const { CloudflareD1StoreAdapter } = require('../../../../../src/adapters/store/cloudflare-d1');

describe('CloudflareD1StoreAdapter', () => {
  let adapter;
  let fetchMock;

  beforeEach(async () => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;

    adapter = new CloudflareD1StoreAdapter({
      accountId: 'acct',
      databaseId: 'db',
      apiToken: 'token'
    });

    // initialize makes schema calls; mock success for all
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, result: [{ results: [] }] })
    });
    await adapter.initialize();
    fetchMock.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('constructs with base url', () => {
    expect(adapter.baseUrl).toBe('https://api.cloudflare.com/client/v4/accounts/acct/d1/database/db');
  });

  it('returns metadata', () => {
    expect(CloudflareD1StoreAdapter.metadata.name).toBe('cloudflare-d1-store');
  });

  it('queries D1 and returns results', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        result: [{ results: [{ id: 'mem_1', raw_ref: 'r.jpg', content_type: 'image/jpeg' }] }]
      })
    });

    const rows = await adapter._query('SELECT * FROM memories WHERE id = ?', ['mem_1']);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/accounts/acct/d1/database/db/query',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token'
        },
        body: JSON.stringify({ sql: 'SELECT * FROM memories WHERE id = ?', params: ['mem_1'] })
      })
    );
    expect(rows[0].id).toBe('mem_1');
  });

  it('throws on D1 query failure', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false, errors: [{ message: 'bad sql' }] })
    });

    await expect(adapter._query('SELECT 1')).rejects.toThrow('bad sql');
  });

  it('creates a memory', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, result: [{ results: [] }] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          result: [{
            results: [{
              id: 'mem_1',
              raw_ref: 'r.jpg',
              content_type: 'image/jpeg',
              extracted_text: null,
              summary: null,
              metadata: null,
              parent_id: null,
              sector: null,
              salience: 1,
              valid_from: null,
              valid_to: null,
              access_policy: 'owner-only',
              created_at: '2024-01-01T00:00:00.000Z',
              updated_at: '2024-01-01T00:00:00.000Z'
            }]
          }]
        })
      });

    const memory = await adapter.createMemory({
      id: 'mem_1',
      rawRef: 'r.jpg',
      contentType: 'image/jpeg'
    });

    expect(memory.id).toBe('mem_1');
    expect(memory.rawRef).toBe('r.jpg');
  });

  it('inserts embedding when provided', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, result: [{ results: [] }] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          result: [{ results: [{
            id: 'mem_1', raw_ref: 'r.jpg', content_type: 'image/jpeg',
            extracted_text: null, summary: null, metadata: null,
            parent_id: null, sector: null, salience: 1,
            valid_from: null, valid_to: null, access_policy: 'owner-only',
            created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z'
          }] }]
        })
      });

    await adapter.createMemory({
      id: 'mem_1',
      rawRef: 'r.jpg',
      contentType: 'image/jpeg',
      embedding: [1, 0, 0]
    });

    const calls = fetchMock.mock.calls.map(c => c[0]);
    expect(calls.some(url => url.includes('/query'))).toBe(true);
  });

  it('gets a memory by id', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        result: [{ results: [{
          id: 'mem_1', raw_ref: 'r.jpg', content_type: 'image/jpeg',
          extracted_text: null, summary: null, metadata: null,
          parent_id: null, sector: null, salience: 1,
          valid_from: null, valid_to: null, access_policy: 'owner-only',
          created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z'
        }] }]
      })
    });

    const memory = await adapter.getMemory('mem_1');
    expect(memory).not.toBeNull();
    expect(memory.id).toBe('mem_1');
  });

  it('returns null for missing memory', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, result: [{ results: [] }] })
    });

    expect(await adapter.getMemory('mem_missing')).toBeNull();
  });

  it('queries memories', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, result: [{ results: [{ total: 1 }] }] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          result: [{ results: [{
            id: 'mem_1', raw_ref: 'r.jpg', content_type: 'image/jpeg',
            extracted_text: null, summary: null, metadata: null,
            parent_id: null, sector: null, salience: 1,
            valid_from: null, valid_to: null, access_policy: 'owner-only',
            created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z'
          }] }]
        })
      });

    const { results, total } = await adapter.queryMemories(
      { contentType: 'image/jpeg' },
      { limit: 5 }
    );
    expect(total).toBe(1);
    expect(results[0].contentType).toBe('image/jpeg');
  });

  it('ignores unsafe sort columns', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, result: [{ results: [{ total: 0 }] }] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, result: [{ results: [] }] })
      });

    await adapter.queryMemories({}, { sortBy: 'injected' });
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.sql).toContain('ORDER BY created_at');
  });

  it('performs vector search', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          result: [{ results: [
            { memory_id: 'mem_1', embedding: JSON.stringify([1, 0, 0]) },
            { memory_id: 'mem_2', embedding: JSON.stringify([0, 1, 0]) }
          ] }]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          result: [{ results: [{
            id: 'mem_1', raw_ref: 'a.jpg', content_type: 'image/jpeg',
            extracted_text: null, summary: null, metadata: null,
            parent_id: null, sector: null, salience: 1,
            valid_from: null, valid_to: null, access_policy: 'owner-only',
            created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z'
          }] }]
        })
      });

    const results = await adapter.vectorSearch([1, 0, 0], { limit: 5 });
    expect(results.length).toBe(1);
    expect(results[0].memory.id).toBe('mem_1');
    expect(results[0].score).toBe(1);
  });

  it('throws on invalid vector search input', async () => {
    await expect(adapter.vectorSearch(null)).rejects.toThrow('Embedding must be an array');
  });

  it('updates a memory', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          result: [{ results: [{
            id: 'mem_1', raw_ref: 'r.jpg', content_type: 'image/jpeg',
            extracted_text: null, summary: null, metadata: null,
            parent_id: null, sector: null, salience: 1,
            valid_from: null, valid_to: null, access_policy: 'owner-only',
            created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z'
          }] }]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, result: [{ results: [] }] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          result: [{ results: [{
            id: 'mem_1', raw_ref: 'r.jpg', content_type: 'image/jpeg',
            extracted_text: null, summary: 'updated', metadata: null,
            parent_id: null, sector: null, salience: 1,
            valid_from: null, valid_to: null, access_policy: 'owner-only',
            created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z'
          }] }]
        })
      });

    const updated = await adapter.updateMemory('mem_1', { summary: 'updated' });
    expect(updated.summary).toBe('updated');
  });

  it('throws updating non-existent memory', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, result: [{ results: [] }] })
    });

    await expect(adapter.updateMemory('mem_missing', { summary: 'x' })).rejects.toThrow('Memory not found');
  });

  it('deletes a memory', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          result: [{ results: [{
            id: 'mem_1', raw_ref: 'r.jpg', content_type: 'image/jpeg',
            extracted_text: null, summary: null, metadata: null,
            parent_id: null, sector: null, salience: 1,
            valid_from: null, valid_to: null, access_policy: 'owner-only',
            created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z'
          }] }]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, result: [{ results: [] }] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, result: [{ results: [] }] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, result: [{ results: [] }] })
      });

    const deleted = await adapter.deleteMemory('mem_1');
    expect(deleted).toBe(true);
  });

  it('returns false deleting non-existent memory', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, result: [{ results: [] }] })
    });

    expect(await adapter.deleteMemory('mem_missing')).toBe(false);
  });

  it('creates a relation', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, result: [{ results: [] }] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          result: [{ results: [{
            id: 1,
            source_id: 'mem_1',
            target_id: 'mem_2',
            type: 'related',
            confidence: 0.9,
            metadata: JSON.stringify({ reason: 'test' }),
            created_at: '2024-01-01T00:00:00.000Z'
          }] }]
        })
      });

    const relation = await adapter.createRelation({
      sourceId: 'mem_1',
      targetId: 'mem_2',
      type: 'related',
      confidence: 0.9,
      metadata: { reason: 'test' }
    });

    expect(relation.sourceId).toBe('mem_1');
    expect(relation.targetId).toBe('mem_2');
    expect(relation.metadata).toEqual({ reason: 'test' });
  });

  it('gets memory graph', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        result: [{ results: [{
          id: 1,
          source_id: 'mem_1',
          target_id: 'mem_2',
          type: 'related',
          confidence: 1,
          metadata: null,
          created_at: '2024-01-01T00:00:00.000Z'
        }] }]
      })
    });

    const edges = await adapter.getMemoryGraph('mem_1');
    expect(edges.length).toBe(1);
    expect(edges[0].sourceId).toBe('mem_1');
  });

  it('limits memory graph depth', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        result: [{ results: [{
          id: 1,
          source_id: 'mem_1',
          target_id: 'mem_2',
          type: 'related',
          confidence: 1,
          metadata: null,
          created_at: '2024-01-01T00:00:00.000Z'
        }] }]
      })
    });

    const edges = await adapter.getMemoryGraph('mem_1', { depth: 1 });
    expect(edges.length).toBe(1);
  });

  it('returns health ok', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, result: [{ results: [{ 1: 1 }] }] })
    });

    const health = await adapter.health();
    expect(health.ok).toBe(true);
  });

  it('returns health error on failure', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false, errors: [{ message: 'unauthorized' }] })
    });

    const health = await adapter.health();
    expect(health.ok).toBe(false);
    expect(health.error).toBe('unauthorized');
  });

  it('returns migration version', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, result: [{ results: [{ version: '0.1.0' }] }] })
    });

    expect(await adapter.getMigrationVersion()).toBe('0.1.0');
  });

  it('returns default migration version on error', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false, errors: [{ message: 'no table' }] })
    });

    expect(await adapter.getMigrationVersion()).toBe('0.0.0');
  });

  it('runs a migration', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, result: [{ results: [] }] })
    });

    await expect(adapter.runMigration('CREATE TABLE x (id TEXT)')).resolves.toBeUndefined();
  });
});

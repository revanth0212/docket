// tests/unit/core/modules/security/access-controlled-store.test.js

const { AccessControlledStore } = require('../../../../../src/core/modules/security/access-controlled-store');
const { ForbiddenError } = require('../../../../../src/core/errors');

describe('AccessControlledStore', () => {
  function createStore(principal = null, overrides = {}) {
    return new AccessControlledStore({
      createMemory: jest.fn().mockImplementation(m => Promise.resolve({ ...m, id: 'mem_abc' })),
      getMemory: jest.fn().mockResolvedValue(null),
      queryMemories: jest.fn().mockResolvedValue({ results: [], total: 0 }),
      vectorSearch: jest.fn().mockResolvedValue([]),
      updateMemory: jest.fn().mockImplementation((id, patch) => Promise.resolve({ id, ...patch })),
      deleteMemory: jest.fn().mockResolvedValue(true),
      createRelation: jest.fn().mockResolvedValue({ id: 1 }),
      getMemoryGraph: jest.fn().mockResolvedValue([]),
      health: jest.fn().mockResolvedValue({ ok: true }),
      getMigrationVersion: jest.fn().mockResolvedValue('1'),
      runMigration: jest.fn().mockResolvedValue(undefined),
      ...overrides
    }, {
      defaultPolicy: 'owner-only',
      policies: {
        team: { readers: ['user:alice', 'user:bob'], writers: ['user:alice'] }
      }
    }, principal);
  }

  function memory(overrides = {}) {
    return {
      id: 'mem_abc',
      owner: 'user:alice',
      accessPolicy: 'owner-only',
      readers: [],
      writers: [],
      ...overrides
    };
  }

  describe('createMemory', () => {
    it('assigns current principal as owner', async () => {
      const store = createStore('user:alice');
      await store.createMemory({ contentType: 'text/plain' });
      expect(store.storeAdapter.createMemory).toHaveBeenCalledWith(
        expect.objectContaining({ owner: 'user:alice', accessPolicy: 'owner-only' })
      );
    });

    it('preserves provided owner and policy', async () => {
      const store = createStore('user:alice');
      await store.createMemory({ owner: 'user:bob', accessPolicy: 'public', contentType: 'text/plain' });
      expect(store.storeAdapter.createMemory).toHaveBeenCalledWith(
        expect.objectContaining({ owner: 'user:bob', accessPolicy: 'public' })
      );
    });
  });

  describe('getMemory', () => {
    it('allows owner to read', async () => {
      const store = createStore('user:alice', {
        getMemory: jest.fn().mockResolvedValue(memory())
      });
      const result = await store.getMemory('mem_abc');
      expect(result).not.toBeNull();
    });

    it('denies non-owner for owner-only policy', async () => {
      const store = createStore('user:bob', {
        getMemory: jest.fn().mockResolvedValue(memory())
      });
      const result = await store.getMemory('mem_abc');
      expect(result).toBeNull();
    });

    it('allows readers to read', async () => {
      const store = createStore('user:bob', {
        getMemory: jest.fn().mockResolvedValue(memory({ accessPolicy: 'readers', readers: ['user:bob'] }))
      });
      const result = await store.getMemory('mem_abc');
      expect(result).not.toBeNull();
    });

    it('allows anyone to read public memory', async () => {
      const store = createStore('user:stranger', {
        getMemory: jest.fn().mockResolvedValue(memory({ accessPolicy: 'public' }))
      });
      const result = await store.getMemory('mem_abc');
      expect(result).not.toBeNull();
    });

    it('allows named policy readers', async () => {
      const store = createStore('user:bob', {
        getMemory: jest.fn().mockResolvedValue(memory({ accessPolicy: 'team' }))
      });
      const result = await store.getMemory('mem_abc');
      expect(result).not.toBeNull();
    });
  });

  describe('queryMemories', () => {
    it('filters out inaccessible memories', async () => {
      const store = createStore('user:alice', {
        queryMemories: jest.fn().mockResolvedValue({
          results: [
            memory({ id: 'mem_1', owner: 'user:alice' }),
            memory({ id: 'mem_2', owner: 'user:bob' })
          ],
          total: 2
        })
      });
      const result = await store.queryMemories();
      expect(result.results.length).toBe(1);
      expect(result.results[0].id).toBe('mem_1');
    });
  });

  describe('vectorSearch', () => {
    it('filters results by read access', async () => {
      const store = createStore('user:alice', {
        vectorSearch: jest.fn().mockResolvedValue([
          { memory: memory({ id: 'mem_1', owner: 'user:alice' }), score: 0.9 },
          { memory: memory({ id: 'mem_2', owner: 'user:bob' }), score: 0.8 }
        ])
      });
      const result = await store.vectorSearch([0.1]);
      expect(result.length).toBe(1);
    });
  });

  describe('updateMemory', () => {
    it('allows owner to update', async () => {
      const store = createStore('user:alice', {
        getMemory: jest.fn().mockResolvedValue(memory())
      });
      await store.updateMemory('mem_abc', { summary: 'updated' });
      expect(store.storeAdapter.updateMemory).toHaveBeenCalled();
    });

    it('allows writers to update', async () => {
      const store = createStore('user:bob', {
        getMemory: jest.fn().mockResolvedValue(memory({ accessPolicy: 'writers', writers: ['user:bob'] }))
      });
      await store.updateMemory('mem_abc', { summary: 'updated' });
      expect(store.storeAdapter.updateMemory).toHaveBeenCalled();
    });

    it('denies readers to update', async () => {
      const store = createStore('user:bob', {
        getMemory: jest.fn().mockResolvedValue(memory({ readers: ['user:bob'] }))
      });
      await expect(store.updateMemory('mem_abc', {})).rejects.toThrow(ForbiddenError);
    });

    it('delegates when memory not found', async () => {
      const store = createStore('user:alice');
      await store.updateMemory('mem_missing', {});
      expect(store.storeAdapter.updateMemory).toHaveBeenCalledWith('mem_missing', {});
    });
  });

  describe('deleteMemory', () => {
    it('allows owner to delete', async () => {
      const store = createStore('user:alice', {
        getMemory: jest.fn().mockResolvedValue(memory())
      });
      const result = await store.deleteMemory('mem_abc');
      expect(result).toBe(true);
    });

    it('denies non-owner', async () => {
      const store = createStore('user:bob', {
        getMemory: jest.fn().mockResolvedValue(memory())
      });
      await expect(store.deleteMemory('mem_abc')).rejects.toThrow(ForbiddenError);
    });
  });

  describe('createRelation', () => {
    it('allows when principal can write both memories', async () => {
      const store = createStore('user:alice', {
        getMemory: jest.fn().mockImplementation(id => ({
          mem_a: memory({ id: 'mem_a', owner: 'user:alice' }),
          mem_b: memory({ id: 'mem_b', owner: 'user:alice' })
        }[id]))
      });
      await store.createRelation({ sourceId: 'mem_a', targetId: 'mem_b', type: 'related' });
      expect(store.storeAdapter.createRelation).toHaveBeenCalled();
    });

    it('denies when principal cannot write target', async () => {
      const store = createStore('user:alice', {
        getMemory: jest.fn().mockImplementation(id => ({
          mem_a: memory({ id: 'mem_a', owner: 'user:alice' }),
          mem_b: memory({ id: 'mem_b', owner: 'user:bob' })
        }[id]))
      });
      await expect(store.createRelation({ sourceId: 'mem_a', targetId: 'mem_b', type: 'related' }))
        .rejects.toThrow(ForbiddenError);
    });
  });

  describe('forPrincipal', () => {
    it('creates a new wrapper bound to the principal', () => {
      const store = createStore(null);
      const aliceStore = store.forPrincipal('user:alice');
      expect(aliceStore.principal).toBe('user:alice');
      expect(aliceStore.storeAdapter).toBe(store.storeAdapter);
    });
  });

  describe('passthrough methods', () => {
    it('passes health to underlying adapter', async () => {
      const store = createStore();
      const result = await store.health();
      expect(result.ok).toBe(true);
    });
  });
});

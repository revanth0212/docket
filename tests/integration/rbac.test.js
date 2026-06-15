// tests/integration/rbac.test.js
// End-to-end RBAC integration test

const request = require('supertest');
const { buildDataPlane } = require('../../src/data-plane/app');

describe('RBAC Integration', () => {
  function createAdapters(memories = []) {
    return {
      llm: {
        chat: jest.fn().mockResolvedValue({ content: 'Summary' })
      },
      embedder: {
        embed: jest.fn().mockResolvedValue([0.1, 0.2])
      },
      store: {
        createMemory: jest.fn().mockImplementation(data => Promise.resolve({
          id: `mem_${Math.random().toString(36).slice(2, 8)}`,
          ...data,
          createdAt: new Date()
        })),
        getMemory: jest.fn().mockImplementation(id => Promise.resolve(memories.find(m => m.id === id) || null)),
        updateMemory: jest.fn().mockImplementation((id, patch) => {
          const memory = memories.find(m => m.id === id);
          return Promise.resolve({ ...memory, ...patch });
        }),
        deleteMemory: jest.fn().mockResolvedValue(true),
        queryMemories: jest.fn().mockResolvedValue({ results: memories, total: memories.length }),
        vectorSearch: jest.fn().mockImplementation(() => Promise.resolve(
          memories.map(m => ({ memory: m, score: 0.9 }))
        )),
        getMemoryGraph: jest.fn().mockResolvedValue([]),
        createRelation: jest.fn(),
        health: jest.fn().mockResolvedValue({ ok: true })
      },
      blob: {
        put: jest.fn().mockResolvedValue({ key: 'blob:key' }),
        get: jest.fn(),
        delete: jest.fn()
      },
      queue: {
        enqueue: jest.fn()
      }
    };
  }

  function createConfig() {
    return {
      docket: {
        memory: {
          mode: 'flat',
          sectors: { enabled: false },
          decay: { enabled: false },
          temporal: { enabled: false },
          rbac: {
            enabled: true,
            authStrategy: 'header',
            principalHeader: 'X-Principal',
            defaultPolicy: 'owner-only'
          }
        }
      }
    };
  }

  it('sets owner on created memory', async () => {
    const adapters = createAdapters();
    const { createCoreServices } = require('../../src/core/modules/service-factory');
    const services = createCoreServices(adapters, createConfig());
    const app = buildDataPlane({ logger: false, adapters, services, config: createConfig() });
    await app.ready();

    await request(app.server)
      .post('/memories')
      .set('X-Principal', 'user:alice')
      .send({ rawRef: 'blob:1', contentType: 'text/plain' })
      .expect(200);

    expect(adapters.store.createMemory).toHaveBeenCalledWith(
      expect.objectContaining({ owner: 'user:alice' })
    );

    await app.close();
  });

  it('allows owner to read their memory', async () => {
    const memories = [
      { id: 'mem_a', rawRef: 'blob:1', contentType: 'text/plain', owner: 'user:alice', accessPolicy: 'owner-only', createdAt: new Date() }
    ];
    const adapters = createAdapters(memories);
    const { createCoreServices } = require('../../src/core/modules/service-factory');
    const services = createCoreServices(adapters, createConfig());
    const app = buildDataPlane({ logger: false, adapters, services, config: createConfig() });
    await app.ready();

    const res = await request(app.server)
      .get('/memories/mem_a')
      .set('X-Principal', 'user:alice')
      .expect(200);

    expect(res.body.id).toBe('mem_a');

    await app.close();
  });

  it('denies non-owner read on owner-only memory', async () => {
    const memories = [
      { id: 'mem_a', rawRef: 'blob:1', contentType: 'text/plain', owner: 'user:alice', accessPolicy: 'owner-only', createdAt: new Date() }
    ];
    const adapters = createAdapters(memories);
    const { createCoreServices } = require('../../src/core/modules/service-factory');
    const services = createCoreServices(adapters, createConfig());
    const app = buildDataPlane({ logger: false, adapters, services, config: createConfig() });
    await app.ready();

    await request(app.server)
      .get('/memories/mem_a')
      .set('X-Principal', 'user:bob')
      .expect(404);

    await app.close();
  });

  it('filters query results by ownership', async () => {
    const memories = [
      { id: 'mem_a', summary: 'Alice memory', owner: 'user:alice', accessPolicy: 'owner-only', sector: 'semantic', salience: 1.0, createdAt: new Date() },
      { id: 'mem_b', summary: 'Bob memory', owner: 'user:bob', accessPolicy: 'owner-only', sector: 'semantic', salience: 1.0, createdAt: new Date() }
    ];
    const adapters = createAdapters(memories);
    const { createCoreServices } = require('../../src/core/modules/service-factory');
    const services = createCoreServices(adapters, createConfig());
    const app = buildDataPlane({ logger: false, adapters, services, config: createConfig() });
    await app.ready();

    const res = await request(app.server)
      .post('/query')
      .set('X-Principal', 'user:alice')
      .send({ question: 'memory' })
      .expect(200);

    expect(res.body.sources.length).toBe(1);
    expect(res.body.sources[0].memoryId).toBe('mem_a');

    await app.close();
  });

  it('allows readers to read shared memory', async () => {
    const memories = [
      { id: 'mem_a', summary: 'Shared memory', owner: 'user:alice', readers: ['user:bob'], accessPolicy: 'shared', sector: 'semantic', salience: 1.0, createdAt: new Date() }
    ];
    const adapters = createAdapters(memories);
    const { createCoreServices } = require('../../src/core/modules/service-factory');
    const services = createCoreServices(adapters, createConfig());
    const app = buildDataPlane({ logger: false, adapters, services, config: createConfig() });
    await app.ready();

    const res = await request(app.server)
      .get('/memories/mem_a')
      .set('X-Principal', 'user:bob')
      .expect(200);

    expect(res.body.id).toBe('mem_a');

    await app.close();
  });
});

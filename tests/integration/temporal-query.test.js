// tests/integration/temporal-query.test.js
// End-to-end temporal query integration test

const request = require('supertest');
const { buildDataPlane } = require('../../src/data-plane/app');

describe('Temporal Query Integration', () => {
  function createAdapters(memories = []) {
    return {
      llm: {
        chat: jest.fn().mockResolvedValue({ content: 'Answer based on memories.' })
      },
      embedder: {
        embed: jest.fn().mockResolvedValue([0.9, 0.1])
      },
      store: {
        createMemory: jest.fn().mockImplementation(data => Promise.resolve({
          id: `mem_${Math.random().toString(36).slice(2, 8)}`,
          ...data,
          createdAt: new Date()
        })),
        getMemory: jest.fn().mockImplementation(id => Promise.resolve(memories.find(m => m.id === id) || null)),
        updateMemory: jest.fn(),
        deleteMemory: jest.fn(),
        queryMemories: jest.fn().mockResolvedValue({ results: memories, total: memories.length }),
        vectorSearch: jest.fn().mockImplementation(() => Promise.resolve(
          memories.map(m => ({ memory: m, score: 0.9 }))
        )),
        getMemoryGraph: jest.fn().mockResolvedValue([]),
        createRelation: jest.fn(),
        health: jest.fn().mockResolvedValue({ ok: true })
      },
      blob: {
        put: jest.fn(),
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
          mode: 'rich',
          sectors: { enabled: false },
          decay: { enabled: false },
          temporal: { enabled: true },
          rbac: { enabled: false }
        }
      }
    };
  }

  it('filters query results by validity window', async () => {
    const memories = [
      {
        id: 'mem_past',
        summary: 'Past event',
        sector: 'semantic',
        salience: 1.0,
        validFrom: new Date('2024-01-01'),
        validTo: new Date('2024-02-01'),
        createdAt: new Date('2024-01-15')
      },
      {
        id: 'mem_present',
        summary: 'Current event',
        sector: 'semantic',
        salience: 1.0,
        validFrom: new Date('2024-06-01'),
        validTo: new Date('2025-06-01'),
        createdAt: new Date('2024-07-01')
      }
    ];
    const adapters = createAdapters(memories);
    const { createCoreServices } = require('../../src/core/modules/service-factory');
    const services = createCoreServices(adapters, createConfig());
    const app = buildDataPlane({ logger: false, adapters, services, config: createConfig() });
    await app.ready();

    const res = await request(app.server)
      .post('/query')
      .send({ question: 'event', temporal: { atDate: '2024-07-15T00:00:00Z' } })
      .expect(200);

    expect(res.body.sources.length).toBe(1);
    expect(res.body.sources[0].memoryId).toBe('mem_present');

    await app.close();
  });

  it('returns empty sources when no memories are valid at date', async () => {
    const memories = [
      {
        id: 'mem_old',
        summary: 'Old event',
        sector: 'semantic',
        salience: 1.0,
        validFrom: new Date('2022-01-01'),
        validTo: new Date('2022-12-31'),
        createdAt: new Date('2022-06-01')
      }
    ];
    const adapters = createAdapters(memories);
    const { createCoreServices } = require('../../src/core/modules/service-factory');
    const services = createCoreServices(adapters, createConfig());
    const app = buildDataPlane({ logger: false, adapters, services, config: createConfig() });
    await app.ready();

    const res = await request(app.server)
      .post('/query')
      .send({ question: 'event', temporal: { atDate: '2024-01-01T00:00:00Z' } })
      .expect(200);

    expect(res.body.sources.length).toBe(0);

    await app.close();
  });
});

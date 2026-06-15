// tests/integration/query-pipeline.test.js
// End-to-end query pipeline test

const request = require('supertest');
const { buildDataPlane } = require('../../src/data-plane/app');

describe('Query Pipeline Integration', () => {
  function createAdapters(memories = []) {
    return {
      llm: {
        chat: jest.fn().mockResolvedValue({ content: 'The answer is bicycles.' })
      },
      embedder: {
        embed: jest.fn().mockResolvedValue([0.9, 0.1, 0.0])
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
          memories.map((m, i) => ({ memory: m, score: 1.0 - i * 0.1 }))
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
          mode: 'flat',
          sectors: { enabled: false },
          decay: { enabled: false },
          temporal: { enabled: false },
          rbac: { enabled: false }
        }
      }
    };
  }

  it('returns answer and sources for a question', async () => {
    const memories = [
      { id: 'mem_a', summary: 'A red bicycle', extractedText: 'A red bicycle', sector: 'semantic', salience: 1.0, createdAt: new Date() }
    ];
    const adapters = createAdapters(memories);
    const { createCoreServices } = require('../../src/core/modules/service-factory');
    const services = createCoreServices(adapters, createConfig());
    const app = buildDataPlane({ logger: false, adapters, services, config: createConfig() });
    await app.ready();

    const res = await request(app.server)
      .post('/query')
      .send({ question: 'What did I see?' })
      .expect(200);

    expect(res.body.answer).toContain('bicycles');
    expect(res.body.sources.length).toBeGreaterThan(0);

    await app.close();
  });

  it('filters by sector', async () => {
    const memories = [
      { id: 'mem_a', summary: 'Birthday party', sector: 'episodic', salience: 1.0, createdAt: new Date() },
      { id: 'mem_b', summary: 'A red bicycle', sector: 'semantic', salience: 1.0, createdAt: new Date() }
    ];
    const adapters = createAdapters(memories);
    const { createCoreServices } = require('../../src/core/modules/service-factory');
    const services = createCoreServices(adapters, createConfig());
    const app = buildDataPlane({ logger: false, adapters, services, config: createConfig() });
    await app.ready();

    const res = await request(app.server)
      .post('/query')
      .send({ question: 'What did I see?', sectors: ['semantic'] })
      .expect(200);

    expect(res.body.sources.every(s => s.sector === 'semantic')).toBe(true);

    await app.close();
  });

  it('includes trace when requested', async () => {
    const memories = [
      { id: 'mem_a', summary: 'A red bicycle', sector: 'semantic', salience: 1.0, createdAt: new Date() }
    ];
    const adapters = createAdapters(memories);
    const { createCoreServices } = require('../../src/core/modules/service-factory');
    const services = createCoreServices(adapters, createConfig());
    const app = buildDataPlane({ logger: false, adapters, services, config: createConfig() });
    await app.ready();

    const res = await request(app.server)
      .post('/query')
      .send({ question: 'What?', includeTrace: true })
      .expect(200);

    expect(res.body.trace).toBeDefined();
    expect(res.body.trace.length).toBeGreaterThan(0);

    await app.close();
  });
});

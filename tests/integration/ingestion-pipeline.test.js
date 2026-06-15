// tests/integration/ingestion-pipeline.test.js
// End-to-end ingestion pipeline test

const request = require('supertest');
const { buildDataPlane } = require('../../src/data-plane/app');

describe('Ingestion Pipeline Integration', () => {
  function createAdapters() {
    return {
      llm: {
        chat: jest.fn().mockResolvedValue({ content: 'A concise summary.' })
      },
      embedder: {
        embed: jest.fn().mockResolvedValue([0.1, 0.2, 0.3])
      },
      store: {
        createMemory: jest.fn().mockImplementation(data => Promise.resolve({
          id: 'mem_test123',
          ...data,
          createdAt: new Date()
        })),
        getMemory: jest.fn().mockResolvedValue(null),
        updateMemory: jest.fn(),
        deleteMemory: jest.fn(),
        queryMemories: jest.fn().mockResolvedValue({ results: [], total: 0 }),
        vectorSearch: jest.fn().mockResolvedValue([]),
        getMemoryGraph: jest.fn().mockResolvedValue([]),
        createRelation: jest.fn(),
        health: jest.fn().mockResolvedValue({ ok: true })
      },
      blob: {
        put: jest.fn().mockResolvedValue({ key: 'blob:mem_test123/raw.txt' }),
        get: jest.fn(),
        delete: jest.fn()
      },
      queue: {
        enqueue: jest.fn().mockResolvedValue({ id: 'job_123' })
      }
    };
  }

  function createConfig(overrides = {}) {
    return {
      docket: {
        memory: {
          mode: 'flat',
          sectors: { enabled: false },
          decay: { enabled: false },
          temporal: { enabled: false },
          rbac: { enabled: false }
        },
        ...overrides
      }
    };
  }

  it('ingests text and returns completed status', async () => {
    const adapters = createAdapters();
    const { createCoreServices } = require('../../src/core/modules/service-factory');
    const services = createCoreServices(adapters, createConfig());
    const app = buildDataPlane({ logger: false, adapters, services, config: createConfig() });
    await app.ready();

    const res = await request(app.server)
      .post('/ingest')
      .send({ text: 'hello world', contentType: 'text/plain' })
      .expect(201);

    expect(res.body.status).toBe('completed');
    expect(res.body.summary).toBe('A concise summary.');

    await app.close();
  });

  it('ingests multipart file upload', async () => {
    const adapters = createAdapters();
    const { createCoreServices } = require('../../src/core/modules/service-factory');
    const services = createCoreServices(adapters, createConfig());
    const app = buildDataPlane({ logger: false, adapters, services, config: createConfig() });
    await app.ready();

    const res = await request(app.server)
      .post('/ingest')
      .attach('file', Buffer.from('file content'), 'test.txt')
      .field('async', 'false')
      .expect(201);

    expect(res.body.status).toBe('completed');
    expect(adapters.blob.put).toHaveBeenCalled();

    await app.close();
  });

  it('enqueues async ingestion job', async () => {
    const adapters = createAdapters();
    const { createCoreServices } = require('../../src/core/modules/service-factory');
    const services = createCoreServices(adapters, createConfig());
    const app = buildDataPlane({ logger: false, adapters, services, config: createConfig() });
    await app.ready();

    const res = await request(app.server)
      .post('/ingest')
      .send({ text: 'async text', contentType: 'text/plain', async: true })
      .expect(202);

    expect(res.body.status).toBe('pending');
    expect(res.body.jobId).toBe('job_123');

    await app.close();
  });
});

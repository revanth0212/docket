// tests/unit/platform/unified.test.js

const request = require('supertest');
const { buildUnifiedApp } = require('../../../src/platform/unified/app');

describe('Unified Platform', () => {
  function createServices() {
    return {
      ingestion: {
        ingest: jest.fn().mockResolvedValue({ id: 'mem_abc', status: 'completed' })
      },
      query: {
        query: jest.fn().mockResolvedValue({ answer: '', sources: [] })
      },
      memory: {
        getById: jest.fn().mockResolvedValue({ id: 'mem_abc', summary: 'test' }),
        create: jest.fn().mockResolvedValue({ id: 'mem_abc' }),
        update: jest.fn().mockResolvedValue({ id: 'mem_abc' }),
        delete: jest.fn().mockResolvedValue(true),
        getRelations: jest.fn().mockResolvedValue([]),
        createRelation: jest.fn().mockResolvedValue({ id: 1 })
      },
      decayEngine: {
        runDecayCycle: jest.fn().mockResolvedValue({ totalUpdated: 0, forgotten: 0 })
      }
    };
  }

  let app;

  beforeEach(async () => {
    app = buildUnifiedApp({ logger: false, services: createServices() });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('mounts data plane routes at root', async () => {
    const response = await request(app.server)
      .get('/health')
      .expect(200);

    expect(response.body).toMatchObject({ status: 'ok', plane: 'data' });
  });

  it('mounts control plane routes under /admin', async () => {
    const response = await request(app.server)
      .get('/admin/health')
      .expect(200);

    expect(response.body).toMatchObject({ status: 'ok', plane: 'control' });
  });

  it('does not mount control routes at root', async () => {
    // /admin/health should NOT be at /health (data health is there)
    const response = await request(app.server)
      .get('/health')
      .expect(200);

    expect(response.body.plane).toBe('data');
  });

  it('handles data plane ingest at root', async () => {
    const response = await request(app.server)
      .post('/ingest')
      .send({ text: 'test', contentType: 'text/plain' })
      .expect(201);

    expect(response.body).toHaveProperty('status', 'completed');
  });

  it('handles control plane plugin list under /admin', async () => {
    const response = await request(app.server)
      .get('/admin/plugins')
      .expect(200);

    expect(response.body).toHaveProperty('plugins');
  });

  it('returns 404 for unknown routes', async () => {
    await request(app.server)
      .get('/not-a-real-route')
      .expect(404);
  });
});

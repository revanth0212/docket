// tests/unit/data-plane/routes.test.js

const request = require('supertest');
const { buildDataPlane } = require('../../../src/data-plane/app');

describe('Data Plane Routes', () => {
  function createServices(overrides = {}) {
    return {
      ingestion: {
        ingest: jest.fn().mockResolvedValue({ id: 'mem_abc', status: 'completed' })
      },
      query: {
        query: jest.fn().mockResolvedValue({
          answer: 'test answer',
          sources: [{ memoryId: 'mem_abc', summary: 'test', score: 0.9 }]
        })
      },
      memory: {
        getById: jest.fn().mockResolvedValue({ id: 'mem_abc123', summary: 'test' }),
        create: jest.fn().mockResolvedValue({ id: 'mem_abc123', status: 'created' }),
        update: jest.fn().mockResolvedValue({ id: 'mem_abc123', summary: 'updated' }),
        delete: jest.fn().mockResolvedValue(true),
        getRelations: jest.fn().mockResolvedValue([{ source: 'a', target: 'b' }]),
        createRelation: jest.fn().mockResolvedValue({ id: 1, sourceId: 'mem_abc123', targetId: 'mem_def' })
      },
      ...overrides
    };
  }

  let app;

  beforeEach(async () => {
    app = buildDataPlane({ logger: false, services: createServices() });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('returns data plane health', async () => {
      const response = await request(app.server)
        .get('/health')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({ status: 'ok', plane: 'data' });
    });
  });

  describe('POST /ingest', () => {
    it('accepts ingest requests', async () => {
      const response = await request(app.server)
        .post('/ingest')
        .send({ text: 'hello world', contentType: 'text/plain', async: false })
        .expect(201)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status', 'completed');
      expect(response.body).toHaveProperty('id');
    });
  });

  describe('POST /query', () => {
    it('accepts query requests', async () => {
      const response = await request(app.server)
        .post('/query')
        .send({ question: 'What did I do yesterday?' })
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('answer');
      expect(response.body).toHaveProperty('sources');
    });
  });

  describe('GET /memories/:id', () => {
    it('returns memory from service', async () => {
      const response = await request(app.server)
        .get('/memories/mem_abc123')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('id', 'mem_abc123');
    });
  });

  describe('POST /memories', () => {
    it('accepts create requests', async () => {
      const response = await request(app.server)
        .post('/memories')
        .send({ contentType: 'image/jpeg', extractedText: 'A photo' })
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('id');
    });
  });

  describe('PATCH /memories/:id', () => {
    it('accepts update requests', async () => {
      const response = await request(app.server)
        .patch('/memories/mem_abc123')
        .send({ summary: 'updated' })
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('id', 'mem_abc123');
    });
  });

  describe('DELETE /memories/:id', () => {
    it('accepts delete requests', async () => {
      const response = await request(app.server)
        .delete('/memories/mem_abc123')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('deleted', true);
    });
  });

  describe('GET /memories/:id/relations', () => {
    it('returns relations stub', async () => {
      const response = await request(app.server)
        .get('/memories/mem_abc123/relations')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('memoryId', 'mem_abc123');
      expect(response.body).toHaveProperty('edges');
    });
  });
});

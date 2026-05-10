// tests/unit/data-plane/routes.test.js

const request = require('supertest');
const { buildDataPlane } = require('../../../src/data-plane/app');

describe('Data Plane Routes', () => {
  let app;

  beforeEach(async () => {
    app = buildDataPlane({ logger: false });
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
        .send({ text: 'hello world', async: false })
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status', 'pending');
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
      expect(response.body).toHaveProperty('trace');
    });
  });

  describe('GET /memories/:id', () => {
    it('returns memory stub', async () => {
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
        .send({ rawRef: 'test.jpg', contentType: 'image/jpeg' })
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status', 'pending');
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

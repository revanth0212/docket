// tests/unit/data-plane/app.test.js

const request = require('supertest');
const { buildDataPlane, startDataPlane } = require('../../../src/data-plane/app');

describe('Data Plane', () => {
  describe('registerDataPlaneRoutes', () => {
    it('registers all routes', async () => {
      const app = buildDataPlane({ logger: false });
      await app.ready();

      expect(typeof app.get).toBe('function');

      await app.close();
    });
  });

  describe('GET /health', () => {
    it('returns basic health without adapters', async () => {
      const app = buildDataPlane({ logger: false });
      await app.ready();

      const res = await request(app.server).get('/health').expect(200);
      expect(res.body).toEqual({ status: 'ok', plane: 'data' });

      await app.close();
    });

    it('returns health with store adapter', async () => {
      const app = buildDataPlane({
        logger: false,
        adapters: {
          store: {
            health: async () => ({ ok: true })
          }
        }
      });
      await app.ready();

      const res = await request(app.server).get('/health').expect(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.adapters.store).toEqual({ ok: true });

      await app.close();
    });
  });

  describe('POST /ingest', () => {
    it('returns pending stub', async () => {
      const app = buildDataPlane({ logger: false });
      await app.ready();

      const res = await request(app.server).post('/ingest').expect(200);
      expect(res.body.status).toBe('pending');

      await app.close();
    });
  });

  describe('POST /query', () => {
    it('returns empty answer stub', async () => {
      const app = buildDataPlane({ logger: false });
      await app.ready();

      const res = await request(app.server).post('/query').expect(200);
      expect(res.body).toEqual({ answer: '', sources: [], trace: [] });

      await app.close();
    });
  });

  describe('GET /memories/:id', () => {
    it('returns memory stub without adapter', async () => {
      const app = buildDataPlane({ logger: false });
      await app.ready();

      const res = await request(app.server).get('/memories/abc').expect(200);
      expect(res.body).toEqual({ id: 'abc' });

      await app.close();
    });

    it('returns memory from store adapter', async () => {
      const app = buildDataPlane({
        logger: false,
        adapters: {
          store: {
            getMemory: async (id) => ({ id, summary: 'test' })
          }
        }
      });
      await app.ready();

      const res = await request(app.server).get('/memories/abc').expect(200);
      expect(res.body).toEqual({ id: 'abc', summary: 'test' });

      await app.close();
    });

    it('returns not_found when store returns null', async () => {
      const app = buildDataPlane({
        logger: false,
        adapters: {
          store: {
            getMemory: async () => null
          }
        }
      });
      await app.ready();

      const res = await request(app.server).get('/memories/abc').expect(200);
      expect(res.body.error).toBe('not_found');

      await app.close();
    });
  });

  describe('POST /memories', () => {
    it('returns pending stub', async () => {
      const app = buildDataPlane({ logger: false });
      await app.ready();

      const res = await request(app.server).post('/memories').expect(200);
      expect(res.body.status).toBe('pending');

      await app.close();
    });
  });

  describe('PATCH /memories/:id', () => {
    it('returns id stub', async () => {
      const app = buildDataPlane({ logger: false });
      await app.ready();

      const res = await request(app.server).patch('/memories/abc').expect(200);
      expect(res.body.id).toBe('abc');

      await app.close();
    });
  });

  describe('DELETE /memories/:id', () => {
    it('returns deleted true', async () => {
      const app = buildDataPlane({ logger: false });
      await app.ready();

      const res = await request(app.server).delete('/memories/abc').expect(200);
      expect(res.body.deleted).toBe(true);

      await app.close();
    });
  });

  describe('GET /memories/:id/relations', () => {
    it('returns empty edges without adapter', async () => {
      const app = buildDataPlane({ logger: false });
      await app.ready();

      const res = await request(app.server).get('/memories/abc/relations').expect(200);
      expect(res.body).toEqual({ memoryId: 'abc', edges: [] });

      await app.close();
    });

    it('returns edges from store adapter', async () => {
      const app = buildDataPlane({
        logger: false,
        adapters: {
          store: {
            getMemoryGraph: async () => [{ source: 'a', target: 'b' }]
          }
        }
      });
      await app.ready();

      const res = await request(app.server).get('/memories/abc/relations').expect(200);
      expect(res.body.edges).toEqual([{ source: 'a', target: 'b' }]);

      await app.close();
    });
  });

  describe('buildDataPlane', () => {
    it('returns a Fastify instance', async () => {
      const app = buildDataPlane({ logger: false });
      await app.ready();
      expect(app).toBeDefined();
      expect(typeof app.get).toBe('function');
      await app.close();
    });

    it('uses default options', async () => {
      const app = buildDataPlane();
      await app.ready();
      expect(app).toBeDefined();
      await app.close();
    });
  });

  describe('startDataPlane', () => {
    it('starts server on default port', async () => {
      const app = await startDataPlane({ logger: false, port: 0 });
      expect(app).toBeDefined();
      await app.close();
    });

    it('starts with default options', async () => {
      const app = await startDataPlane({ port: 0 });
      expect(app).toBeDefined();
      await app.close();
    });
  });
});

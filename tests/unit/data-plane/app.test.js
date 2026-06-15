// tests/unit/data-plane/app.test.js

const request = require('supertest');
const { buildDataPlane, startDataPlane } = require('../../../src/data-plane/app');

describe('Data Plane', () => {
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
        getById: jest.fn().mockResolvedValue({ id: 'mem_abc', summary: 'test' }),
        create: jest.fn().mockResolvedValue({ id: 'mem_abc', status: 'created' }),
        update: jest.fn().mockResolvedValue({ id: 'mem_abc', summary: 'updated' }),
        delete: jest.fn().mockResolvedValue(true),
        getRelations: jest.fn().mockResolvedValue([{ source: 'a', target: 'b' }]),
        createRelation: jest.fn().mockResolvedValue({ id: 1, sourceId: 'mem_abc', targetId: 'mem_def' })
      },
      ...overrides
    };
  }

  describe('registerDataPlaneRoutes', () => {
    it('registers all routes', async () => {
      const app = buildDataPlane({ logger: false, services: createServices() });
      await app.ready();

      expect(typeof app.get).toBe('function');

      await app.close();
    });
  });

  describe('GET /health', () => {
    it('returns basic health without adapters', async () => {
      const app = buildDataPlane({ logger: false, services: createServices() });
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
        },
        services: createServices()
      });
      await app.ready();

      const res = await request(app.server).get('/health').expect(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.adapters.store).toEqual({ ok: true });

      await app.close();
    });
  });

  describe('POST /ingest', () => {
    it('returns completed result via ingestion service', async () => {
      const services = createServices();
      const app = buildDataPlane({ logger: false, services });
      await app.ready();

      const res = await request(app.server)
        .post('/ingest')
        .send({ text: 'hello world', contentType: 'text/plain' })
        .expect(201);

      expect(res.body.status).toBe('completed');
      expect(services.ingestion.ingest).toHaveBeenCalledWith(expect.objectContaining({
        text: 'hello world',
        contentType: 'text/plain'
      }));

      await app.close();
    });

    it('returns pending result for async ingestion', async () => {
      const services = createServices({
        ingestion: {
          ingest: jest.fn().mockResolvedValue({ id: 'mem_abc', status: 'pending', jobId: 'job_123' })
        }
      });
      const app = buildDataPlane({ logger: false, services });
      await app.ready();

      const res = await request(app.server)
        .post('/ingest')
        .send({ text: 'hello world', contentType: 'text/plain', async: true })
        .expect(202);

      expect(res.body.status).toBe('pending');
      expect(res.body.jobId).toBe('job_123');

      await app.close();
    });

    it('validates request body', async () => {
      const app = buildDataPlane({ logger: false, services: createServices() });
      await app.ready();

      await request(app.server)
        .post('/ingest')
        .send({ contentType: 'text/plain' })
        .expect(400);

      await app.close();
    });
  });

  describe('POST /query', () => {
    it('returns answer and sources via query service', async () => {
      const services = createServices();
      const app = buildDataPlane({ logger: false, services });
      await app.ready();

      const res = await request(app.server)
        .post('/query')
        .send({ question: 'What did I do?' })
        .expect(200);

      expect(res.body.answer).toBe('test answer');
      expect(res.body.sources.length).toBe(1);
      expect(services.query.query).toHaveBeenCalledWith(expect.objectContaining({
        question: 'What did I do?'
      }));

      await app.close();
    });

    it('validates request body', async () => {
      const app = buildDataPlane({ logger: false, services: createServices() });
      await app.ready();

      await request(app.server)
        .post('/query')
        .send({})
        .expect(400);

      await app.close();
    });
  });

  describe('GET /memories/:id', () => {
    it('returns memory from memory service', async () => {
      const services = createServices();
      const app = buildDataPlane({ logger: false, services });
      await app.ready();

      const res = await request(app.server).get('/memories/mem_abc').expect(200);
      expect(res.body.id).toBe('mem_abc');
      expect(services.memory.getById).toHaveBeenCalledWith('mem_abc');

      await app.close();
    });

    it('returns not_found when memory does not exist', async () => {
      const services = createServices({
        memory: { getById: jest.fn().mockResolvedValue(null) }
      });
      const app = buildDataPlane({ logger: false, services });
      await app.ready();

      const res = await request(app.server).get('/memories/mem_missing').expect(404);
      expect(res.body.error).toBe('not_found');

      await app.close();
    });
  });

  describe('POST /memories', () => {
    it('creates memory via memory service', async () => {
      const services = createServices();
      const app = buildDataPlane({ logger: false, services });
      await app.ready();

      const res = await request(app.server)
        .post('/memories')
        .send({ contentType: 'text/plain', extractedText: 'hello' })
        .expect(200);

      expect(res.body.id).toBe('mem_abc');
      expect(services.memory.create).toHaveBeenCalled();

      await app.close();
    });
  });

  describe('PATCH /memories/:id', () => {
    it('updates memory via memory service', async () => {
      const services = createServices();
      const app = buildDataPlane({ logger: false, services });
      await app.ready();

      const res = await request(app.server)
        .patch('/memories/mem_abc')
        .send({ summary: 'updated' })
        .expect(200);

      expect(res.body.summary).toBe('updated');
      expect(services.memory.update).toHaveBeenCalledWith('mem_abc', expect.objectContaining({
        summary: 'updated'
      }));

      await app.close();
    });
  });

  describe('DELETE /memories/:id', () => {
    it('deletes memory via memory service', async () => {
      const services = createServices();
      const app = buildDataPlane({ logger: false, services });
      await app.ready();

      const res = await request(app.server).delete('/memories/mem_abc').expect(200);
      expect(res.body.deleted).toBe(true);
      expect(services.memory.delete).toHaveBeenCalledWith('mem_abc');

      await app.close();
    });
  });

  describe('GET /memories/:id/relations', () => {
    it('returns edges from memory service', async () => {
      const services = createServices();
      const app = buildDataPlane({ logger: false, services });
      await app.ready();

      const res = await request(app.server).get('/memories/mem_abc/relations').expect(200);
      expect(res.body.memoryId).toBe('mem_abc');
      expect(res.body.edges.length).toBe(1);

      await app.close();
    });
  });

  describe('POST /memories/:id/relations', () => {
    it('creates relation via memory service', async () => {
      const services = createServices();
      const app = buildDataPlane({ logger: false, services });
      await app.ready();

      const res = await request(app.server)
        .post('/memories/mem_abc/relations')
        .send({ targetId: 'mem_def', type: 'similar' })
        .expect(200);

      expect(res.body.memoryId).toBe('mem_abc');
      expect(services.memory.createRelation).toHaveBeenCalledWith('mem_abc', expect.objectContaining({
        targetId: 'mem_def',
        type: 'similar'
      }));

      await app.close();
    });
  });

  describe('buildDataPlane', () => {
    it('returns a Fastify instance', async () => {
      const app = buildDataPlane({ logger: false, services: createServices() });
      await app.ready();
      expect(app).toBeDefined();
      expect(typeof app.get).toBe('function');
      await app.close();
    });

    it('uses default options', async () => {
      const app = buildDataPlane({ services: createServices() });
      await app.ready();
      expect(app).toBeDefined();
      await app.close();
    });
  });

  describe('RBAC integration', () => {
    function createRbacConfig(overrides = {}) {
      return {
        docket: {
          memory: {
            rbac: {
              enabled: true,
              authStrategy: 'header',
              principalHeader: 'X-Principal',
              defaultPolicy: 'owner-only',
              ...overrides
            }
          }
        }
      };
    }

    it('returns 401 when principal is required but missing', async () => {
      const app = buildDataPlane({
        logger: false,
        config: createRbacConfig(),
        adapters: { store: { health: jest.fn().mockResolvedValue({ ok: true }) } },
        services: createServices()
      });
      await app.ready();

      await request(app.server).get('/health').expect(401);

      await app.close();
    });

    it('allows request when principal is provided', async () => {
      const app = buildDataPlane({
        logger: false,
        config: createRbacConfig(),
        adapters: { store: { health: jest.fn().mockResolvedValue({ ok: true }) } },
        services: createServices()
      });
      await app.ready();

      const res = await request(app.server).get('/health').set('X-Principal', 'user:alice').expect(200);
      expect(res.body.status).toBe('ok');

      await app.close();
    });
  });

  describe('startDataPlane', () => {
    it('starts server on default port', async () => {
      const app = await startDataPlane({ logger: false, port: 0, services: createServices() });
      expect(app).toBeDefined();
      await app.close();
    });

    it('starts with default options', async () => {
      const app = await startDataPlane({ port: 0, services: createServices() });
      expect(app).toBeDefined();
      await app.close();
    });
  });
});

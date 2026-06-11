// tests/unit/control-plane/app.test.js

const request = require('supertest');
const { buildControlPlane, startControlPlane } = require('../../../src/control-plane/app');

jest.mock('../../../src/control-plane/services/plugin-service', () => ({
  PluginService: jest.fn().mockImplementation(() => ({
    list: jest.fn().mockReturnValue([]),
    validate: jest.fn().mockResolvedValue({ valid: true, manifest: { name: 'test' }, category: 'llm' }),
    register: jest.fn().mockResolvedValue({ key: 'llm:test', packageName: 'docket-llm-test' }),
    deregister: jest.fn().mockReturnValue(false),
    get: jest.fn().mockReturnValue(null)
  }))
}));

describe('Control Plane', () => {
  describe('registerControlPlaneRoutes', () => {
    it('registers all routes', async () => {
      const app = buildControlPlane({ logger: false });
      await app.ready();

      expect(typeof app.get).toBe('function');

      await app.close();
    });
  });

  describe('GET /admin/health', () => {
    it('returns basic health without registry', async () => {
      const app = buildControlPlane({ logger: false });
      await app.ready();

      const res = await request(app.server).get('/admin/health').expect(200);
      expect(res.body).toEqual({ status: 'ok', plane: 'control', adapters: {} });

      await app.close();
    });

    it('returns health with registry', async () => {
      const app = buildControlPlane({
        logger: false,
        registry: {
          healthCheck: async () => ({ store: { ok: true } })
        }
      });
      await app.ready();

      const res = await request(app.server).get('/admin/health').expect(200);
      expect(res.body.adapters).toEqual({ store: { ok: true } });

      await app.close();
    });
  });

  describe('GET /admin/config', () => {
    it('returns flat mode without config', async () => {
      const app = buildControlPlane({ logger: false });
      await app.ready();

      const res = await request(app.server).get('/admin/config').expect(200);
      expect(res.body).toEqual({ mode: 'flat', adapters: {} });

      await app.close();
    });

    it('returns config when provided', async () => {
      const app = buildControlPlane({
        logger: false,
        config: {
          docket: {
            memory: { mode: 'rich' },
            adapters: { store: 'sqlite' }
          }
        }
      });
      await app.ready();

      const res = await request(app.server).get('/admin/config').expect(200);
      expect(res.body.mode).toBe('rich');
      expect(res.body.adapters).toEqual({ store: 'sqlite' });

      await app.close();
    });
  });

  describe('POST /admin/config', () => {
    it('returns reload stub', async () => {
      const app = buildControlPlane({ logger: false });
      await app.ready();

      const res = await request(app.server).post('/admin/config').expect(200);
      expect(res.body.status).toBe('reloaded');

      await app.close();
    });
  });

  describe('GET /admin/plugins', () => {
    it('returns empty plugins list', async () => {
      const app = buildControlPlane({ logger: false });
      await app.ready();

      const res = await request(app.server).get('/admin/plugins').expect(200);
      expect(res.body.plugins).toEqual([]);

      await app.close();
    });
  });

  describe('POST /admin/plugins', () => {
    it('returns 400 without packageName', async () => {
      const app = buildControlPlane({ logger: false });
      await app.ready();

      const res = await request(app.server)
        .post('/admin/plugins')
        .send({})
        .expect(400);

      expect(res.body.error).toBe('packageName is required');

      await app.close();
    });

    it('registers a plugin successfully', async () => {
      const app = buildControlPlane({
        logger: false,
        registry: {
          healthCheck: async () => ({ store: { ok: true } })
        }
      });
      await app.ready();

      const res = await request(app.server)
        .post('/admin/plugins')
        .send({ packageName: 'docket-llm-test' })
        .expect(200);

      expect(res.body.status).toBe('registered');
      expect(res.body.plugin).toBeDefined();

      await app.close();
    });
  });

  describe('POST /admin/plugins/validate', () => {
    it('returns 400 without packageName', async () => {
      const app = buildControlPlane({ logger: false });
      await app.ready();

      const res = await request(app.server)
        .post('/admin/plugins/validate')
        .send({})
        .expect(400);

      expect(res.body.error).toBe('packageName is required');

      await app.close();
    });
  });

  describe('DELETE /admin/plugins/:category/:name', () => {
    it('returns not_found for unknown plugin', async () => {
      const app = buildControlPlane({ logger: false });
      await app.ready();

      const res = await request(app.server)
        .delete('/admin/plugins/llm/unknown')
        .expect(200);

      expect(res.body.status).toBe('not_found');

      await app.close();
    });
  });

  describe('GET /admin/rbac/policies', () => {
    it('returns empty policies', async () => {
      const app = buildControlPlane({ logger: false });
      await app.ready();

      const res = await request(app.server).get('/admin/rbac/policies').expect(200);
      expect(res.body.policies).toEqual([]);

      await app.close();
    });
  });

  describe('POST /admin/rbac/policies', () => {
    it('returns saved stub', async () => {
      const app = buildControlPlane({ logger: false });
      await app.ready();

      const res = await request(app.server).post('/admin/rbac/policies').expect(200);
      expect(res.body.status).toBe('saved');

      await app.close();
    });
  });

  describe('GET /admin/metrics', () => {
    it('returns placeholder metrics', async () => {
      const app = buildControlPlane({ logger: false });
      await app.ready();

      const res = await request(app.server).get('/admin/metrics').expect(200);
      expect(res.text).toContain('docket_metrics placeholder');
      expect(res.type).toBe('text/plain');

      await app.close();
    });
  });

  describe('buildControlPlane', () => {
    it('returns a Fastify instance', async () => {
      const app = buildControlPlane({ logger: false });
      await app.ready();
      expect(app).toBeDefined();
      expect(typeof app.get).toBe('function');
      await app.close();
    });

    it('uses default options', async () => {
      const app = buildControlPlane();
      await app.ready();
      expect(app).toBeDefined();
      await app.close();
    });
  });

  describe('startControlPlane', () => {
    it('starts server on default port', async () => {
      const app = await startControlPlane({ logger: false, port: 0 });
      expect(app).toBeDefined();
      await app.close();
    });

    it('starts with default options', async () => {
      const app = await startControlPlane({ port: 0 });
      expect(app).toBeDefined();
      await app.close();
    });
  });
});

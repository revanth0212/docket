// tests/unit/control-plane/routes.test.js

const request = require('supertest');
const { buildControlPlane } = require('../../../src/control-plane/app');

describe('Control Plane Routes', () => {
  let app;

  beforeEach(async () => {
    app = buildControlPlane({ logger: false });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /admin/health', () => {
    it('returns control plane health', async () => {
      const response = await request(app.server)
        .get('/admin/health')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({ status: 'ok', plane: 'control' });
    });
  });

  describe('GET /admin/config', () => {
    it('returns config snapshot', async () => {
      const response = await request(app.server)
        .get('/admin/config')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('mode');
    });
  });

  describe('POST /admin/config', () => {
    it('accepts config reload', async () => {
      const response = await request(app.server)
        .post('/admin/config')
        .send({ adapters: { llm: { default: 'groq' } } })
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status', 'reloaded');
    });
  });

  describe('GET /admin/plugins', () => {
    it('returns empty plugin list initially', async () => {
      const response = await request(app.server)
        .get('/admin/plugins')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('plugins');
      expect(response.body.plugins).toEqual([]);
    });
  });

  describe('POST /admin/plugins/validate', () => {
    it('rejects missing packageName', async () => {
      const response = await request(app.server)
        .post('/admin/plugins/validate')
        .send({})
        .expect(400)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('error', 'packageName is required');
    });

    it('validates a non-existent package', async () => {
      const response = await request(app.server)
        .post('/admin/plugins/validate')
        .send({ packageName: 'nonexistent-package-xyz' })
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('valid', false);
    });
  });

  describe('POST /admin/plugins', () => {
    it('rejects missing packageName', async () => {
      const response = await request(app.server)
        .post('/admin/plugins')
        .send({})
        .expect(400)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('error', 'packageName is required');
    });
  });

  describe('DELETE /admin/plugins/:category/:name', () => {
    it('returns not_found for unknown plugin', async () => {
      const response = await request(app.server)
        .delete('/admin/plugins/llm/unknown')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status', 'not_found');
    });
  });

  describe('GET /admin/rbac/policies', () => {
    it('returns empty policies', async () => {
      const response = await request(app.server)
        .get('/admin/rbac/policies')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('policies');
      expect(response.body.policies).toEqual([]);
    });
  });

  describe('POST /admin/rbac/policies', () => {
    it('accepts policy creation', async () => {
      const response = await request(app.server)
        .post('/admin/rbac/policies')
        .send({ name: 'public', readers: ['*'] })
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status', 'saved');
    });
  });

  describe('GET /admin/metrics', () => {
    it('returns prometheus placeholder', async () => {
      const response = await request(app.server)
        .get('/admin/metrics')
        .expect(200);

      expect(response.text).toContain('docket_metrics');
      expect(response.headers['content-type']).toMatch(/text\/plain/);
    });
  });
});

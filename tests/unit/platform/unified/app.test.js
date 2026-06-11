// tests/unit/platform/unified/app.test.js

const request = require('supertest');
const { buildUnifiedApp, startUnifiedApp } = require('../../../../src/platform/unified/app');

describe('Unified Platform', () => {
  describe('buildUnifiedApp', () => {
    it('returns a Fastify instance', async () => {
      const app = buildUnifiedApp({ logger: false });
      await app.ready();
      expect(app).toBeDefined();
      expect(typeof app.get).toBe('function');
      await app.close();
    });

    it('mounts data plane routes', async () => {
      const app = buildUnifiedApp({ logger: false });
      await app.ready();

      const res = await request(app.server).get('/health').expect(200);
      expect(res.body.status).toBe('ok');

      await app.close();
    });

    it('mounts control plane routes', async () => {
      const app = buildUnifiedApp({ logger: false });
      await app.ready();

      const res = await request(app.server).get('/admin/health').expect(200);
      expect(res.body.status).toBe('ok');

      await app.close();
    });

    it('passes adapters to data plane', async () => {
      const app = buildUnifiedApp({
        logger: false,
        adapters: {
          store: {
            health: async () => ({ ok: true })
          }
        }
      });
      await app.ready();

      const res = await request(app.server).get('/health').expect(200);
      expect(res.body.adapters.store).toEqual({ ok: true });

      await app.close();
    });

    it('passes registry and config to control plane', async () => {
      const app = buildUnifiedApp({
        logger: false,
        registry: {
          healthCheck: async () => ({ store: { ok: true } })
        },
        config: {
          docket: {
            memory: { mode: 'rich' },
            adapters: { store: 'sqlite' }
          }
        }
      });
      await app.ready();

      const healthRes = await request(app.server).get('/admin/health').expect(200);
      expect(healthRes.body.adapters).toEqual({ store: { ok: true } });

      const configRes = await request(app.server).get('/admin/config').expect(200);
      expect(configRes.body.mode).toBe('rich');

      await app.close();
    });
  });

  describe('startUnifiedApp', () => {
    it('starts server on default port', async () => {
      const app = await startUnifiedApp({ logger: false, port: 0 });
      expect(app).toBeDefined();
      await app.close();
    });
  });
});

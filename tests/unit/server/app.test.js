// tests/unit/server/app.test.js
// Unit tests for the Fastify server factory and health route

const request = require('supertest');
const { buildApp } = require('../../../src/server/app');

describe('Server /health', () => {
  let app;

  beforeEach(async () => {
    app = buildApp({ logger: false });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health returns { status: "ok" }', async () => {
    const response = await request(app.server)
      .get('/health')
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body).toMatchObject({ status: 'ok' });
  });
});

describe('buildApp', () => {
  it('returns a Fastify instance', async () => {
    const app = buildApp({ logger: false });
    await app.ready();
    expect(app).toBeDefined();
    expect(typeof app.get).toBe('function');
    await app.close();
  });
});

// tests/unit/server/app.test.js
// Unit tests for the Fastify server factory and health route

const request = require('supertest');
const { buildApp, startServer } = require('../../../src/server/app');

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

  it('uses default options', async () => {
    const app = buildApp();
    await app.ready();
    expect(app).toBeDefined();
    await app.close();
  });
});

describe('startServer', () => {
  it('starts the server', async () => {
    const app = await startServer({ logger: false, port: 0 });
    expect(app).toBeDefined();
    await app.close();
  });

  it('starts with default options', async () => {
    const app = await startServer({ port: 0 });
    expect(app).toBeDefined();
    await app.close();
  });
});

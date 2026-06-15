// tests/unit/platform/serverless/cloudflare-workers/handler.test.js

jest.mock('../../../../../src/core/config/loader', () => ({
  loadConfig: jest.fn()
}));

jest.mock('../../../../../src/core/utils/adapter-registry', () => ({
  AdapterRegistry: jest.fn()
}));

jest.mock('../../../../../src/core/modules/service-factory', () => ({
  createCoreServices: jest.fn()
}));

jest.mock('../../../../../src/platform/unified/app', () => ({
  buildUnifiedApp: jest.fn()
}));

const { loadConfig } = require('../../../../../src/core/config/loader');
const { AdapterRegistry } = require('../../../../../src/core/utils/adapter-registry');
const { createCoreServices } = require('../../../../../src/core/modules/service-factory');
const { buildUnifiedApp } = require('../../../../../src/platform/unified/app');
const { handleFetch, bootstrap, resetBootstrapCache } = require('../../../../../src/platform/serverless/cloudflare-workers/handler');

describe('Cloudflare Workers Handler', () => {
  let mockApp;

  beforeEach(() => {
    jest.clearAllMocks();
    resetBootstrapCache();

    mockApp = {
      ready: jest.fn().mockResolvedValue(),
      inject: jest.fn().mockResolvedValue({
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'ok', plane: 'data' })
      })
    };

    loadConfig.mockReturnValue({ docket: { adapters: {} } });
    AdapterRegistry.mockImplementation(() => ({
      initializeFromConfig: jest.fn().mockResolvedValue({ llm: {}, embedder: {}, store: {}, blob: {}, queue: {} })
    }));
    createCoreServices.mockReturnValue({ ingestion: {}, query: {}, memory: {} });
    buildUnifiedApp.mockReturnValue(mockApp);
  });

  function createRequest(overrides = {}) {
    const url = overrides.url || 'http://localhost:3000/health';
    return {
      url,
      method: overrides.method || 'GET',
      headers: new Map(Object.entries(overrides.headers || {})),
      arrayBuffer: jest.fn().mockImplementation(async () => {
        const encoder = new TextEncoder();
        return encoder.encode(overrides.body || '').buffer;
      })
    };
  }

  it('bootstraps and returns health response', async () => {
    const response = await handleFetch(createRequest(), {}, {});

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ status: 'ok', plane: 'data' });
  });

  it('handles POST with body', async () => {
    mockApp.inject.mockResolvedValue({
      statusCode: 201,
      headers: {},
      body: JSON.stringify({ id: 'mem_abc' })
    });

    const request = createRequest({
      method: 'POST',
      url: 'http://localhost:3000/ingest',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'hello', contentType: 'text/plain' })
    });

    const response = await handleFetch(request, {}, {});

    expect(mockApp.inject).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST',
      url: '/ingest'
    }));
    const injected = mockApp.inject.mock.calls[0][0];
    expect(Buffer.isBuffer(injected.payload)).toBe(true);
    expect(injected.payload.toString()).toBe(JSON.stringify({ text: 'hello', contentType: 'text/plain' }));
    expect(response.status).toBe(201);
  });

  it('passes query string to injected URL', async () => {
    const request = createRequest({ url: 'http://localhost:3000/health?foo=bar' });
    await handleFetch(request, {}, {});

    expect(mockApp.inject).toHaveBeenCalledWith(expect.objectContaining({
      url: '/health?foo=bar'
    }));
  });

  it('caches bootstrap result across invocations', async () => {
    await handleFetch(createRequest(), {}, {});
    const first = await bootstrap();
    const second = await bootstrap();
    expect(first.app).toBe(second.app);
    expect(buildUnifiedApp).toHaveBeenCalledTimes(1);
  });
});

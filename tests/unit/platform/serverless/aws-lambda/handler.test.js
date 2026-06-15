// tests/unit/platform/serverless/aws-lambda/handler.test.js

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
const { handler, bootstrap, resetBootstrapCache } = require('../../../../../src/platform/serverless/aws-lambda/handler');

describe('AWS Lambda Handler', () => {
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

  function createEvent(overrides = {}) {
    return {
      version: '2.0',
      routeKey: 'GET /health',
      rawPath: '/health',
      queryStringParameters: {},
      headers: {},
      body: null,
      isBase64Encoded: false,
      requestContext: {
        http: {
          method: 'GET',
          path: '/health'
        }
      },
      ...overrides
    };
  }

  function createContext() {
    return {
      callbackWaitsForEmptyEventLoop: true
    };
  }

  it('bootstraps and returns health response', async () => {
    const response = await handler(createEvent(), createContext());

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ status: 'ok', plane: 'data' });
    expect(buildUnifiedApp).toHaveBeenCalled();
  });

  it('sets callbackWaitsForEmptyEventLoop to false', async () => {
    const context = createContext();
    await handler(createEvent(), context);
    expect(context.callbackWaitsForEmptyEventLoop).toBe(false);
  });

  it('handles POST with JSON body', async () => {
    mockApp.inject.mockResolvedValue({
      statusCode: 201,
      headers: {},
      body: JSON.stringify({ id: 'mem_abc' })
    });

    const event = createEvent({
      routeKey: 'POST /ingest',
      rawPath: '/ingest',
      requestContext: { http: { method: 'POST', path: '/ingest' } },
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'hello', contentType: 'text/plain' })
    });

    const response = await handler(event, createContext());

    expect(mockApp.inject).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST',
      payload: JSON.stringify({ text: 'hello', contentType: 'text/plain' })
    }));
    expect(response.statusCode).toBe(201);
  });

  it('handles base64 body', async () => {
    const event = createEvent({
      routeKey: 'POST /ingest',
      rawPath: '/ingest',
      requestContext: { http: { method: 'POST', path: '/ingest' } },
      headers: { 'content-type': 'application/json' },
      body: Buffer.from(JSON.stringify({ text: 'hello' })).toString('base64'),
      isBase64Encoded: true
    });

    await handler(event, createContext());

    expect(mockApp.inject).toHaveBeenCalledWith(expect.objectContaining({
      payload: Buffer.from(JSON.stringify({ text: 'hello' }))
    }));
  });

  it('caches bootstrap result across invocations', async () => {
    await handler(createEvent(), createContext());
    const first = await bootstrap();
    const second = await bootstrap();
    expect(first.app).toBe(second.app);
    expect(buildUnifiedApp).toHaveBeenCalledTimes(1);
  });

  it('includes query string in injected URL', async () => {
    const event = createEvent({
      queryStringParameters: { q: 'bicycle' }
    });

    await handler(event, createContext());

    expect(mockApp.inject).toHaveBeenCalledWith(expect.objectContaining({
      url: '/health?q=bicycle'
    }));
  });
});

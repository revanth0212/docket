// tests/unit/platform/standalone/bin.test.js

jest.mock('../../../../src/core/config/loader', () => ({
  loadConfig: jest.fn()
}));

jest.mock('../../../../src/core/utils/adapter-registry', () => ({
  AdapterRegistry: jest.fn()
}));

jest.mock('../../../../src/core/modules/service-factory', () => ({
  createCoreServices: jest.fn()
}));

jest.mock('../../../../src/platform/unified/app', () => ({
  startUnifiedApp: jest.fn()
}));

const { loadConfig } = require('../../../../src/core/config/loader');
const { AdapterRegistry } = require('../../../../src/core/utils/adapter-registry');
const { createCoreServices } = require('../../../../src/core/modules/service-factory');
const { startUnifiedApp } = require('../../../../src/platform/unified/app');
const { main } = require('../../../../src/platform/standalone/bin');

describe('Standalone Platform Bin', () => {
  const originalExit = process.exit;
  const originalError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    process.exit = jest.fn();
    console.error = jest.fn();
    delete process.env.PORT;
    delete process.env.DOCKET_PORT;
    delete process.env.HOST;
    delete process.env.DOCKET_HOST;

    loadConfig.mockReturnValue({
      docket: {
        server: { port: 3000, host: '127.0.0.1' },
        adapters: {}
      }
    });

    const mockRegistry = {
      initializeFromConfig: jest.fn().mockResolvedValue({ llm: {}, embedder: {}, store: {}, blob: {}, queue: {} })
    };
    AdapterRegistry.mockImplementation(() => mockRegistry);

    createCoreServices.mockReturnValue({ ingestion: {}, query: {}, memory: {}, decayEngine: {} });
  });

  afterEach(() => {
    process.exit = originalExit;
    console.error = originalError;
  });

  it('starts with config defaults', async () => {
    startUnifiedApp.mockResolvedValue({ log: { info: jest.fn() } });
    await main();
    expect(startUnifiedApp).toHaveBeenCalledWith(expect.objectContaining({
      port: 3000,
      host: '127.0.0.1'
    }));
  });

  it('prefers PORT and HOST environment variables', async () => {
    process.env.PORT = '8080';
    process.env.HOST = '0.0.0.0';
    startUnifiedApp.mockResolvedValue({ log: { info: jest.fn() } });
    await main();
    expect(startUnifiedApp).toHaveBeenCalledWith(expect.objectContaining({
      port: 8080,
      host: '0.0.0.0'
    }));
  });

  it('exits when adapter initialization fails', async () => {
    const mockRegistry = {
      initializeFromConfig: jest.fn().mockRejectedValue(new Error('adapter down'))
    };
    AdapterRegistry.mockImplementation(() => mockRegistry);
    await main();
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});

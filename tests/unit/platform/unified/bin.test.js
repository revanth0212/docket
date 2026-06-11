// tests/unit/platform/unified/bin.test.js

jest.mock('../../../../src/core/config/loader', () => ({
  loadConfig: jest.fn()
}));

jest.mock('../../../../src/core/utils/adapter-registry', () => ({
  AdapterRegistry: jest.fn().mockImplementation(() => ({
    initializeFromConfig: jest.fn()
  }))
}));

jest.mock('../../../../src/platform/unified/app', () => ({
  startUnifiedApp: jest.fn()
}));

const { loadConfig } = require('../../../../src/core/config/loader');
const { AdapterRegistry } = require('../../../../src/core/utils/adapter-registry');
const { startUnifiedApp } = require('../../../../src/platform/unified/app');
const { main } = require('../../../../src/platform/unified/bin');

describe('Unified Bin', () => {
  const originalExit = process.exit;

  beforeEach(() => {
    jest.clearAllMocks();
    process.exit = jest.fn(() => { throw new Error('exit'); });
    delete process.env.DOCKET_PORT;
    delete process.env.DOCKET_HOST;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  it('starts with config defaults', async () => {
    loadConfig.mockReturnValue({ docket: { server: {} } });
    AdapterRegistry.mockImplementation(() => ({
      initializeFromConfig: jest.fn().mockResolvedValue({ store: {} })
    }));
    startUnifiedApp.mockResolvedValue({ log: { info: jest.fn() } });

    await main();

    expect(startUnifiedApp).toHaveBeenCalledWith(
      expect.objectContaining({ port: 3000, host: '0.0.0.0' })
    );
  });

  it('uses env vars', async () => {
    process.env.DOCKET_PORT = '8080';
    process.env.DOCKET_HOST = '127.0.0.1';
    loadConfig.mockReturnValue({ docket: { server: {} } });
    AdapterRegistry.mockImplementation(() => ({
      initializeFromConfig: jest.fn().mockResolvedValue({})
    }));
    startUnifiedApp.mockResolvedValue({ log: { info: jest.fn() } });

    await main();

    expect(startUnifiedApp).toHaveBeenCalledWith(
      expect.objectContaining({ port: 8080, host: '127.0.0.1' })
    );
  });

  it('uses config port and host', async () => {
    loadConfig.mockReturnValue({
      docket: { server: { port: 9090, host: 'localhost' } }
    });
    AdapterRegistry.mockImplementation(() => ({
      initializeFromConfig: jest.fn().mockResolvedValue({})
    }));
    startUnifiedApp.mockResolvedValue({ log: { info: jest.fn() } });

    await main();

    expect(startUnifiedApp).toHaveBeenCalledWith(
      expect.objectContaining({ port: 9090, host: 'localhost' })
    );
  });

  it('exits on config load failure', async () => {
    loadConfig.mockImplementation(() => { throw new Error('missing'); });
    await expect(main()).rejects.toThrow('exit');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('exits on adapter init failure', async () => {
    loadConfig.mockReturnValue({ docket: { server: {} } });
    AdapterRegistry.mockImplementation(() => ({
      initializeFromConfig: jest.fn().mockRejectedValue(new Error('bad'))
    }));
    await expect(main()).rejects.toThrow('exit');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('exits on start failure', async () => {
    loadConfig.mockReturnValue({ docket: { server: {} } });
    AdapterRegistry.mockImplementation(() => ({
      initializeFromConfig: jest.fn().mockResolvedValue({})
    }));
    startUnifiedApp.mockRejectedValue(new Error('bind'));
    await expect(main()).rejects.toThrow('exit');
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});

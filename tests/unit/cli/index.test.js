// tests/unit/cli/index.test.js

jest.mock('../../../src/platform/unified/app', () => ({
  startUnifiedApp: jest.fn()
}));

jest.mock('../../../src/data-plane/app', () => ({
  startDataPlane: jest.fn()
}));

jest.mock('../../../src/control-plane/app', () => ({
  startControlPlane: jest.fn()
}));

jest.mock('../../../src/core/config/loader', () => ({
  loadConfig: jest.fn()
}));

jest.mock('../../../src/core/utils/adapter-registry', () => ({
  AdapterRegistry: jest.fn().mockImplementation(() => ({
    initializeFromConfig: jest.fn()
  }))
}));

jest.mock('../../../src/scripts/doctor', () => {
  console.log('Doctor check complete');
});

const { startUnifiedApp } = require('../../../src/platform/unified/app');
const { startDataPlane } = require('../../../src/data-plane/app');
const { startControlPlane } = require('../../../src/control-plane/app');
const { loadConfig } = require('../../../src/core/config/loader');
const { AdapterRegistry } = require('../../../src/core/utils/adapter-registry');

const {
  usage, cmdStart, cmdHealth, cmdDoctor,
  cmdPluginList, cmdPluginAdd, cmdConfig, main
} = require('../../../src/cli/index');

describe('CLI', () => {
  const originalArgv = process.argv;
  const originalExit = process.exit;
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    process.exit = jest.fn();
    console.log = jest.fn();
    console.error = jest.fn();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exit = originalExit;
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    delete global.fetch;
  });

  describe('usage', () => {
    it('prints help text', () => {
      usage();
      expect(console.log).toHaveBeenCalled();
      const output = console.log.mock.calls[0][0];
      expect(output).toContain('Usage: docket');
      expect(output).toContain('start');
      expect(output).toContain('health');
      expect(output).toContain('plugin list');
    });
  });

  describe('cmdStart', () => {
    it('starts unified app by default', async () => {
      loadConfig.mockReturnValue({ docket: {} });
      AdapterRegistry.mockImplementation(() => ({
        initializeFromConfig: jest.fn().mockResolvedValue([])
      }));
      startUnifiedApp.mockResolvedValue();

      await cmdStart([]);

      expect(loadConfig).toHaveBeenCalled();
      expect(startUnifiedApp).toHaveBeenCalledWith(
        expect.objectContaining({ port: undefined, host: undefined })
      );
    });

    it('starts unified app with custom port and host', async () => {
      loadConfig.mockReturnValue({ docket: {} });
      AdapterRegistry.mockImplementation(() => ({
        initializeFromConfig: jest.fn().mockResolvedValue([])
      }));
      startUnifiedApp.mockResolvedValue();

      await cmdStart(['--port', '8080', '--host', '127.0.0.1']);

      expect(startUnifiedApp).toHaveBeenCalledWith(
        expect.objectContaining({ port: 8080, host: '127.0.0.1' })
      );
    });

    it('exits on config load failure', async () => {
      loadConfig.mockImplementation(() => {
        throw new Error('bad config');
      });

      await cmdStart([]);

      expect(console.error).toHaveBeenCalledWith(
        'Failed to load configuration:', 'bad config'
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('exits on adapter initialization failure', async () => {
      loadConfig.mockReturnValue({ docket: {} });
      AdapterRegistry.mockImplementation(() => ({
        initializeFromConfig: jest.fn().mockRejectedValue(new Error('init failed'))
      }));

      await cmdStart([]);

      expect(console.error).toHaveBeenCalledWith(
        'Failed to initialize adapters:', 'init failed'
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('starts data plane only with --data', async () => {
      startDataPlane.mockResolvedValue();

      await cmdStart(['--data', '--port', '4000']);

      expect(startDataPlane).toHaveBeenCalledWith({ port: 4000, host: undefined });
      expect(startUnifiedApp).not.toHaveBeenCalled();
    });

    it('starts control plane only with --control', async () => {
      startControlPlane.mockResolvedValue();

      await cmdStart(['--control', '--host', 'localhost']);

      expect(startControlPlane).toHaveBeenCalledWith({ port: undefined, host: 'localhost' });
      expect(startUnifiedApp).not.toHaveBeenCalled();
    });
  });

  describe('cmdHealth', () => {
    it('prints health data on success', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' })
      });

      await cmdHealth();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/health',
        expect.any(Object)
      );
      expect(console.log).toHaveBeenCalledWith('{\n  "status": "ok"\n}');
    });

    it('exits on fetch failure', async () => {
      global.fetch.mockRejectedValue(new Error('ECONNREFUSED'));

      await cmdHealth();

      expect(console.error).toHaveBeenCalledWith(
        'Health check failed: ECONNREFUSED'
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('cmdDoctor', () => {
    it('runs doctor script', async () => {
      await cmdDoctor();
      expect(console.log).toHaveBeenCalledWith('Doctor check complete');
    });
  });

  describe('cmdPluginList', () => {
    it('prints no plugins when empty', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ plugins: [] })
      });

      await cmdPluginList();

      expect(console.log).toHaveBeenCalledWith('No plugins registered.');
    });

    it('prints registered plugins', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          plugins: [
            { name: 'plugin-a' },
            { packageName: 'plugin-b' },
            { unknown: true }
          ]
        })
      });

      await cmdPluginList();

      expect(console.log).toHaveBeenCalledWith('Registered plugins:');
      expect(console.log).toHaveBeenCalledWith('  - plugin-a');
      expect(console.log).toHaveBeenCalledWith('  - plugin-b');
      expect(console.log).toHaveBeenCalledWith('  - {"unknown":true}');
    });

    it('exits on fetch failure', async () => {
      global.fetch.mockRejectedValue(new Error('timeout'));

      await cmdPluginList();

      expect(console.error).toHaveBeenCalledWith('Failed to list plugins: timeout');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('cmdPluginAdd', () => {
    it('exits when package name is missing', async () => {
      await cmdPluginAdd([]);

      expect(console.error).toHaveBeenCalledWith('Usage: docket plugin add <package-name>');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('registers a plugin successfully', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'plugin-1' })
      });

      await cmdPluginAdd(['my-plugin']);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/admin/plugins',
        expect.objectContaining({ method: 'POST' })
      );
      expect(console.log).toHaveBeenCalledWith('Plugin registered: my-plugin');
    });

    it('exits on failed registration', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
        json: async () => ({ error: 'already exists' })
      });

      await cmdPluginAdd(['my-plugin']);

      expect(console.error).toHaveBeenCalledWith('Failed to add plugin: already exists');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('exits on fetch failure', async () => {
      global.fetch.mockRejectedValue(new Error('network'));

      await cmdPluginAdd(['my-plugin']);

      expect(console.error).toHaveBeenCalledWith('Failed to add plugin: network');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('cmdConfig', () => {
    it('prints config on success', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ docket: {} })
      });

      await cmdConfig();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/admin/config',
        expect.any(Object)
      );
    });

    it('exits on fetch failure', async () => {
      global.fetch.mockRejectedValue(new Error('down'));

      await cmdConfig();

      expect(console.error).toHaveBeenCalledWith('Failed to fetch config: down');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('main', () => {
    it('calls cmdStart for start command', async () => {
      loadConfig.mockReturnValue({ docket: {} });
      AdapterRegistry.mockImplementation(() => ({
        initializeFromConfig: jest.fn().mockResolvedValue([])
      }));
      startUnifiedApp.mockResolvedValue();

      process.argv = ['node', 'docket', 'start'];
      await main();

      expect(startUnifiedApp).toHaveBeenCalled();
    });

    it('calls cmdHealth for health command', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true })
      });

      process.argv = ['node', 'docket', 'health'];
      await main();

      expect(global.fetch).toHaveBeenCalled();
    });

    it('calls cmdDoctor for doctor command', async () => {
      process.argv = ['node', 'docket', 'doctor'];
      await expect(main()).resolves.not.toThrow();
    });

    it('calls cmdPluginList for plugin list', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ plugins: [] })
      });

      process.argv = ['node', 'docket', 'plugin', 'list'];
      await main();

      expect(console.log).toHaveBeenCalledWith('No plugins registered.');
    });

    it('calls cmdPluginAdd for plugin add', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'p1' })
      });

      process.argv = ['node', 'docket', 'plugin', 'add', 'pkg'];
      await main();

      expect(console.log).toHaveBeenCalledWith('Plugin registered: pkg');
    });

    it('shows usage for unknown plugin subcommand', async () => {
      process.argv = ['node', 'docket', 'plugin', 'remove'];
      await main();

      expect(console.error).toHaveBeenCalledWith('Usage: docket plugin <list|add>');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('calls cmdConfig for config command', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true })
      });

      process.argv = ['node', 'docket', 'config'];
      await main();

      expect(global.fetch).toHaveBeenCalled();
    });

    it('shows usage for help command', async () => {
      process.argv = ['node', 'docket', 'help'];
      await main();
      expect(console.log).toHaveBeenCalled();
      const output = console.log.mock.calls[0][0];
      expect(output).toContain('Usage: docket');
    });

    it('shows usage for --help flag', async () => {
      process.argv = ['node', 'docket', '--help'];
      await main();
      expect(console.log).toHaveBeenCalled();
    });

    it('shows usage for -h flag', async () => {
      process.argv = ['node', 'docket', '-h'];
      await main();
      expect(console.log).toHaveBeenCalled();
    });

    it('shows usage and exits for unknown command', async () => {
      process.argv = ['node', 'docket', 'unknown'];
      await main();

      expect(console.error).toHaveBeenCalledWith('Unknown command: unknown');
      expect(console.log).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('shows usage without exiting when no command given', async () => {
      process.argv = ['node', 'docket'];
      await main();

      expect(console.log).toHaveBeenCalled();
      expect(process.exit).not.toHaveBeenCalled();
    });
  });
});

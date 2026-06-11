// tests/unit/core/utils/adapter-registry.test.js

const { AdapterRegistry } = require('../../../../src/core/utils/adapter-registry');
const { ConfigError, AdapterError } = require('../../../../src/core/errors');

describe('AdapterRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new AdapterRegistry();
  });

  describe('resolveAdapterPath', () => {
    it('resolves @docket/store-sqlite to local path', () => {
      const resolved = registry.resolveAdapterPath('store', '@docket/store-sqlite');
      expect(resolved).toMatch(/src\/adapters\/store\/sqlite\/index$/);
    });

    it('resolves @docket/llm-ollama to local path', () => {
      const resolved = registry.resolveAdapterPath('llm', '@docket/llm-ollama');
      expect(resolved).toMatch(/src\/adapters\/llm\/ollama\/index$/);
    });

    it('resolves relative paths', () => {
      const resolved = registry.resolveAdapterPath('llm', './custom-adapter');
      expect(resolved).toMatch(/custom-adapter$/);
    });

    it('resolves npm packages via require.resolve', () => {
      // We know 'fastify' is installed as an npm package
      const resolved = registry.resolveAdapterPath('llm', 'fastify');
      expect(resolved).toMatch(/fastify/);
    });

    it('throws ConfigError for unresolvable packages', () => {
      expect(() => {
        registry.resolveAdapterPath('llm', 'nonexistent-package-12345');
      }).toThrow(ConfigError);
    });
  });

  describe('loadAdapter', () => {
    it('loads and initializes a real adapter', async () => {
      const adapter = await registry.loadAdapter('store', 'sqlite', {
        adapter: '@docket/store-sqlite',
        config: { path: ':memory:', enableWAL: false }
      });

      expect(adapter).toBeDefined();
      expect(typeof adapter.createMemory).toBe('function');
      expect(typeof adapter.health).toBe('function');

      const health = await adapter.health();
      expect(health).toHaveProperty('ok');

      // Cleanup
      if (adapter.db && adapter.db.close) {
        adapter.db.close();
      }
    });

    it('throws AdapterError for missing metadata', async () => {
      await expect(
        registry.loadAdapter('llm', 'bad', {
          adapter: './tests/unit/fixtures/no-metadata-adapter',
          config: {}
        })
      ).rejects.toThrow(AdapterError);
    });
  });

  describe('get', () => {
    it('returns undefined before initialization', () => {
      expect(registry.get('store')).toBeUndefined();
    });
  });

  describe('healthCheck', () => {
    it('returns health for all initialized adapters', async () => {
      const adapter = await registry.loadAdapter('store', 'sqlite', {
        adapter: '@docket/store-sqlite',
        config: { path: ':memory:', enableWAL: false }
      });

      // Manually register in instances (normally done by initializeFromConfig)
      registry.instances.store = adapter;

      const results = await registry.healthCheck();
      expect(results).toHaveProperty('store');
      expect(results.store).toHaveProperty('ok');

      // Cleanup
      if (adapter.db && adapter.db.close) {
        adapter.db.close();
      }
    });

    it('reports error for broken adapters', async () => {
      // Manually inject a broken adapter
      registry.instances.test = {
        health: async () => { throw new Error('broken'); }
      };

      const results = await registry.healthCheck();
      expect(results.test).toEqual({ ok: false, error: 'broken' });
    });
  });
});

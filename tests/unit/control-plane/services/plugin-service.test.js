// tests/unit/control-plane/services/plugin-service.test.js

const { PluginService } = require('../../../../src/control-plane/services/plugin-service');
const { ConfigError } = require('../../../../src/core/errors');

// Create a fake adapter module in a temp location
const fs = require('fs');
const path = require('path');
const os = require('os');

function createFakeAdapter(name, category, version = '0.1.0') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cortex-test-'));
  const code = `
    class FakeAdapter {
      constructor(config) {
        this.config = config;
      }
      async initialize() {}
      async primary() { return 'ok'; }
      async health() { return { ok: true, latency: 1 }; }
      static get metadata() {
        return {
          name: '${name}',
          version: '${version}',
          category: '${category}',
          capabilities: ['test'],
          cortexCompatibility: '>=0.1.0'
        };
      }
    }
    module.exports = { FakeAdapter };
  `;
  fs.writeFileSync(path.join(dir, 'index.js'), code);
  return dir;
}

describe('PluginService', () => {
  let service;
  let fakeDir;

  beforeEach(() => {
    service = new PluginService();
  });

  afterEach(() => {
    if (fakeDir && fs.existsSync(fakeDir)) {
      fs.rmSync(fakeDir, { recursive: true, force: true });
      fakeDir = null;
    }
  });

  describe('validate', () => {
    it('validates a correct plugin package', async () => {
      fakeDir = createFakeAdapter('fake-llm', 'llm');
      const result = await service.validate(fakeDir);

      expect(result.valid).toBe(true);
      expect(result.manifest.name).toBe('fake-llm');
      expect(result.manifest.category).toBe('llm');
      expect(result.category).toBe('llm');
    });

    it('returns errors for non-existent packages', async () => {
      const result = await service.validate('nonexistent-package-xyz');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/Cannot load package/);
    });

    it('returns errors for missing metadata', async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cortex-test-'));
      fs.writeFileSync(
        path.join(dir, 'index.js'),
        'class NoMeta {}\nmodule.exports = { NoMeta };'
      );
      fakeDir = dir;

      const result = await service.validate(dir);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/missing static metadata/);
    });
  });

  describe('register', () => {
    it('registers a valid plugin', async () => {
      fakeDir = createFakeAdapter('fake-store', 'store');
      const info = await service.register(fakeDir, { path: ':memory:', enableWAL: false });

      expect(info.key).toBe('store:fake-store');
      expect(info.manifest.name).toBe('fake-store');
      expect(info.packageName).toBe(fakeDir);
    });

    it('throws for invalid plugins', async () => {
      await expect(service.register('nonexistent')).rejects.toThrow(ConfigError);
    });

    it('throws for duplicate registration', async () => {
      fakeDir = createFakeAdapter('fake-blob', 'blob');
      await service.register(fakeDir, {});

      await expect(service.register(fakeDir, {})).rejects.toThrow(ConfigError);
    });
  });

  describe('deregister', () => {
    it('deregisters an existing plugin', async () => {
      fakeDir = createFakeAdapter('fake-queue', 'queue');
      await service.register(fakeDir, {});

      expect(service.deregister('queue:fake-queue')).toBe(true);
      expect(service.get('queue:fake-queue')).toBeNull();
    });

    it('returns false for unknown plugins', () => {
      expect(service.deregister('llm:unknown')).toBe(false);
    });
  });

  describe('list', () => {
    it('returns empty array initially', () => {
      expect(service.list()).toEqual([]);
    });

    it('lists registered plugins', async () => {
      fakeDir = createFakeAdapter('fake-embedder', 'embedder');
      await service.register(fakeDir, {});

      const list = service.list();
      expect(list).toHaveLength(1);
      expect(list[0].key).toBe('embedder:fake-embedder');
    });
  });

  describe('get', () => {
    it('returns null for unknown plugins', () => {
      expect(service.get('llm:missing')).toBeNull();
    });

    it('returns plugin info without instance', async () => {
      fakeDir = createFakeAdapter('fake-llm', 'llm');
      await service.register(fakeDir, {});

      const info = service.get('llm:fake-llm');
      expect(info).toBeDefined();
      expect(info.key).toBe('llm:fake-llm');
      expect(info.instance).toBeUndefined(); // should not leak instance
    });
  });
});

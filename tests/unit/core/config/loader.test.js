// tests/unit/core/config/loader.test.js

const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadConfig, mergeDeep, interpolateEnv } = require('../../../../src/core/config/loader');
const { ConfigError } = require('../../../../src/core/errors');

describe('interpolateEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns non-string values unchanged', () => {
    expect(interpolateEnv(42)).toBe(42);
    expect(interpolateEnv(true)).toBe(true);
    expect(interpolateEnv(null)).toBe(null);
  });

  it('interpolates ${VAR}', () => {
    process.env.TEST_VAR = 'hello';
    expect(interpolateEnv('${TEST_VAR}')).toBe('hello');
  });

  it('interpolates ${VAR:-default}', () => {
    delete process.env.MISSING_VAR;
    expect(interpolateEnv('${MISSING_VAR:-fallback}')).toBe('fallback');
  });

  it('throws for missing required vars', () => {
    delete process.env.REQUIRED_XYZ;
    expect(() => interpolateEnv('${REQUIRED_XYZ}')).toThrow(ConfigError);
  });

  it('interpolates multiple vars in one string', () => {
    process.env.FIRST = 'a';
    process.env.SECOND = 'b';
    expect(interpolateEnv('${FIRST}:${SECOND}')).toBe('a:b');
  });
});

describe('mergeDeep', () => {
  it('merges flat objects', () => {
    const result = mergeDeep({ a: 1 }, { b: 2 });
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('overrides existing keys', () => {
    const result = mergeDeep({ a: 1 }, { a: 2 });
    expect(result.a).toBe(2);
  });

  it('deep merges nested objects', () => {
    const result = mergeDeep(
      { docket: { server: { port: 3000 } } },
      { docket: { server: { host: '0.0.0.0' } } }
    );
    expect(result.docket.server).toEqual({ port: 3000, host: '0.0.0.0' });
  });

  it('handles null target', () => {
    const result = mergeDeep(null, { a: 1 });
    expect(result).toEqual({ a: 1 });
  });

  it('handles null source', () => {
    const result = mergeDeep({ a: 1 }, null);
    expect(result).toEqual({ a: 1 });
  });
});

describe('loadConfig', () => {
  let tmpDir;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docket-config-test-'));
  });

  afterEach(() => {
    process.env = originalEnv;
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  function writeDefaults(content) {
    fs.writeFileSync(path.join(tmpDir, 'defaults.yaml'), content);
  }

  it('loads defaults.yaml', () => {
    writeDefaults(`
docket:
  version: "0.1.0"
  adapters:
    llm:
      default: ollama
      providers:
        ollama:
          adapter: "@docket/llm-ollama"
          config:
            baseUrl: "http://localhost:11434"
    embedder:
      default: ollama
      providers:
        ollama:
          adapter: "@docket/embedder-ollama"
          config: {}
    store:
      default: sqlite
      providers:
        sqlite:
          adapter: "@docket/store-sqlite"
          config:
            path: "./data/docket.db"
    blob:
      default: filesystem
      providers:
        filesystem:
          adapter: "@docket/blob-filesystem"
          config: {}
    queue:
      default: in-memory
      providers:
        in-memory:
          adapter: "@docket/queue-memory"
          config: {}
`);

    const config = loadConfig({ configDir: tmpDir });
    expect(config.docket.adapters.llm.default).toBe('ollama');
    expect(config.docket.adapters.store.default).toBe('sqlite');
  });

  it('applies DOCKET_* env overrides', () => {
    writeDefaults(`
docket:
  version: "0.1.0"
  adapters:
    llm:
      default: ollama
      providers:
        ollama:
          adapter: "@docket/llm-ollama"
          config:
            baseUrl: "http://localhost:11434"
    embedder:
      default: ollama
      providers:
        ollama:
          adapter: "@docket/embedder-ollama"
          config: {}
    store:
      default: sqlite
      providers:
        sqlite:
          adapter: "@docket/store-sqlite"
          config: {}
    blob:
      default: filesystem
      providers:
        filesystem:
          adapter: "@docket/blob-filesystem"
          config: {}
    queue:
      default: in-memory
      providers:
        in-memory:
          adapter: "@docket/queue-memory"
          config: {}
`);

    process.env.DOCKET_ADAPTERS_LLM_DEFAULT = 'groq';
    process.env.DOCKET_SERVER_PORT = '8080';

    const config = loadConfig({ configDir: tmpDir });
    expect(config.docket.adapters.llm.default).toBe('groq');
    expect(config.docket.server.port).toBe(8080);
  });

  it('throws for invalid config', () => {
    writeDefaults(`
docket:
  adapters: {}
`);

    expect(() => loadConfig({ configDir: tmpDir })).toThrow(ConfigError);
  });

  it('interpolates env vars in config values', () => {
    process.env.API_KEY = 'secret123';
    writeDefaults(`
docket:
  version: "0.1.0"
  adapters:
    llm:
      default: groq
      providers:
        groq:
          adapter: "docket-llm-groq"
          config:
            apiKey: "\${API_KEY}"
    embedder:
      default: ollama
      providers:
        ollama:
          adapter: "@docket/embedder-ollama"
          config: {}
    store:
      default: sqlite
      providers:
        sqlite:
          adapter: "@docket/store-sqlite"
          config: {}
    blob:
      default: filesystem
      providers:
        filesystem:
          adapter: "@docket/blob-filesystem"
          config: {}
    queue:
      default: in-memory
      providers:
        in-memory:
          adapter: "@docket/queue-memory"
          config: {}
`);

    const config = loadConfig({ configDir: tmpDir });
    expect(config.docket.adapters.llm.providers.groq.config.apiKey).toBe('secret123');
  });
});

// tests/unit/core/interfaces/embedder-adapter.test.js

const { EmbedderAdapter } = require('../../../../src/core/interfaces/embedder-adapter');

describe('EmbedderAdapter', () => {
  it('validates config', () => {
    const adapter = new EmbedderAdapter({ model: 'test' });
    expect(adapter.config).toEqual({ model: 'test' });
  });

  it('throws on invalid config', () => {
    expect(() => new EmbedderAdapter(null)).toThrow('Config must be an object');
    expect(() => new EmbedderAdapter('string')).toThrow('Config must be an object');
  });

  it('initialize does nothing by default', async () => {
    const adapter = new EmbedderAdapter({});
    await expect(adapter.initialize()).resolves.toBeUndefined();
  });

  it('embed throws by default', async () => {
    const adapter = new EmbedderAdapter({});
    await expect(adapter.embed('text')).rejects.toThrow('Method "embed" must be implemented by subclass');
  });

  it('embedBatch calls embed for each text', async () => {
    class TestAdapter extends EmbedderAdapter {
      async embed(text) {
        return [text.length];
      }
    }
    const adapter = new TestAdapter({});
    const results = await adapter.embedBatch(['a', 'bb', 'ccc']);
    expect(results).toEqual([[1], [2], [3]]);
  });

  it('getDimensions returns embedding length', async () => {
    class TestAdapter extends EmbedderAdapter {
      async embed() {
        return [0.1, 0.2, 0.3];
      }
    }
    const adapter = new TestAdapter({});
    await expect(adapter.getDimensions()).resolves.toBe(3);
  });

  it('health returns ok when embed succeeds', async () => {
    class TestAdapter extends EmbedderAdapter {
      async embed() {
        return [0.1];
      }
    }
    const adapter = new TestAdapter({});
    const result = await adapter.health();
    expect(result.ok).toBe(true);
    expect(result.latency).toBeGreaterThanOrEqual(0);
  });

  it('health returns error when embed fails', async () => {
    class TestAdapter extends EmbedderAdapter {
      async embed() {
        throw new Error('embed failed');
      }
    }
    const adapter = new TestAdapter({});
    const result = await adapter.health();
    expect(result.ok).toBe(false);
    expect(result.error).toBe('embed failed');
  });

  it('metadata throws by default', () => {
    expect(() => EmbedderAdapter.metadata).toThrow('Property "metadata" must be implemented by subclass');
  });
});

// tests/unit/core/interfaces/llm-adapter.test.js

const { LlmAdapter } = require('../../../../src/core/interfaces/llm-adapter');

describe('LlmAdapter', () => {
  it('validates config', () => {
    const adapter = new LlmAdapter({ model: 'test' });
    expect(adapter.config).toEqual({ model: 'test' });
  });

  it('throws on invalid config', () => {
    expect(() => new LlmAdapter(null)).toThrow('Config must be an object');
    expect(() => new LlmAdapter('string')).toThrow('Config must be an object');
  });

  it('initialize does nothing by default', async () => {
    const adapter = new LlmAdapter({});
    await expect(adapter.initialize()).resolves.toBeUndefined();
  });

  it('chat throws by default', async () => {
    const adapter = new LlmAdapter({});
    await expect(adapter.chat([])).rejects.toThrow('Method "chat" must be implemented by subclass');
  });

  it('health returns ok when chat succeeds', async () => {
    class GoodAdapter extends LlmAdapter {
      async chat() { return { content: 'hi' }; }
    }
    const adapter = new GoodAdapter({});
    const health = await adapter.health();
    expect(health.ok).toBe(true);
    expect(health.latency).toBeGreaterThanOrEqual(0);
  });

  it('health returns error when chat fails', async () => {
    class BadAdapter extends LlmAdapter {
      async chat() { throw new Error('down'); }
    }
    const adapter = new BadAdapter({});
    const health = await adapter.health();
    expect(health.ok).toBe(false);
    expect(health.error).toBe('down');
  });

  it('metadata throws by default', () => {
    expect(() => LlmAdapter.metadata).toThrow('Property "metadata" must be implemented by subclass');
  });
});

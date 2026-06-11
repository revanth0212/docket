// tests/unit/adapters/llm/ollama/index.test.js

const { OllamaLlmAdapter } = require('../../../../../src/adapters/llm/ollama');

describe('OllamaLlmAdapter', () => {
  let adapter;
  let fetchMock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    adapter = new OllamaLlmAdapter({ baseUrl: 'http://ollama:11434', model: 'llama3.2' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses default config values', () => {
    const a = new OllamaLlmAdapter({});
    expect(a.baseUrl).toBe('http://localhost:11434');
    expect(a.model).toBe('llama3.2');
    expect(a.timeout).toBe(30000);
  });

  it('returns metadata', () => {
    expect(OllamaLlmAdapter.metadata.name).toBe('ollama-llm');
  });

  it('chats and parses response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        model: 'llama3.2',
        message: { content: ' Hello there ' },
        prompt_eval_count: 10,
        eval_count: 5,
        done: true
      })
    });

    const response = await adapter.chat([
      { role: 'user', content: 'Hi' }
    ], { temperature: 0.5, maxTokens: 50 });

    expect(response.content).toBe('Hello there');
    expect(response.usage).toEqual({ prompt: 10, completion: 5, total: 15 });
    expect(response.finishReason).toBe('stop');
    expect(response.model).toBe('llama3.2');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe('llama3.2');
    expect(body.options.temperature).toBe(0.5);
    expect(body.options.num_predict).toBe(50);
  });

  it('uses override model from options', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: { content: 'ok' },
        done: true
      })
    });

    await adapter.chat([{ role: 'user', content: 'Hi' }], { model: 'custom' });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe('custom');
  });

  it('throws on HTTP error', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'error' });
    await expect(adapter.chat([{ role: 'user', content: 'Hi' }])).rejects.toThrow('Ollama HTTP 500');
  });

  it('throws on timeout', async () => {
    adapter.timeout = 1;
    fetchMock.mockImplementationOnce(() => new Promise((_, reject) => {
      const err = new Error('timeout');
      err.name = 'AbortError';
      setTimeout(() => reject(err), 10);
    }));

    await expect(adapter.chat([{ role: 'user', content: 'Hi' }])).rejects.toThrow('timed out after 1ms');
  });

  it('returns health ok', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ models: [] }) });
    const health = await adapter.health();
    expect(health.ok).toBe(true);
  });

  it('returns health error on failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('connection refused'));
    const health = await adapter.health();
    expect(health.ok).toBe(false);
  });

  it('initialize throws when health fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('down'));
    await expect(adapter.initialize()).rejects.toThrow('Ollama unreachable');
  });
});

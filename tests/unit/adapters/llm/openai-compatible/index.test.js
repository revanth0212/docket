// tests/unit/adapters/llm/openai-compatible/index.test.js

const { OpenAiCompatibleLlmAdapter } = require('../../../../../src/adapters/llm/openai-compatible');

describe('OpenAiCompatibleLlmAdapter', () => {
  let adapter;
  let fetchMock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    adapter = new OpenAiCompatibleLlmAdapter({
      baseUrl: 'http://localhost:1234/v1',
      apiKey: 'sk-test',
      model: 'gpt-4'
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses default config values', () => {
    const a = new OpenAiCompatibleLlmAdapter({});
    expect(a.baseUrl).toBe('http://localhost:1234/v1');
    expect(a.apiKey).toBe('');
  });

  it('strips trailing slash from baseUrl', () => {
    const a = new OpenAiCompatibleLlmAdapter({ baseUrl: 'http://host/v1/' });
    expect(a.baseUrl).toBe('http://host/v1');
  });

  it('returns metadata', () => {
    expect(OpenAiCompatibleLlmAdapter.metadata.name).toBe('openai-compatible-llm');
  });

  it('chats and parses response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        model: 'gpt-4',
        choices: [{
          message: { content: ' Hello there ' },
          finish_reason: 'stop'
        }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      })
    });

    const response = await adapter.chat([
      { role: 'system', content: 'Be helpful' },
      { role: 'user', content: 'Hi' }
    ], { temperature: 0.5, maxTokens: 50 });

    expect(response.content).toBe('Hello there');
    expect(response.usage).toEqual({ prompt: 10, completion: 5, total: 15 });
    expect(response.finishReason).toBe('stop');
    expect(response.model).toBe('gpt-4');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe('gpt-4');
    expect(body.temperature).toBe(0.5);
    expect(body.max_tokens).toBe(50);
    expect(body.messages).toEqual([
      { role: 'system', content: 'Be helpful' },
      { role: 'user', content: 'Hi' }
    ]);
  });

  it('omits max_tokens when undefined', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
        usage: {}
      })
    });

    await adapter.chat([{ role: 'user', content: 'Hi' }]);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.max_tokens).toBeUndefined();
  });

  it('uses override model from options', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
        usage: {}
      })
    });

    await adapter.chat([{ role: 'user', content: 'Hi' }], { model: 'custom' });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe('custom');
  });

  it('sends request without api key when key is empty', async () => {
    const a = new OpenAiCompatibleLlmAdapter({ baseUrl: 'http://host/v1', model: 'm' });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
        usage: {}
      })
    });

    await a.chat([{ role: 'user', content: 'Hi' }]);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://host/v1/chat/completions',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' }
      })
    );
  });

  it('throws on HTTP error', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401, text: async () => 'unauthorized' });
    await expect(adapter.chat([{ role: 'user', content: 'Hi' }])).rejects.toThrow('LLM HTTP 401');
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
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });
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
    await expect(adapter.initialize()).rejects.toThrow('LLM unreachable');
  });
});

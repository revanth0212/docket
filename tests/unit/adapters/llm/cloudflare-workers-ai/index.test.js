// tests/unit/adapters/llm/cloudflare-workers-ai/index.test.js

const { CloudflareWorkersAiLlmAdapter } = require('../../../../../src/adapters/llm/cloudflare-workers-ai');

describe('CloudflareWorkersAiLlmAdapter', () => {
  let adapter;
  let fetchMock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    adapter = new CloudflareWorkersAiLlmAdapter({
      accountId: 'acct',
      apiToken: 'token',
      model: '@cf/meta/llama-3.1-8b-instruct'
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses default config values', () => {
    const a = new CloudflareWorkersAiLlmAdapter({ accountId: 'acct', apiToken: 'token' });
    expect(a.model).toBe('@cf/meta/llama-3.1-8b-instruct');
  });

  it('returns metadata', () => {
    expect(CloudflareWorkersAiLlmAdapter.metadata.name).toBe('cloudflare-workers-ai-llm');
  });

  it('chats and parses response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: {
          response: ' Hello there ',
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
        }
      })
    });

    const response = await adapter.chat([
      { role: 'user', content: 'Hi' }
    ], { temperature: 0.5, maxTokens: 50 });

    expect(response.content).toBe('Hello there');
    expect(response.usage).toEqual({ prompt: 10, completion: 5, total: 15 });
    expect(response.finishReason).toBe('stop');
    expect(response.model).toBe('@cf/meta/llama-3.1-8b-instruct');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/accounts/acct/ai/run/@cf/meta/llama-3.1-8b-instruct',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token'
        }
      })
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages).toEqual([{ role: 'user', content: 'Hi' }]);
    expect(body.temperature).toBe(0.5);
    expect(body.max_tokens).toBe(50);
  });

  it('omits max_tokens when undefined', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: { response: 'ok' } })
    });

    await adapter.chat([{ role: 'user', content: 'Hi' }]);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.max_tokens).toBeUndefined();
  });

  it('uses override model from options', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: { response: 'ok' } })
    });

    await adapter.chat([{ role: 'user', content: 'Hi' }], { model: 'custom' });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('ai/run/custom'),
      expect.anything()
    );
  });

  it('stringifies non-string response content', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: { response: { answer: 42 } } })
    });

    const response = await adapter.chat([{ role: 'user', content: 'Hi' }]);
    expect(response.content).toBe('{"answer":42}');
  });

  it('throws on HTTP error', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403, text: async () => 'forbidden' });
    await expect(adapter.chat([{ role: 'user', content: 'Hi' }])).rejects.toThrow('Workers AI HTTP 403');
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
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ result: [] }) });
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
    await expect(adapter.initialize()).rejects.toThrow('Workers AI unreachable');
  });
});

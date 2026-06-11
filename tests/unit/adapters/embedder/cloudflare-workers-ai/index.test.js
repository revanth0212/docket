// tests/unit/adapters/embedder/cloudflare-workers-ai/index.test.js

const { CloudflareWorkersAiEmbedderAdapter } = require('../../../../../src/adapters/embedder/cloudflare-workers-ai');

describe('CloudflareWorkersAiEmbedderAdapter', () => {
  let adapter;
  let fetchMock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    adapter = new CloudflareWorkersAiEmbedderAdapter({
      accountId: 'acct',
      apiToken: 'token',
      model: '@cf/baai/bge-base-en-v1.5',
      dimensions: 3
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses default config values', () => {
    const a = new CloudflareWorkersAiEmbedderAdapter({ accountId: 'acct', apiToken: 'token' });
    expect(a.model).toBe('@cf/baai/bge-base-en-v1.5');
    expect(a.dimensions).toBeNull();
  });

  it('returns metadata', () => {
    expect(CloudflareWorkersAiEmbedderAdapter.metadata.name).toBe('cloudflare-workers-ai-embedder');
  });

  it('embeds a single text', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: { data: [[0.1, 0.2, 0.3]] } })
    });

    const vector = await adapter.embed('hello');
    expect(vector).toEqual([0.1, 0.2, 0.3]);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/accounts/acct/ai/run/@cf/baai/bge-base-en-v1.5',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token'
        },
        body: JSON.stringify({ text: ['hello'] })
      })
    );
  });

  it('embeds a batch', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: [[0.1], [0.2]] })
    });

    const vectors = await adapter.embedBatch(['a', 'b']);
    expect(vectors).toEqual([[0.1], [0.2]]);
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ text: ['a', 'b'] }));
  });

  it('throws on HTTP error', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403, text: async () => 'forbidden' });
    await expect(adapter.embed('hello')).rejects.toThrow('Workers AI HTTP 403');
  });

  it('throws when no embeddings returned', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ result: {} }) });
    await expect(adapter.embed('hello')).rejects.toThrow('No embeddings returned');
  });

  it('throws on timeout', async () => {
    adapter.timeout = 1;
    fetchMock.mockImplementationOnce(() => new Promise((_, reject) => {
      const err = new Error('timeout');
      err.name = 'AbortError';
      setTimeout(() => reject(err), 10);
    }));

    await expect(adapter.embed('hello')).rejects.toThrow('timed out after 1ms');
  });

  it('returns configured dimensions', async () => {
    expect(await adapter.getDimensions()).toBe(3);
  });

  it('falls back to super.getDimensions when not configured', async () => {
    const a = new CloudflareWorkersAiEmbedderAdapter({ accountId: 'acct', apiToken: 'token' });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: { data: [[0.1, 0.2]] } })
    });

    expect(await a.getDimensions()).toBe(2);
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

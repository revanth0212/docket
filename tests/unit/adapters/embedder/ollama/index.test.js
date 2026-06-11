// tests/unit/adapters/embedder/ollama/index.test.js

const { OllamaEmbedderAdapter } = require('../../../../../src/adapters/embedder/ollama');

describe('OllamaEmbedderAdapter', () => {
  let adapter;
  let fetchMock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    adapter = new OllamaEmbedderAdapter({ baseUrl: 'http://ollama:11434', model: 'nomic-embed-text' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses default config values', () => {
    const a = new OllamaEmbedderAdapter({});
    expect(a.baseUrl).toBe('http://localhost:11434');
    expect(a.model).toBe('nomic-embed-text');
    expect(a.timeout).toBe(30000);
  });

  it('returns metadata', () => {
    expect(OllamaEmbedderAdapter.metadata.name).toBe('ollama-embedder');
  });

  it('embeds a single text', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ embedding: [0.1, 0.2, 0.3] })
    });

    const vector = await adapter.embed('hello');
    expect(vector).toEqual([0.1, 0.2, 0.3]);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://ollama:11434/api/embeddings',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'nomic-embed-text', prompt: 'hello' })
      })
    );
  });

  it('embeds a batch sequentially', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ embedding: [0.1] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ embedding: [0.2] }) });

    const vectors = await adapter.embedBatch(['a', 'b']);
    expect(vectors).toEqual([[0.1], [0.2]]);
  });

  it('throws on HTTP error', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'error' });
    await expect(adapter.embed('hello')).rejects.toThrow('Ollama HTTP 500');
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

  it('returns dimensions', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ embedding: [0.1, 0.2] }) });
    expect(await adapter.getDimensions()).toBe(2);
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

// tests/unit/adapters/embedder/openai-compatible/index.test.js

const { OpenAiCompatibleEmbedderAdapter } = require('../../../../../src/adapters/embedder/openai-compatible');

describe('OpenAiCompatibleEmbedderAdapter', () => {
  let adapter;
  let fetchMock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    adapter = new OpenAiCompatibleEmbedderAdapter({
      baseUrl: 'http://localhost:1234/v1',
      apiKey: 'sk-test',
      model: 'text-embedding-3-small',
      dimensions: 3
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses default config values', () => {
    const a = new OpenAiCompatibleEmbedderAdapter({});
    expect(a.baseUrl).toBe('http://localhost:1234/v1');
    expect(a.apiKey).toBe('');
    expect(a.dimensions).toBeNull();
  });

  it('strips trailing slash from baseUrl', () => {
    const a = new OpenAiCompatibleEmbedderAdapter({ baseUrl: 'http://host/v1/' });
    expect(a.baseUrl).toBe('http://host/v1');
  });

  it('returns metadata', () => {
    expect(OpenAiCompatibleEmbedderAdapter.metadata.name).toBe('openai-compatible-embedder');
  });

  it('embeds a single text', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ embedding: [0.1, 0.2, 0.3] }] })
    });

    const vector = await adapter.embed('hello');
    expect(vector).toEqual([0.1, 0.2, 0.3]);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:1234/v1/embeddings',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer sk-test'
        },
        body: JSON.stringify({ model: 'text-embedding-3-small', input: 'hello' })
      })
    );
  });

  it('embeds a batch', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { embedding: [0.1] },
          { embedding: [0.2] }
        ]
      })
    });

    const vectors = await adapter.embedBatch(['a', 'b']);
    expect(vectors).toEqual([[0.1], [0.2]]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends request without api key when key is empty', async () => {
    const a = new OpenAiCompatibleEmbedderAdapter({ baseUrl: 'http://host/v1', model: 'm' });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ embedding: [0.1] }] })
    });

    await a.embed('hello');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://host/v1/embeddings',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' }
      })
    );
  });

  it('throws on HTTP error', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401, text: async () => 'unauthorized' });
    await expect(adapter.embed('hello')).rejects.toThrow('Embedder HTTP 401');
  });

  it('throws when no embedding returned', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });
    await expect(adapter.embed('hello')).rejects.toThrow('No embedding returned');
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
    const a = new OpenAiCompatibleEmbedderAdapter({ baseUrl: 'http://host/v1', model: 'm' });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ embedding: [0.1, 0.2] }] })
    });

    expect(await a.getDimensions()).toBe(2);
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
    await expect(adapter.initialize()).rejects.toThrow('Embedder unreachable');
  });
});

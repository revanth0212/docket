// tests/integration/adapter-contracts/embedder-contract.test.js
// Contract tests for ALL embedder adapters
// Run with: ADAPTER=ollama npm test embedder-contract

const { loadConfig } = require('../../../src/core/config/loader');
const { AdapterRegistry } = require('../../../src/core/utils/adapter-registry');

describe('EmbedderAdapter Contract', () => {
  let embedder;
  let registry;
  let fetchMock;

  beforeAll(async () => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;

    // Mock a healthy Ollama-compatible /models endpoint so the default
    // adapter initializes without a running service.
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ models: [] })
    });

    const config = loadConfig();
    registry = new AdapterRegistry();

    const testAdapter = process.env.ADAPTER || config.docket.adapters.embedder.default;
    const providerConfig = config.docket.adapters.embedder.providers[testAdapter];

    embedder = await registry.loadAdapter('embedder', testAdapter, providerConfig);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('metadata', () => {
    it('has required metadata', () => {
      const metadata = embedder.constructor.metadata;
      expect(metadata).toBeDefined();
      expect(metadata.name).toBeDefined();
      expect(metadata.version).toBeDefined();
      expect(metadata.capabilities).toBeInstanceOf(Array);
    });
  });

  describe('health', () => {
    it('returns health status', async () => {
      const health = await embedder.health();
      expect(health).toHaveProperty('ok');
      expect(health).toHaveProperty('latency');
    });
  });

  describe('embed', () => {
    beforeEach(() => {
      fetchMock.mockReset();
    });

    it('embeds a single text', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [0.1, 0.2, 0.3] })
      });

      const vector = await embedder.embed('The quick brown fox');
      expect(Array.isArray(vector)).toBe(true);
      expect(vector.length).toBeGreaterThan(0);
      expect(typeof vector[0]).toBe('number');
    });

    it('embeds multiple texts in batch', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: [0.1] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: [0.2] })
        });

      const vectors = await embedder.embedBatch([
        'First sentence',
        'Second sentence'
      ]);

      expect(Array.isArray(vectors)).toBe(true);
      expect(vectors.length).toBe(2);
      expect(Array.isArray(vectors[0])).toBe(true);
      expect(vectors[0].length).toBeGreaterThan(0);
      expect(vectors[0].length).toBe(vectors[1].length);
    });

    it('reports dimensions', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [0.1, 0.2, 0.3] })
      });

      const dims = await embedder.getDimensions();
      expect(typeof dims).toBe('number');
      expect(dims).toBeGreaterThan(0);
    });
  });
});

// tests/integration/adapter-contracts/llm-contract.test.js
// Contract tests for ALL LLM adapters
// Run with: ADAPTER=ollama npm test llm-contract

const { loadConfig } = require('../../../src/core/config/loader');
const { AdapterRegistry } = require('../../../src/core/utils/adapter-registry');

describe('LlmAdapter Contract', () => {
  let llm;
  let registry;
  let fetchMock;

  beforeAll(async () => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;

    // Mock a healthy OpenAI-compatible /models endpoint so the default
    // adapter initializes without a running service.
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });

    const config = loadConfig();
    registry = new AdapterRegistry();

    const testAdapter = process.env.ADAPTER || config.docket.adapters.llm.default;
    const providerConfig = config.docket.adapters.llm.providers[testAdapter];

    llm = await registry.loadAdapter('llm', testAdapter, providerConfig);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('metadata', () => {
    it('has required metadata', () => {
      const metadata = llm.constructor.metadata;
      expect(metadata).toBeDefined();
      expect(metadata.name).toBeDefined();
      expect(metadata.version).toBeDefined();
      expect(metadata.capabilities).toBeInstanceOf(Array);
    });
  });

  describe('health', () => {
    it('returns health status', async () => {
      const health = await llm.health();
      expect(health).toHaveProperty('ok');
      expect(health).toHaveProperty('latency');
    });
  });

  describe('chat', () => {
    beforeEach(() => {
      fetchMock.mockReset();
    });

    it('responds to a simple message', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          model: 'local-model',
          choices: [{
            message: { content: ' Hello there ' },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
        })
      });

      const response = await llm.chat([
        { role: 'user', content: 'Say "hello" and nothing else.' }
      ], { maxTokens: 20 });

      expect(response).toHaveProperty('content');
      expect(typeof response.content).toBe('string');
      expect(response.content.length).toBeGreaterThan(0);
      expect(response).toHaveProperty('usage');
      expect(response.usage).toHaveProperty('total');
    });

    it('handles system prompts', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          model: 'local-model',
          choices: [{
            message: { content: 'Hi there' },
            finish_reason: 'stop'
          }],
          usage: {}
        })
      });

      const response = await llm.chat([
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hi' }
      ], { maxTokens: 20 });

      expect(response.content).toBeTruthy();
    });
  });
});

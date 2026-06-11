// tests/integration/adapter-contracts/llm-contract.test.js
// Contract tests for ALL LLM adapters
// Run with: ADAPTER=ollama npm test llm-contract

const { loadConfig } = require('../../../src/core/config/loader');
const { AdapterRegistry } = require('../../../src/core/utils/adapter-registry');

describe('LlmAdapter Contract', () => {
  let llm;
  let registry;

  beforeAll(async () => {
    const config = loadConfig();
    registry = new AdapterRegistry();

    const testAdapter = process.env.ADAPTER || config.docket.adapters.llm.default;
    const providerConfig = config.docket.adapters.llm.providers[testAdapter];

    llm = await registry.loadAdapter('llm', testAdapter, providerConfig);
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
    it('responds to a simple message', async () => {
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
      const response = await llm.chat([
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hi' }
      ], { maxTokens: 20 });

      expect(response.content).toBeTruthy();
    });
  });
});

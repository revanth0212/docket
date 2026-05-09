// src/adapters/llm/ollama/index.js
// STUB: Phase 1 scaffold — will be replaced with real Ollama implementation in Phase 2

const { LlmAdapter } = require('../../../core/interfaces/llm-adapter');

/**
 * Ollama LLM Adapter (stub)
 * @implements {LlmAdapter}
 */
class OllamaLlmAdapter extends LlmAdapter {
  async initialize() {
    // Stub: no-op
  }

  static get metadata() {
    return {
      name: 'ollama-llm',
      version: '0.1.0',
      capabilities: ['chat'],
      cortexCompatibility: '>=0.1.0 <0.3.0'
    };
  }
}

module.exports = { OllamaLlmAdapter };

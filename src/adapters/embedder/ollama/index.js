// src/adapters/embedder/ollama/index.js
// STUB: Phase 1 scaffold — will be replaced with real Ollama implementation in Phase 2

const { EmbedderAdapter } = require('../../../core/interfaces/embedder-adapter');

/**
 * Ollama Embedder Adapter (stub)
 * @implements {EmbedderAdapter}
 */
class OllamaEmbedderAdapter extends EmbedderAdapter {
  async initialize() {
    // Stub: no-op
  }

  static get metadata() {
    return {
      name: 'ollama-embedder',
      version: '0.1.0',
      capabilities: ['embed', 'embedBatch'],
      cortexCompatibility: '>=0.1.0 <0.3.0'
    };
  }
}

module.exports = { OllamaEmbedderAdapter };

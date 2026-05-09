// src/core/interfaces/embedder-adapter.js
// FROZEN INTERFACE — Requires architect approval to modify

/**
 * Embedder Adapter Interface
 * 
 * All embedding providers (Ollama, OpenAI, local models, etc.) implement this contract.
 * Core knows nothing about the embedder — only this interface.
 * 
 * @abstract
 */
class EmbedderAdapter {
  constructor(config) {
    this.config = this.validateConfig(config);
  }

  validateConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Config must be an object');
    }
    return config;
  }

  /**
   * Initialize embedder connection
   * @returns {Promise<void>}
   */
  async initialize() {
    // Override if needed
  }

  /**
   * Generate embedding for single text
   * @param {string} text — Text to embed
   * @returns {Promise<number[]>} — Vector of floats
   */
  // eslint-disable-next-line require-await, no-unused-vars
  async embed(text) {
    throw new Error('Method "embed" must be implemented by subclass');
  }

  /**
   * Generate embeddings for multiple texts (batch)
   * @param {string[]} texts — Array of texts
   * @returns {Promise<number[][]>} — Array of vectors
   */
  async embedBatch(texts) {
    // Default: sequential single embeds
    const results = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }

  /**
   * Get embedding dimensions
   * @returns {Promise<number>}
   */
  async getDimensions() {
    const test = await this.embed('test');
    return test.length;
  }

  /**
   * Check embedder health
   * @returns {Promise<{ok: boolean, latency: number, error?: string}>}
   */
  async health() {
    const start = Date.now();
    try {
      await this.embed('health check');
      return { ok: true, latency: Date.now() - start };
    } catch (err) {
      return { ok: false, latency: Date.now() - start, error: err.message };
    }
  }

  static get metadata() {
    throw new Error('Property "metadata" must be implemented by subclass');
  }
}

module.exports = { EmbedderAdapter };

// src/core/interfaces/llm-adapter.js
// FROZEN INTERFACE — Requires architect approval to modify

/**
 * @typedef {Object} ChatMessage
 * @property {'system'|'user'|'assistant'} role
 * @property {string} content
 * @property {Array<{type: 'text'|'image_url', text?: string, image_url?: {url: string}}>} [contentParts]
 *   For multimodal messages (future support)
 */

/**
 * @typedef {Object} ChatOptions
 * @property {number} [temperature=0.7]
 * @property {number} [maxTokens]
 * @property {string} [model] — Override default model for this request
 * @property {boolean} [stream=false] — Whether to stream response (future)
 */

/**
 * @typedef {Object} ChatResponse
 * @property {string} content — The generated text
 * @property {Object} usage
 * @property {number} usage.prompt — Prompt tokens consumed
 * @property {number} usage.completion — Completion tokens consumed
 * @property {number} usage.total — Total tokens
 * @property {string} [finishReason] — 'stop' | 'length' | 'error'
 * @property {string} [model] — Actual model used
 */

/**
 * LLM Adapter Interface
 * 
 * All LLM providers (Ollama, OpenAI, Kimi, Anthropic, etc.) implement this contract.
 * Core knows nothing about the provider — only this interface.
 * 
 * @abstract
 */
class LlmAdapter {
  /**
   * Create adapter instance
   * @param {Object} config — Provider-specific configuration
   */
  constructor(config) {
    this.config = this.validateConfig(config);
  }

  /**
   * Validate and normalize configuration
   * @param {Object} config
   * @returns {Object} — Normalized config
   * @throws {ValidationError} If required fields missing
   * @protected
   */
  validateConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Config must be an object');
    }
    return config;
  }

  /**
   * Initialize adapter (connect to service, warm up)
   * @returns {Promise<void>}
   */
  async initialize() {
    // Override in subclass if needed
  }

  /**
   * Send chat completion request
   * @param {ChatMessage[]} messages — Conversation history
   * @param {ChatOptions} [options={}] — Generation parameters
   * @returns {Promise<ChatResponse>}
   * @throws {AdapterError} On connection or API failure
   */
  // eslint-disable-next-line require-await, no-unused-vars
  async chat(messages, _options = {}) {
    throw new Error('Method "chat" must be implemented by subclass');
  }

  /**
   * Check adapter health
   * @returns {Promise<{ok: boolean, latency: number, error?: string}>}
   */
  async health() {
    const start = Date.now();
    try {
      await this.chat([{ role: 'user', content: 'Hi' }], { maxTokens: 1 });
      return { ok: true, latency: Date.now() - start };
    } catch (err) {
      return { ok: false, latency: Date.now() - start, error: err.message };
    }
  }

  /**
   * Adapter metadata for discovery and compatibility checking
   * @returns {{name: string, version: string, capabilities: string[], docketCompatibility: string}}
   */
  static get metadata() {
    throw new Error('Property "metadata" must be implemented by subclass');
  }
}

module.exports = { LlmAdapter };

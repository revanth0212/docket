const { EmbedderAdapter } = require('../../../core/interfaces/embedder-adapter');

/**
 * Cloudflare Workers AI Embedder Adapter
 * Uses the Cloudflare Workers AI REST API for embeddings.
 * @implements {EmbedderAdapter}
 */
class CloudflareWorkersAiEmbedderAdapter extends EmbedderAdapter {
  constructor(config) {
    super(config);
    this.accountId = this.config.accountId;
    this.apiToken = this.config.apiToken;
    this.model = this.config.model || '@cf/baai/bge-base-en-v1.5';
    this.timeout = this.config.timeout || 30000;
    this.dimensions = this.config.dimensions || null;
  }

  async initialize() {
    const health = await this.health();
    if (!health.ok) {
      throw new Error(`Workers AI unreachable: ${health.error}`);
    }
  }

  async embed(text) {
    const response = await this.fetchEmbedding([text]);
    return response.embeddings[0];
  }

  async embedBatch(texts) {
    const response = await this.fetchEmbedding(texts);
    return response.embeddings;
  }

  async fetchEmbedding(texts) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${this.model}`;
    const body = { text: texts };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiToken}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Workers AI HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();
      const embeddings = data.result?.data || data.result;
      if (!embeddings || !Array.isArray(embeddings)) {
        throw new Error('No embeddings returned');
      }
      return { embeddings };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Workers AI request timed out after ${this.timeout}ms`);
      }
      throw err;
    }
  }

  async getDimensions() {
    if (this.dimensions) return this.dimensions;
    return super.getDimensions();
  }

  async health() {
    const start = Date.now();
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/models/search`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${this.apiToken}` },
        signal: AbortSignal.timeout(5000)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { ok: true, latency: Date.now() - start };
    } catch (err) {
      return { ok: false, latency: Date.now() - start, error: err.message };
    }
  }

  static get metadata() {
    return {
      name: 'cloudflare-workers-ai-embedder',
      version: '0.1.0',
      capabilities: ['embed', 'embedBatch'],
      cortexCompatibility: '>=0.1.0 <0.3.0'
    };
  }
}

module.exports = { CloudflareWorkersAiEmbedderAdapter };

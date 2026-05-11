const { EmbedderAdapter } = require('../../../core/interfaces/embedder-adapter');

/**
 * OpenAI-Compatible Embedder Adapter
 * Works with OpenAI, LM Studio, and any provider that exposes
 * the /v1/embeddings endpoint.
 * @implements {EmbedderAdapter}
 */
class OpenAiCompatibleEmbedderAdapter extends EmbedderAdapter {
  constructor(config) {
    super(config);
    this.baseUrl = this.config.baseUrl || 'http://localhost:1234/v1';
    this.apiKey = this.config.apiKey || '';
    this.model = this.config.model || '';
    this.timeout = this.config.timeout || 30000;
    this.dimensions = this.config.dimensions || null;

    this.baseUrl = this.baseUrl.replace(/\/$/, '');
  }

  async initialize() {
    const health = await this.health();
    if (!health.ok) {
      throw new Error(`Embedder unreachable at ${this.baseUrl}: ${health.error}`);
    }
  }

  async embed(text) {
    const response = await this.fetchEmbedding(text);
    return response.embedding;
  }

  async embedBatch(texts) {
    // OpenAI supports batching natively via array input
    const url = `${this.baseUrl}/embeddings`;
    const body = {
      model: this.model,
      input: texts
    };

    const headers = {
      'Content-Type': 'application/json'
    };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Embedder HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();
      return data.data.map((d) => d.embedding);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Embedder request timed out after ${this.timeout}ms`);
      }
      throw err;
    }
  }

  async fetchEmbedding(text) {
    const url = `${this.baseUrl}/embeddings`;
    const body = {
      model: this.model,
      input: text
    };

    const headers = {
      'Content-Type': 'application/json'
    };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Embedder HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();
      const embedding = data.data?.[0]?.embedding;
      if (!embedding) {
        throw new Error('No embedding returned');
      }
      return { embedding };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Embedder request timed out after ${this.timeout}ms`);
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
      const url = `${this.baseUrl}/models`;
      const headers = {};
      if (this.apiKey) {
        headers.Authorization = `Bearer ${this.apiKey}`;
      }
      const res = await fetch(url, {
        headers,
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
      name: 'openai-compatible-embedder',
      version: '0.1.0',
      capabilities: ['embed', 'embedBatch'],
      cortexCompatibility: '>=0.1.0 <0.3.0'
    };
  }
}

module.exports = { OpenAiCompatibleEmbedderAdapter };

const { EmbedderAdapter } = require('../../../core/interfaces/embedder-adapter');

/**
 * Ollama Embedder Adapter
 * @implements {EmbedderAdapter}
 */
class OllamaEmbedderAdapter extends EmbedderAdapter {
  constructor(config) {
    super(config);
    this.baseUrl = this.config.baseUrl || 'http://localhost:11434';
    this.model = this.config.model || 'nomic-embed-text';
    this.timeout = this.config.timeout || 30000;
  }

  async initialize() {
    const health = await this.health();
    if (!health.ok) {
      throw new Error(`Ollama unreachable at ${this.baseUrl}: ${health.error}`);
    }
  }

  async embed(text) {
    const response = await this.fetchEmbedding(text);
    return response.embedding;
  }

  async embedBatch(texts) {
    // Ollama doesn't have a native batch embedding API, so we run sequentially
    const results = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }

  async fetchEmbedding(text) {
    const url = `${this.baseUrl}/api/embeddings`;
    const body = {
      model: this.model,
      prompt: text
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Ollama HTTP ${res.status}: ${text}`);
      }

      return await res.json();
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Ollama request timed out after ${this.timeout}ms`);
      }
      throw err;
    }
  }

  async health() {
    const start = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
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
      name: 'ollama-embedder',
      version: '0.1.0',
      capabilities: ['embed', 'embedBatch'],
      cortexCompatibility: '>=0.1.0 <0.3.0'
    };
  }
}

module.exports = { OllamaEmbedderAdapter };

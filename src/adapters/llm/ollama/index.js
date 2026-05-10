const { LlmAdapter } = require('../../../core/interfaces/llm-adapter');

/**
 * Ollama LLM Adapter
 * @implements {LlmAdapter}
 */
class OllamaLlmAdapter extends LlmAdapter {
  constructor(config) {
    super(config);
    this.baseUrl = this.config.baseUrl || 'http://localhost:11434';
    this.model = this.config.model || 'llama3.2';
    this.timeout = this.config.timeout || 30000;
  }

  async initialize() {
    // Warm-up: verify Ollama is reachable
    const health = await this.health();
    if (!health.ok) {
      throw new Error(`Ollama unreachable at ${this.baseUrl}: ${health.error}`);
    }
  }

  async chat(messages, options = {}) {
    const response = await this.fetchChat(messages, options);
    return this.parseResponse(response);
  }

  async fetchChat(messages, options) {
    const url = `${this.baseUrl}/api/chat`;
    const body = {
      model: options.model || this.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens
      }
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

  parseResponse(response) {
    const content = response.message?.content || '';
    const usage = {
      prompt: response.prompt_eval_count || 0,
      completion: response.eval_count || 0,
      total: (response.prompt_eval_count || 0) + (response.eval_count || 0)
    };

    return {
      content: content.trim(),
      usage,
      finishReason: response.done ? 'stop' : 'length',
      model: response.model || this.model
    };
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
      name: 'ollama-llm',
      version: '0.1.0',
      capabilities: ['chat'],
      cortexCompatibility: '>=0.1.0 <0.3.0'
    };
  }
}

module.exports = { OllamaLlmAdapter };

const { LlmAdapter } = require('../../../core/interfaces/llm-adapter');

/**
 * OpenAI-Compatible LLM Adapter
 * Works with OpenAI, Groq, Kimi, LM Studio, and any other
 * provider that exposes the /v1/chat/completions endpoint.
 * @implements {LlmAdapter}
 */
class OpenAiCompatibleLlmAdapter extends LlmAdapter {
  constructor(config) {
    super(config);
    this.baseUrl = this.config.baseUrl || 'http://localhost:1234/v1';
    this.apiKey = this.config.apiKey || '';
    this.model = this.config.model || '';
    this.timeout = this.config.timeout || 30000;

    // Ensure baseUrl does not end with a trailing slash
    this.baseUrl = this.baseUrl.replace(/\/$/, '');
  }

  async initialize() {
    const health = await this.health();
    if (!health.ok) {
      throw new Error(`LLM unreachable at ${this.baseUrl}: ${health.error}`);
    }
  }

  async chat(messages, options = {}) {
    const url = `${this.baseUrl}/chat/completions`;
    const body = {
      model: options.model || this.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content
      })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      stream: false
    };

    // Remove undefined fields
    if (body.max_tokens === undefined) delete body.max_tokens;

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
        throw new Error(`LLM HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();
      return this.parseResponse(data);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`LLM request timed out after ${this.timeout}ms`);
      }
      throw err;
    }
  }

  parseResponse(data) {
    const choice = data.choices?.[0];
    const content = choice?.message?.content || '';
    const usage = data.usage || {};

    return {
      content: content.trim(),
      usage: {
        prompt: usage.prompt_tokens || 0,
        completion: usage.completion_tokens || 0,
        total: usage.total_tokens || 0
      },
      finishReason: choice?.finish_reason || 'stop',
      model: data.model || this.model
    };
  }

  async health() {
    const start = Date.now();
    try {
      // Try /models first (OpenAI-compatible endpoint)
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
      name: 'openai-compatible-llm',
      version: '0.1.0',
      capabilities: ['chat'],
      docketCompatibility: '>=0.1.0 <0.3.0'
    };
  }
}

module.exports = { OpenAiCompatibleLlmAdapter };

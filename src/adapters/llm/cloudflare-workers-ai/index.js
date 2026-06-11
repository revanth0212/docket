const { LlmAdapter } = require('../../../core/interfaces/llm-adapter');

/**
 * Cloudflare Workers AI LLM Adapter
 * Uses the Cloudflare Workers AI REST API.
 * @implements {LlmAdapter}
 */
class CloudflareWorkersAiLlmAdapter extends LlmAdapter {
  constructor(config) {
    super(config);
    this.accountId = this.config.accountId;
    this.apiToken = this.config.apiToken;
    this.model = this.config.model || '@cf/meta/llama-3.1-8b-instruct';
    this.timeout = this.config.timeout || 30000;
  }

  async initialize() {
    const health = await this.health();
    if (!health.ok) {
      throw new Error(`Workers AI unreachable: ${health.error}`);
    }
  }

  async chat(messages, options = {}) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${options.model || this.model}`;
    const body = {
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content
      })),
      max_tokens: options.maxTokens,
      temperature: options.temperature ?? 0.7
    };

    if (body.max_tokens === undefined) delete body.max_tokens;

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
      return this.parseResponse(data);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Workers AI request timed out after ${this.timeout}ms`);
      }
      throw err;
    }
  }

  parseResponse(data) {
    const result = data.result;
    const content = result.response || '';
    const usage = result.usage || {};

    return {
      content: typeof content === 'string' ? content.trim() : JSON.stringify(content),
      usage: {
        prompt: usage.prompt_tokens || 0,
        completion: usage.completion_tokens || 0,
        total: usage.total_tokens || 0
      },
      finishReason: 'stop',
      model: this.model
    };
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
      name: 'cloudflare-workers-ai-llm',
      version: '0.1.0',
      capabilities: ['chat'],
      docketCompatibility: '>=0.1.0 <0.3.0'
    };
  }
}

module.exports = { CloudflareWorkersAiLlmAdapter };

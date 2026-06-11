const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { LlmAdapter } = require('../../../core/interfaces/llm-adapter');

/**
 * AWS Bedrock LLM Adapter
 * Supports Anthropic Claude, Meta Llama, and other Bedrock models.
 * @implements {LlmAdapter}
 */
class AwsBedrockLlmAdapter extends LlmAdapter {
  constructor(config) {
    super(config);
    this.region = this.config.region || 'us-east-1';
    this.accessKeyId = this.config.accessKeyId;
    this.secretAccessKey = this.config.secretAccessKey;
    this.model = this.config.model || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
    this.timeout = this.config.timeout || 60000;
  }

  async initialize() {
    const clientConfig = { region: this.region };
    if (this.accessKeyId && this.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey
      };
    }
    this.client = new BedrockRuntimeClient(clientConfig);

    const health = await this.health();
    if (!health.ok) {
      throw new Error(`Bedrock unreachable: ${health.error}`);
    }
  }

  async chat(messages, options = {}) {
    const modelId = options.model || this.model;
    const body = this._buildRequestBody(modelId, messages, options);

    const command = new InvokeModelCommand({
      modelId,
      body: JSON.stringify(body),
      contentType: 'application/json',
      accept: 'application/json'
    });

    const response = await this.client.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));
    return this._parseResponse(modelId, result);
  }

  _buildRequestBody(modelId, messages, options) {
    if (modelId.includes('anthropic')) {
      return {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: options.maxTokens || 1024,
        temperature: options.temperature ?? 0.7,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content
        }))
      };
    }

    if (modelId.includes('meta')) {
      return {
        prompt: this._formatPrompt(messages),
        max_gen_len: options.maxTokens || 1024,
        temperature: options.temperature ?? 0.7
      };
    }

    // Default fallback
    return {
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content
      })),
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature ?? 0.7
    };
  }

  _formatPrompt(messages) {
    return messages
      .map((m) => {
        const label = m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Assistant' : 'System';
        return `${label}: ${m.content}`;
      })
      .join('\n\n');
  }

  _parseResponse(modelId, result) {
    if (modelId.includes('anthropic')) {
      const content = result.content?.[0]?.text || '';
      const usage = result.usage || {};
      return {
        content: content.trim(),
        usage: {
          prompt: usage.input_tokens || 0,
          completion: usage.output_tokens || 0,
          total: (usage.input_tokens || 0) + (usage.output_tokens || 0)
        },
        finishReason: result.stop_reason || 'stop',
        model: modelId
      };
    }

    if (modelId.includes('meta')) {
      const content = result.generation || '';
      return {
        content: content.trim(),
        usage: {
          prompt: result.prompt_token_count || 0,
          completion: result.generation_token_count || 0,
          total: (result.prompt_token_count || 0) + (result.generation_token_count || 0)
        },
        finishReason: 'stop',
        model: modelId
      };
    }

    return {
      content: String(result.output || result.completion || '').trim(),
      usage: { prompt: 0, completion: 0, total: 0 },
      finishReason: 'stop',
      model: modelId
    };
  }

  async health() {
    const start = Date.now();
    try {
      // Try a minimal invoke to verify connectivity
      await this.chat([{ role: 'user', content: 'Hi' }], { maxTokens: 1 });
      return { ok: true, latency: Date.now() - start };
    } catch (err) {
      return { ok: false, latency: Date.now() - start, error: err.message };
    }
  }

  static get metadata() {
    return {
      name: 'aws-bedrock-llm',
      version: '0.1.0',
      capabilities: ['chat'],
      docketCompatibility: '>=0.1.0 <0.3.0'
    };
  }
}

module.exports = { AwsBedrockLlmAdapter };

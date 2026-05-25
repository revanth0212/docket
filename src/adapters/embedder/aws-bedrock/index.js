const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { EmbedderAdapter } = require('../../../core/interfaces/embedder-adapter');

/**
 * AWS Bedrock Embedder Adapter
 * Supports Amazon Titan embedding models via Bedrock.
 * @implements {EmbedderAdapter}
 */
class AwsBedrockEmbedderAdapter extends EmbedderAdapter {
  constructor(config) {
    super(config);
    this.region = this.config.region || 'us-east-1';
    this.accessKeyId = this.config.accessKeyId;
    this.secretAccessKey = this.config.secretAccessKey;
    this.model = this.config.model || 'amazon.titan-embed-text-v2:0';
    this.timeout = this.config.timeout || 30000;
    this.dimensions = this.config.dimensions || null;
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

  async embed(text) {
    const response = await this._invokeModel(text);
    return response.embedding;
  }

  async embedBatch(texts) {
    // Bedrock Titan does not natively support batch embedding
    const results = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }

  async _invokeModel(text) {
    const body = {
      inputText: text
    };

    if (this.dimensions) {
      body.dimensions = this.dimensions;
    }

    const command = new InvokeModelCommand({
      modelId: this.model,
      body: JSON.stringify(body),
      contentType: 'application/json',
      accept: 'application/json'
    });

    const response = await this.client.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));

    const embedding = result.embedding || result.embeddings?.[0];
    if (!embedding) {
      throw new Error('No embedding returned from Bedrock');
    }

    return { embedding };
  }

  async getDimensions() {
    if (this.dimensions) return this.dimensions;
    return super.getDimensions();
  }

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
    return {
      name: 'aws-bedrock-embedder',
      version: '0.1.0',
      capabilities: ['embed', 'embedBatch'],
      cortexCompatibility: '>=0.1.0 <0.3.0'
    };
  }
}

module.exports = { AwsBedrockEmbedderAdapter };

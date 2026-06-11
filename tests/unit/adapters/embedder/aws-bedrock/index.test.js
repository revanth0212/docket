// tests/unit/adapters/embedder/aws-bedrock/index.test.js

const { AwsBedrockEmbedderAdapter } = require('../../../../../src/adapters/embedder/aws-bedrock');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

jest.mock('@aws-sdk/client-bedrock-runtime');

describe('AwsBedrockEmbedderAdapter', () => {
  let adapter;
  let sendMock;

  beforeEach(async () => {
    sendMock = jest.fn();
    BedrockRuntimeClient.mockImplementation(() => ({ send: sendMock }));
    InvokeModelCommand.mockImplementation((input) => ({ ...input, _type: 'InvokeModel' }));

    adapter = new AwsBedrockEmbedderAdapter({
      region: 'us-west-2',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      model: 'amazon.titan-embed-text-v2:0',
      dimensions: 512
    });

    // initialize calls health which calls embed; mock success
    sendMock.mockResolvedValue({
      body: new TextEncoder().encode(JSON.stringify({ embedding: [0.1, 0.2] }))
    });
    await adapter.initialize();
    sendMock.mockClear();
    InvokeModelCommand.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
    InvokeModelCommand.mockClear();
  });

  it('uses default config values', () => {
    const a = new AwsBedrockEmbedderAdapter({});
    expect(a.region).toBe('us-east-1');
    expect(a.model).toBe('amazon.titan-embed-text-v2:0');
    expect(a.dimensions).toBeNull();
  });

  it('initializes with credentials', () => {
    expect(BedrockRuntimeClient).toHaveBeenCalledWith({
      region: 'us-west-2',
      credentials: {
        accessKeyId: 'key',
        secretAccessKey: 'secret'
      }
    });
  });

  it('initializes without credentials when omitted', async () => {
    BedrockRuntimeClient.mockClear();
    sendMock.mockResolvedValue({
      body: new TextEncoder().encode(JSON.stringify({ embedding: [0.1] }))
    });

    const a = new AwsBedrockEmbedderAdapter({});
    await a.initialize();

    expect(BedrockRuntimeClient).toHaveBeenCalledWith({ region: 'us-east-1' });
  });

  it('returns metadata', () => {
    expect(AwsBedrockEmbedderAdapter.metadata.name).toBe('aws-bedrock-embedder');
  });

  it('embeds a single text', async () => {
    sendMock.mockResolvedValueOnce({
      body: new TextEncoder().encode(JSON.stringify({ embedding: [0.1, 0.2, 0.3] }))
    });

    const vector = await adapter.embed('hello');
    expect(vector).toEqual([0.1, 0.2, 0.3]);

    expect(InvokeModelCommand).toHaveBeenCalledWith(expect.objectContaining({
      modelId: 'amazon.titan-embed-text-v2:0',
      contentType: 'application/json',
      accept: 'application/json'
    }));

    const command = InvokeModelCommand.mock.calls[0][0];
    const body = JSON.parse(command.body);
    expect(body.inputText).toBe('hello');
    expect(body.dimensions).toBe(512);
  });

  it('embeds a batch sequentially', async () => {
    sendMock
      .mockResolvedValueOnce({
        body: new TextEncoder().encode(JSON.stringify({ embedding: [0.1] }))
      })
      .mockResolvedValueOnce({
        body: new TextEncoder().encode(JSON.stringify({ embedding: [0.2] }))
      });

    const vectors = await adapter.embedBatch(['a', 'b']);
    expect(vectors).toEqual([[0.1], [0.2]]);
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it('handles embeddings array response', async () => {
    sendMock.mockResolvedValueOnce({
      body: new TextEncoder().encode(JSON.stringify({ embeddings: [[0.1, 0.2]] }))
    });

    const vector = await adapter.embed('hello');
    expect(vector).toEqual([0.1, 0.2]);
  });

  it('throws when no embedding returned', async () => {
    sendMock.mockResolvedValueOnce({
      body: new TextEncoder().encode(JSON.stringify({}))
    });
    await expect(adapter.embed('hello')).rejects.toThrow('No embedding returned from Bedrock');
  });

  it('returns configured dimensions', async () => {
    expect(await adapter.getDimensions()).toBe(512);
  });

  it('falls back to super.getDimensions when not configured', async () => {
    const a = new AwsBedrockEmbedderAdapter({});
    a.client = { send: sendMock };
    sendMock.mockResolvedValueOnce({
      body: new TextEncoder().encode(JSON.stringify({ embedding: [0.1, 0.2] }))
    });
    expect(await a.getDimensions()).toBe(2);
  });

  it('returns health ok', async () => {
    sendMock.mockResolvedValueOnce({
      body: new TextEncoder().encode(JSON.stringify({ embedding: [0.1] }))
    });
    const health = await adapter.health();
    expect(health.ok).toBe(true);
  });

  it('returns health error on failure', async () => {
    sendMock.mockRejectedValueOnce(new Error('bedrock down'));
    const health = await adapter.health();
    expect(health.ok).toBe(false);
    expect(health.error).toBe('bedrock down');
  });
});

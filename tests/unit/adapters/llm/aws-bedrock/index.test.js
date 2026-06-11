// tests/unit/adapters/llm/aws-bedrock/index.test.js

const { AwsBedrockLlmAdapter } = require('../../../../../src/adapters/llm/aws-bedrock');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

jest.mock('@aws-sdk/client-bedrock-runtime');

describe('AwsBedrockLlmAdapter', () => {
  let adapter;
  let sendMock;

  beforeEach(async () => {
    sendMock = jest.fn();
    BedrockRuntimeClient.mockImplementation(() => ({ send: sendMock }));
    InvokeModelCommand.mockImplementation((input) => ({ ...input, _type: 'InvokeModel' }));

    adapter = new AwsBedrockLlmAdapter({
      region: 'us-west-2',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      model: 'anthropic.claude-3-5-sonnet-20241022-v2:0'
    });

    sendMock.mockResolvedValue({
      body: new TextEncoder().encode(JSON.stringify({
        content: [{ text: ' Hello there ' }],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn'
      }))
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
    const a = new AwsBedrockLlmAdapter({});
    expect(a.region).toBe('us-east-1');
    expect(a.model).toBe('anthropic.claude-3-5-sonnet-20241022-v2:0');
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

  it('returns metadata', () => {
    expect(AwsBedrockLlmAdapter.metadata.name).toBe('aws-bedrock-llm');
  });

  it('chats with anthropic model', async () => {
    sendMock.mockResolvedValueOnce({
      body: new TextEncoder().encode(JSON.stringify({
        content: [{ text: ' Hello there ' }],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn'
      }))
    });

    const response = await adapter.chat([
      { role: 'user', content: 'Hi' }
    ], { temperature: 0.5, maxTokens: 50 });

    expect(response.content).toBe('Hello there');
    expect(response.usage).toEqual({ prompt: 10, completion: 5, total: 15 });
    expect(response.finishReason).toBe('end_turn');
    expect(response.model).toBe('anthropic.claude-3-5-sonnet-20241022-v2:0');

    const command = InvokeModelCommand.mock.calls[0][0];
    const body = JSON.parse(command.body);
    expect(body.anthropic_version).toBe('bedrock-2023-05-31');
    expect(body.max_tokens).toBe(50);
    expect(body.temperature).toBe(0.5);
  });

  it('chats with meta model', async () => {
    sendMock.mockResolvedValueOnce({
      body: new TextEncoder().encode(JSON.stringify({
        generation: ' Hi ',
        prompt_token_count: 10,
        generation_token_count: 5
      }))
    });

    const response = await adapter.chat([
      { role: 'user', content: 'Hi' }
    ], { model: 'meta.llama-3-8b-instruct-v1:0' });

    expect(response.content).toBe('Hi');
    expect(response.usage).toEqual({ prompt: 10, completion: 5, total: 15 });
    expect(response.model).toBe('meta.llama-3-8b-instruct-v1:0');

    const command = InvokeModelCommand.mock.calls[0][0];
    const body = JSON.parse(command.body);
    expect(body.prompt).toContain('User: Hi');
    expect(body.max_gen_len).toBe(1024);
  });

  it('uses default fallback body for unknown models', async () => {
    sendMock.mockResolvedValueOnce({
      body: new TextEncoder().encode(JSON.stringify({ output: 'ok' }))
    });

    const response = await adapter.chat([
      { role: 'user', content: 'Hi' }
    ], { model: 'unknown.model' });

    expect(response.content).toBe('ok');

    const command = InvokeModelCommand.mock.calls[0][0];
    const body = JSON.parse(command.body);
    expect(body.messages).toEqual([{ role: 'user', content: 'Hi' }]);
  });

  it('throws on client error', async () => {
    sendMock.mockRejectedValueOnce(new Error('bedrock down'));
    await expect(adapter.chat([{ role: 'user', content: 'Hi' }])).rejects.toThrow('bedrock down');
  });

  it('returns health ok', async () => {
    sendMock.mockResolvedValueOnce({
      body: new TextEncoder().encode(JSON.stringify({
        content: [{ text: 'hi' }],
        usage: {},
        stop_reason: 'end_turn'
      }))
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

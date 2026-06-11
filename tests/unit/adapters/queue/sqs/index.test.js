// tests/unit/adapters/queue/sqs/index.test.js

const { SQSQueueAdapter } = require('../../../../../src/adapters/queue/sqs');
const {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  GetQueueAttributesCommand
} = require('@aws-sdk/client-sqs');

jest.mock('@aws-sdk/client-sqs');

describe('SQSQueueAdapter', () => {
  let adapter;
  let sendMock;

  beforeEach(async () => {
    sendMock = jest.fn();
    SQSClient.mockImplementation(() => ({ send: sendMock }));
    SendMessageCommand.mockImplementation((input) => ({ ...input, _type: 'SendMessage' }));
    ReceiveMessageCommand.mockImplementation((input) => ({ ...input, _type: 'ReceiveMessage' }));
    DeleteMessageCommand.mockImplementation((input) => ({ ...input, _type: 'DeleteMessage' }));
    GetQueueAttributesCommand.mockImplementation((input) => ({ ...input, _type: 'GetQueueAttributes' }));

    adapter = new SQSQueueAdapter({
      queueUrl: 'https://sqs.us-east-1.amazonaws.com/123/test',
      region: 'us-east-1',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      maxConcurrent: 2,
      retryAttempts: 2,
      retryDelay: 0
    });
    await adapter.initialize();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('uses default config values', () => {
    const a = new SQSQueueAdapter({ queueUrl: 'https://q' });
    expect(a.region).toBe('us-east-1');
    expect(a.maxConcurrent).toBe(5);
    expect(a.retryAttempts).toBe(3);
    expect(a.retryDelay).toBe(1000);
  });

  it('initializes SQS client with credentials', () => {
    expect(SQSClient).toHaveBeenCalledWith({
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'key',
        secretAccessKey: 'secret'
      }
    });
  });

  it('initializes SQS client without credentials when omitted', async () => {
    SQSClient.mockClear();
    const a = new SQSQueueAdapter({ queueUrl: 'https://q' });
    await a.initialize();
    expect(SQSClient).toHaveBeenCalledWith({ region: 'us-east-1' });
  });

  it('enqueues a job', async () => {
    sendMock.mockResolvedValue({});

    const job = await adapter.enqueue('ingest', { file: 'x.pdf' }, { priority: 5, delay: 2000 });

    expect(job.type).toBe('ingest');
    expect(job.payload).toEqual({ file: 'x.pdf' });
    expect(job.priority).toBe(5);

    expect(SendMessageCommand).toHaveBeenCalledWith(expect.objectContaining({
      QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123/test',
      MessageBody: expect.stringContaining('ingest'),
      MessageAttributes: {
        jobType: { DataType: 'String', StringValue: 'ingest' },
        priority: { DataType: 'Number', StringValue: '5' }
      },
      DelaySeconds: 2
    }));
    expect(sendMock).toHaveBeenCalled();
  });

  it('caps delay at SQS maximum of 900 seconds', async () => {
    sendMock.mockResolvedValue({});
    await adapter.enqueue('ingest', {}, { delay: 999999 });
    expect(SendMessageCommand).toHaveBeenCalledWith(expect.objectContaining({
      DelaySeconds: 900
    }));
  });

  it('dequeues a job', async () => {
    sendMock.mockResolvedValueOnce({});
    const enqueued = await adapter.enqueue('ingest', { file: 'x.pdf' });

    sendMock.mockReset();
    sendMock.mockResolvedValue({
      Messages: [{
        Body: JSON.stringify({ job: enqueued, handlerType: 'ingest' }),
        ReceiptHandle: 'receipt-1'
      }]
    });

    const job = await adapter.dequeue();

    expect(ReceiveMessageCommand).toHaveBeenCalledWith(expect.objectContaining({
      QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123/test',
      MaxNumberOfMessages: 1
    }));
    expect(job.status).toBe('processing');
    expect(job.attempts).toBe(1);
    expect(job.receiptHandle).toBe('receipt-1');
  });

  it('returns null when no messages available', async () => {
    sendMock.mockResolvedValue({ Messages: [] });
    const job = await adapter.dequeue();
    expect(job).toBeNull();
  });

  it('filters dequeue by type', async () => {
    sendMock.mockResolvedValue({
      Messages: [{
        Body: JSON.stringify({ job: { type: 'ingest' }, handlerType: 'ingest' }),
        ReceiptHandle: 'r'
      }]
    });

    const job = await adapter.dequeue('query');
    expect(job).toBeNull();
  });

  it('completes a job by deleting message', async () => {
    sendMock.mockResolvedValue({});
    const completed = await adapter.complete('job_123', { ok: true });

    expect(completed.status).toBe('completed');
    expect(completed.result).toEqual({ ok: true });
  });

  it('fails a job without retry', async () => {
    sendMock.mockResolvedValue({});
    const failed = await adapter.fail('job_123', 'boom', false);
    expect(failed.status).toBe('failed');
    expect(failed.error).toBe('boom');
  });

  it('fails a job with retry as pending', async () => {
    sendMock
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        Messages: [{
          Body: JSON.stringify({
            job: { id: 'job_123', type: 'ingest', payload: {}, attempts: 0, maxAttempts: 2, priority: 0, delay: 0, status: 'pending' },
            handlerType: 'ingest'
          }),
          ReceiptHandle: 'r'
        }]
      });

    await adapter.enqueue('ingest', {});
    await adapter.dequeue();

    const result = await adapter.fail('job_123', 'retry?', true);
    expect(result.status).toBe('pending');
    expect(result.error).toBe('retry?');
  });

  it('getJob always returns null', async () => {
    expect(await adapter.getJob('job_any')).toBeNull();
  });

  it('registers a worker', async () => {
    const handler = jest.fn();
    await adapter.registerWorker('ingest', handler);
    expect(adapter.workers.get('ingest')).toBe(handler);
  });

  it('runs a registered worker', async () => {
    const handler = jest.fn().mockResolvedValue({ done: true });
    await adapter.registerWorker('ingest', handler);

    sendMock.mockResolvedValue({});
    const job = await adapter.enqueue('ingest', { file: 'x.pdf' });

    sendMock.mockReset();
    sendMock
      .mockResolvedValueOnce({
        Messages: [{
          Body: JSON.stringify({ job, handlerType: 'ingest' }),
          ReceiptHandle: 'r'
        }]
      })
      .mockResolvedValue({ Messages: [] });

    await adapter.start();
    await new Promise(r => setImmediate(r));
    await adapter.stop();

    expect(handler).toHaveBeenCalledWith({ file: 'x.pdf' }, expect.objectContaining({ id: job.id }));
    expect(DeleteMessageCommand).toHaveBeenCalledWith(expect.objectContaining({
      ReceiptHandle: 'r'
    }));
  });

  it('handles worker errors', async () => {
    const handler = jest.fn().mockRejectedValue(new Error('worker failed'));
    await adapter.registerWorker('ingest', handler);

    sendMock.mockResolvedValue({});
    const job = await adapter.enqueue('ingest', {});

    sendMock.mockReset();
    sendMock
      .mockResolvedValueOnce({
        Messages: [{
          Body: JSON.stringify({ job, handlerType: 'ingest' }),
          ReceiptHandle: 'r'
        }]
      })
      .mockResolvedValue({ Messages: [] });

    await adapter.start();
    await new Promise(r => setImmediate(r));
    await adapter.stop();

    expect(handler).toHaveBeenCalled();
  });

  it('respects maxConcurrent', async () => {
    adapter.maxConcurrent = 1;
    let resolveFirst;
    const handler = () => new Promise(r => { resolveFirst = r; });
    await adapter.registerWorker('ingest', handler);

    sendMock.mockReset();
    sendMock
      .mockResolvedValueOnce({
        Messages: [{
          Body: JSON.stringify({
            job: { id: 'job_1', type: 'ingest', payload: {}, attempts: 0, maxAttempts: 2, priority: 0, delay: 0, status: 'pending' },
            handlerType: 'ingest'
          }),
          ReceiptHandle: 'r1'
        }]
      })
      .mockResolvedValue({ Messages: [] });

    await adapter.start();
    await new Promise(r => setImmediate(r));

    expect(adapter.activeWorkers).toBe(1);

    resolveFirst();
    await adapter.stop();
    await new Promise(r => setImmediate(r));
  });

  it('returns health ok', async () => {
    sendMock.mockResolvedValue({ Attributes: { ApproximateNumberOfMessages: '0' } });
    const health = await adapter.health();
    expect(health.ok).toBe(true);
  });

  it('returns health error on failure', async () => {
    sendMock.mockRejectedValue(new Error('sqs down'));
    const health = await adapter.health();
    expect(health.ok).toBe(false);
    expect(health.error).toBe('sqs down');
  });

  it('returns metadata', () => {
    expect(SQSQueueAdapter.metadata.name).toBe('sqs-queue');
  });
});

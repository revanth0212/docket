const { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand, GetQueueAttributesCommand } = require('@aws-sdk/client-sqs');
const { QueueAdapter } = require('../../../core/interfaces/queue-adapter');
const { generateJobId } = require('../../../core/utils/id-generator');

/**
 * AWS SQS Queue Adapter
 * Uses Amazon SQS for reliable, distributed job queuing.
 * @implements {QueueAdapter}
 */
class SQSQueueAdapter extends QueueAdapter {
  constructor(config) {
    super(config);
    this.queueUrl = this.config.queueUrl;
    this.region = this.config.region || 'us-east-1';
    this.accessKeyId = this.config.accessKeyId;
    this.secretAccessKey = this.config.secretAccessKey;
    this.maxConcurrent = this.config.maxConcurrent || 5;
    this.retryAttempts = this.config.retryAttempts || 3;
    this.retryDelay = this.config.retryDelay || 1000;
    this.running = false;
    this.workers = new Map();
    this.activeWorkers = 0;
  }

  async initialize() {
    const clientConfig = { region: this.region };
    if (this.accessKeyId && this.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey
      };
    }
    this.client = new SQSClient(clientConfig);
  }

  async enqueue(type, payload, options = {}) {
    const id = generateJobId();
    const job = {
      id,
      type,
      payload,
      status: 'pending',
      attempts: 0,
      maxAttempts: options.retries ?? this.retryAttempts,
      error: undefined,
      result: undefined,
      createdAt: new Date(),
      startedAt: undefined,
      completedAt: undefined,
      priority: options.priority || 0,
      delay: options.delay || 0
    };

    const messageBody = JSON.stringify({ job, handlerType: type });
    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: messageBody,
      MessageAttributes: {
        jobType: { DataType: 'String', StringValue: type },
        priority: { DataType: 'Number', StringValue: String(job.priority) }
      },
      DelaySeconds: Math.min(job.delay / 1000, 900) // SQS max delay is 15 minutes
    });

    await this.client.send(command);
    return job;
  }

  async dequeue(type) {
    const command = new ReceiveMessageCommand({
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 0,
      MessageAttributeNames: ['All']
    });

    const result = await this.client.send(command);
    const message = result.Messages?.[0];
    if (!message) return null;

    const body = JSON.parse(message.Body);
    const job = body.job;

    if (type && job.type !== type) {
      // Put it back if type doesn't match
      return null;
    }

    job.status = 'processing';
    job.attempts += 1;
    job.startedAt = new Date();
    job.receiptHandle = message.ReceiptHandle;

    return job;
  }

  async complete(jobId, result) {
    // In SQS, completion means deleting the message
    const receiptHandle = this._getReceiptHandle(jobId);
    if (receiptHandle) {
      await this.client.send(new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle
      }));
    }

    this.activeWorkers -= 1;
    this.processNext();

    return {
      id: jobId,
      status: 'completed',
      result,
      completedAt: new Date()
    };
  }

  async fail(jobId, error, shouldRetry = true) {
    const receiptHandle = this._getReceiptHandle(jobId);

    if (shouldRetry && receiptHandle) {
      // Let SQS handle retry via visibility timeout or dead letter queue
      this.activeWorkers -= 1;
      this.processNext();
      return {
        id: jobId,
        status: 'pending',
        error
      };
    }

    if (receiptHandle) {
      await this.client.send(new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle
      }));
    }

    this.activeWorkers -= 1;
    this.processNext();

    return {
      id: jobId,
      status: 'failed',
      error,
      completedAt: new Date()
    };
  }

  async getJob(_jobId) {
    // SQS does not support getting a specific message by ID
    return null;
  }

  async registerWorker(type, handler) {
    this.workers.set(type, handler);
  }

  async start() {
    this.running = true;
    this.processNext();
  }

  async stop() {
    this.running = false;
  }

  processNext() {
    if (!this.running || this.activeWorkers >= this.maxConcurrent) {
      return;
    }

    for (const [type] of this.workers) {
      this.dequeue(type).then((job) => {
        if (job) {
          this.runJob(job);
        }
      }).catch(() => {});
    }
  }

  async runJob(job) {
    const handler = this.workers.get(job.type);
    if (!handler) return;

    this.activeWorkers += 1;
    try {
      const result = await handler(job.payload, job);
      await this.complete(job.id, result);
    } catch (err) {
      await this.fail(job.id, err.message, job.attempts < job.maxAttempts);
    }
  }

  _getReceiptHandle(_jobId) {
    // In a real implementation, we'd track receipt handles in memory or DynamoDB
    return null;
  }

  async health() {
    const start = Date.now();
    try {
      await this.client.send(new GetQueueAttributesCommand({
        QueueUrl: this.queueUrl,
        AttributeNames: ['ApproximateNumberOfMessages']
      }));
      return { ok: true, latency: Date.now() - start };
    } catch (err) {
      return { ok: false, latency: Date.now() - start, error: err.message };
    }
  }

  static get metadata() {
    return {
      name: 'sqs-queue',
      version: '0.1.0',
      capabilities: ['enqueue', 'dequeue', 'workers'],
      docketCompatibility: '>=0.1.0 <0.3.0'
    };
  }
}

module.exports = { SQSQueueAdapter };

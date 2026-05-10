const { QueueAdapter } = require('../../../core/interfaces/queue-adapter');
const { generateJobId } = require('../../../core/utils/id-generator');

/**
 * In-Memory Queue Adapter
 * @implements {QueueAdapter}
 */
class InMemoryQueueAdapter extends QueueAdapter {
  constructor(config) {
    super(config);
    this.jobs = new Map();
    this.workers = new Map();
    this.running = false;
    this.maxConcurrent = this.config.maxConcurrent || 5;
    this.retryAttempts = this.config.retryAttempts || 3;
    this.retryDelay = this.config.retryDelay || 1000;
    this.activeWorkers = 0;
  }

  async initialize() {
    // No persistent connection needed
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

    this.jobs.set(id, job);

    if (this.running) {
      this.processNext();
    }

    return job;
  }

  async dequeue(type) {
    const pending = Array.from(this.jobs.values())
      .filter(j => j.status === 'pending' && (!type || j.type === type))
      .sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);

    if (pending.length === 0) {
      return null;
    }

    const job = pending[0];
    job.status = 'processing';
    job.attempts += 1;
    job.startedAt = new Date();

    return job;
  }

  async complete(jobId, result) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    job.status = 'completed';
    job.result = result;
    job.completedAt = new Date();

    this.activeWorkers -= 1;
    this.processNext();

    return job;
  }

  async fail(jobId, error, shouldRetry = true) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    job.error = error;

    if (shouldRetry && job.attempts < job.maxAttempts) {
      job.status = 'pending';
      job.startedAt = undefined;

      if (this.retryDelay > 0) {
        setTimeout(() => this.processNext(), this.retryDelay);
      } else {
        this.processNext();
      }
    } else {
      job.status = 'failed';
      job.completedAt = new Date();
    }

    this.activeWorkers -= 1;
    this.processNext();

    return job;
  }

  async getJob(jobId) {
    return this.jobs.get(jobId) || null;
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
      const job = this.jobs.values()
        .find(j => j.status === 'pending' && j.type === type);

      if (job) {
        this.runJob(job);
        return;
      }
    }
  }

  async runJob(job) {
    const handler = this.workers.get(job.type);
    if (!handler) {
      return;
    }

    this.activeWorkers += 1;
    job.status = 'processing';
    job.attempts += 1;
    job.startedAt = new Date();

    try {
      const result = await handler(job.payload, job);
      await this.complete(job.id, result);
    } catch (err) {
      await this.fail(job.id, err.message, job.attempts < job.maxAttempts);
    }
  }

  async health() {
    const start = Date.now();
    try {
      const testJob = await this.enqueue('_health', { check: true });
      await this.getJob(testJob.id);
      return { ok: true, latency: Date.now() - start };
    } catch (err) {
      return { ok: false, latency: Date.now() - start, error: err.message };
    }
  }

  static get metadata() {
    return {
      name: 'memory-queue',
      version: '0.1.0',
      capabilities: ['enqueue', 'dequeue', 'workers'],
      cortexCompatibility: '>=0.1.0 <0.3.0'
    };
  }
}

module.exports = { InMemoryQueueAdapter };

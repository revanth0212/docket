// src/core/interfaces/queue-adapter.js
// FROZEN INTERFACE — Requires architect approval to modify

/**
 * @typedef {Object} JobDefinition
 * @property {string} id — Unique job ID
 * @property {string} type — Job type (e.g., "ingestion", "insight-generation")
 * @property {Object} payload — Job data
 * @property {string} [status='pending'] — pending | processing | completed | failed
 * @property {number} [attempts=0]
 * @property {string} [error]
 * @property {Date} createdAt
 * @property {Date} [startedAt]
 * @property {Date} [completedAt]
 */

/**
 * Queue Adapter Interface
 * 
 * All queue implementations (in-memory, Redis, SQS, etc.) implement this contract.
 * Core knows nothing about the queue backend — only this interface.
 * 
 * @abstract
 */
class QueueAdapter {
  constructor(config) {
    this.config = this.validateConfig(config);
  }

  validateConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Config must be an object');
    }
    return config;
  }

  /**
   * Initialize queue
   * @returns {Promise<void>}
   */
  async initialize() {
    // Override if needed
  }

  /**
   * Enqueue a job
   * @param {string} type — Job type
   * @param {Object} payload — Job data
   * @param {Object} [options] — { priority, delay, retries }
   * @returns {Promise<JobDefinition>}
   */
  // eslint-disable-next-line require-await, no-unused-vars
  async enqueue(type, payload, _options = {}) {
    throw new Error('Method "enqueue" must be implemented by subclass');
  }

  /**
   * Dequeue next job (for workers)
   * @param {string} [type] — Filter by job type, or any if omitted
   * @returns {Promise<JobDefinition|null>}
   */
  // eslint-disable-next-line require-await, no-unused-vars
  async dequeue(type) {
    throw new Error('Method "dequeue" must be implemented by subclass');
  }

  /**
   * Mark job as completed
   * @param {string} jobId
   * @param {Object} result
   * @returns {Promise<JobDefinition>}
   */
  // eslint-disable-next-line require-await, no-unused-vars
  async complete(jobId, result) {
    throw new Error('Method "complete" must be implemented by subclass');
  }

  /**
   * Mark job as failed
   * @param {string} jobId
   * @param {string} error
   * @param {boolean} [shouldRetry=true]
   * @returns {Promise<JobDefinition>}
   */
  // eslint-disable-next-line require-await, no-unused-vars
  async fail(jobId, error, _shouldRetry = true) {
    throw new Error('Method "fail" must be implemented by subclass');
  }

  /**
   * Get job status
   * @param {string} jobId
   * @returns {Promise<JobDefinition|null>}
   */
  // eslint-disable-next-line require-await, no-unused-vars
  async getJob(jobId) {
    throw new Error('Method "getJob" must be implemented by subclass');
  }

  /**
   * Register a worker function for a job type
   * @param {string} type
   * @param {Function} handler — async (payload, job) => result
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line require-await, no-unused-vars
  async registerWorker(type, handler) {
    throw new Error('Method "registerWorker" must be implemented by subclass');
  }

  /**
   * Start processing jobs (for in-memory/local queues)
   * @returns {Promise<void>}
   */
  async start() {
    // Override if needed
  }

  /**
   * Stop processing jobs gracefully
   * @returns {Promise<void>}
   */
  async stop() {
    // Override if needed
  }

  /**
   * Check queue health
   * @returns {Promise<{ok: boolean, latency: number, error?: string}>}
   */
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
    throw new Error('Property "metadata" must be implemented by subclass');
  }
}

module.exports = { QueueAdapter };

// tests/integration/adapter-contracts/queue-contract.test.js
// Contract tests for ALL queue adapters
// Run with: ADAPTER=in-memory npm test queue-contract

const { loadConfig } = require('../../../src/core/config/loader');
const { AdapterRegistry } = require('../../../src/core/utils/adapter-registry');

describe('QueueAdapter Contract', () => {
  let queue;
  let registry;

  beforeAll(async () => {
    const config = loadConfig();
    registry = new AdapterRegistry();

    const testAdapter = process.env.ADAPTER || config.docket.adapters.queue.default;
    const providerConfig = config.docket.adapters.queue.providers[testAdapter];

    queue = await registry.loadAdapter('queue', testAdapter, providerConfig);
  });

  describe('metadata', () => {
    it('has required metadata', () => {
      const metadata = queue.constructor.metadata;
      expect(metadata).toBeDefined();
      expect(metadata.name).toBeDefined();
      expect(metadata.version).toBeDefined();
      expect(metadata.capabilities).toBeInstanceOf(Array);
    });
  });

  describe('health', () => {
    it('returns health status', async () => {
      const health = await queue.health();
      expect(health).toHaveProperty('ok');
      expect(health).toHaveProperty('latency');
    });
  });

  describe('job lifecycle', () => {
    it('enqueues and retrieves a job', async () => {
      const job = await queue.enqueue('test-job', { data: 'hello' });
      expect(job).toHaveProperty('id');
      expect(job.type).toBe('test-job');
      expect(job.payload).toEqual({ data: 'hello' });

      const retrieved = await queue.getJob(job.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved.id).toBe(job.id);
    });

    it('dequeues a pending job', async () => {
      await queue.enqueue('test-job', { data: 'dequeue me' });
      const job = await queue.dequeue('test-job');
      expect(job).not.toBeNull();
      expect(job.type).toBe('test-job');
    });

    it('completes a job', async () => {
      const job = await queue.enqueue('test-job', { data: 'complete me' });
      const completed = await queue.complete(job.id, { result: 'done' });
      expect(completed.status).toBe('completed');
      expect(completed.result).toEqual({ result: 'done' });
    });

    it('fails a job', async () => {
      const job = await queue.enqueue('test-job', { data: 'fail me' });
      const failed = await queue.fail(job.id, 'Something went wrong', false);
      expect(failed.status).toBe('failed');
      expect(failed.error).toBe('Something went wrong');
    });
  });
});

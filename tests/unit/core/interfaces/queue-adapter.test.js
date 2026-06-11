// tests/unit/core/interfaces/queue-adapter.test.js

const { QueueAdapter } = require('../../../../src/core/interfaces/queue-adapter');

describe('QueueAdapter', () => {
  it('validates config', () => {
    const adapter = new QueueAdapter({ url: 'test' });
    expect(adapter.config).toEqual({ url: 'test' });
  });

  it('throws on invalid config', () => {
    expect(() => new QueueAdapter(null)).toThrow('Config must be an object');
    expect(() => new QueueAdapter('string')).toThrow('Config must be an object');
  });

  it('initialize does nothing by default', async () => {
    const adapter = new QueueAdapter({});
    await expect(adapter.initialize()).resolves.toBeUndefined();
  });

  it('enqueue throws by default', async () => {
    const adapter = new QueueAdapter({});
    await expect(adapter.enqueue('type', {})).rejects.toThrow('Method "enqueue" must be implemented by subclass');
  });

  it('dequeue throws by default', async () => {
    const adapter = new QueueAdapter({});
    await expect(adapter.dequeue()).rejects.toThrow('Method "dequeue" must be implemented by subclass');
  });

  it('complete throws by default', async () => {
    const adapter = new QueueAdapter({});
    await expect(adapter.complete('job_1', {})).rejects.toThrow('Method "complete" must be implemented by subclass');
  });

  it('fail throws by default', async () => {
    const adapter = new QueueAdapter({});
    await expect(adapter.fail('job_1', 'error')).rejects.toThrow('Method "fail" must be implemented by subclass');
  });

  it('getJob throws by default', async () => {
    const adapter = new QueueAdapter({});
    await expect(adapter.getJob('job_1')).rejects.toThrow('Method "getJob" must be implemented by subclass');
  });

  it('registerWorker throws by default', async () => {
    const adapter = new QueueAdapter({});
    await expect(adapter.registerWorker('type', () => {})).rejects.toThrow('Method "registerWorker" must be implemented by subclass');
  });

  it('start does nothing by default', async () => {
    const adapter = new QueueAdapter({});
    await expect(adapter.start()).resolves.toBeUndefined();
  });

  it('stop does nothing by default', async () => {
    const adapter = new QueueAdapter({});
    await expect(adapter.stop()).resolves.toBeUndefined();
  });

  it('health returns ok when enqueue and getJob succeed', async () => {
    class TestAdapter extends QueueAdapter {
      async enqueue(type, payload) {
        return { id: 'job_1', type, payload };
      }

      async getJob(id) {
        return { id };
      }
    }
    const adapter = new TestAdapter({});
    const result = await adapter.health();
    expect(result.ok).toBe(true);
    expect(result.latency).toBeGreaterThanOrEqual(0);
  });

  it('health returns error when enqueue fails', async () => {
    class TestAdapter extends QueueAdapter {
      async enqueue() {
        throw new Error('enqueue failed');
      }
    }
    const adapter = new TestAdapter({});
    const result = await adapter.health();
    expect(result.ok).toBe(false);
    expect(result.error).toBe('enqueue failed');
  });

  it('metadata throws by default', () => {
    expect(() => QueueAdapter.metadata).toThrow('Property "metadata" must be implemented by subclass');
  });
});

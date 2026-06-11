// tests/unit/adapters/queue/memory/index.test.js

const { InMemoryQueueAdapter } = require('../../../../../src/adapters/queue/memory');

describe('InMemoryQueueAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new InMemoryQueueAdapter({ retryDelay: 0 });
  });

  it('uses default config values', () => {
    const a = new InMemoryQueueAdapter({});
    expect(a.maxConcurrent).toBe(5);
    expect(a.retryAttempts).toBe(3);
    expect(a.retryDelay).toBe(1000);
  });

  it('enqueues and dequeues a job', async () => {
    const job = await adapter.enqueue('ingest', { file: 'x.pdf' });
    expect(job.type).toBe('ingest');
    expect(job.status).toBe('pending');

    const dequeued = await adapter.dequeue();
    expect(dequeued.id).toBe(job.id);
    expect(dequeued.status).toBe('processing');
  });

  it('dequeues by type', async () => {
    await adapter.enqueue('ingest', {});
    await adapter.enqueue('query', {});

    const job = await adapter.dequeue('query');
    expect(job.type).toBe('query');
  });

  it('returns null when no pending jobs', async () => {
    expect(await adapter.dequeue()).toBeNull();
  });

  it('completes a job', async () => {
    const job = await adapter.enqueue('ingest', {});
    await adapter.dequeue();
    const completed = await adapter.complete(job.id, { ok: true });
    expect(completed.status).toBe('completed');
    expect(completed.result).toEqual({ ok: true });
  });

  it('throws when completing unknown job', async () => {
    await expect(adapter.complete('job_unknown', {})).rejects.toThrow('Job not found');
  });

  it('fails a job without retry', async () => {
    const job = await adapter.enqueue('ingest', {});
    await adapter.dequeue();
    const failed = await adapter.fail(job.id, 'boom', false);
    expect(failed.status).toBe('failed');
    expect(failed.error).toBe('boom');
  });

  it('retries a failed job until maxAttempts', async () => {
    const job = await adapter.enqueue('ingest', {}, { retries: 2 });
    await adapter.dequeue();
    await adapter.fail(job.id, 'retry', true);
    expect(adapter.jobs.get(job.id).status).toBe('pending');

    await adapter.dequeue();
    await adapter.fail(job.id, 'retry', true);
    expect(adapter.jobs.get(job.id).status).toBe('failed');
  });

  it('throws when failing unknown job', async () => {
    await expect(adapter.fail('job_unknown', 'boom')).rejects.toThrow('Job not found');
  });

  it('gets a job by id', async () => {
    const job = await adapter.enqueue('ingest', {});
    expect(await adapter.getJob(job.id)).toEqual(job);
    expect(await adapter.getJob('job_unknown')).toBeNull();
  });

  it('registers and runs a worker', async () => {
    const handler = jest.fn().mockResolvedValue({ done: true });
    await adapter.registerWorker('ingest', handler);
    const job = await adapter.enqueue('ingest', { file: 'x.pdf' });

    await adapter.start();
    await new Promise(r => setImmediate(r));
    await adapter.stop();

    expect(handler).toHaveBeenCalledWith({ file: 'x.pdf' }, expect.objectContaining({ id: job.id }));
    const completed = await adapter.getJob(job.id);
    expect(completed.status).toBe('completed');
  });

  it('handles worker errors', async () => {
    const handler = jest.fn().mockRejectedValue(new Error('worker failed'));
    await adapter.registerWorker('ingest', handler);
    const job = await adapter.enqueue('ingest', {});

    await adapter.start();
    await new Promise(r => setImmediate(r));
    await adapter.stop();

    const failed = await adapter.getJob(job.id);
    expect(failed.status).toBe('failed');
  });

  it('respects maxConcurrent', async () => {
    const a = new InMemoryQueueAdapter({ maxConcurrent: 1, retryDelay: 0 });
    let resolveFirst;
    const firstHandler = () => new Promise(r => { resolveFirst = r; });
    await a.registerWorker('ingest', firstHandler);

    const job1 = await a.enqueue('ingest', {});
    const job2 = await a.enqueue('ingest', {});
    await a.start();

    await new Promise(r => setImmediate(r));
    expect(a.jobs.get(job1.id).status).toBe('processing');
    expect(a.jobs.get(job2.id).status).toBe('pending');

    resolveFirst();
    await new Promise(r => setImmediate(r));
    await a.stop();
  });

  it('returns health ok', async () => {
    const health = await adapter.health();
    expect(health.ok).toBe(true);
  });

  it('returns metadata', () => {
    expect(InMemoryQueueAdapter.metadata.name).toBe('memory-queue');
  });
});

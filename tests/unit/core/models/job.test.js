// tests/unit/core/models/job.test.js

const { JobSchema, CreateJobSchema } = require('../../../../src/core/models/job');

describe('JobSchema', () => {
  it('validates a complete job', () => {
    const job = {
      id: 'job_abc123',
      type: 'ingestion',
      payload: { file: 'test.txt' },
      status: 'pending',
      attempts: 0,
      maxAttempts: 3
    };
    const result = JobSchema.safeParse(job);
    expect(result.success).toBe(true);
    expect(result.data.id).toBe('job_abc123');
    expect(result.data.status).toBe('pending');
  });

  it('rejects invalid id format', () => {
    const result = JobSchema.safeParse({ id: 'bad-id', type: 'ingestion', payload: {} });
    expect(result.success).toBe(false);
  });

  it('rejects invalid type', () => {
    const result = JobSchema.safeParse({ id: 'job_abc123', type: 'badtype', payload: {} });
    expect(result.success).toBe(false);
  });

  it('rejects negative attempts', () => {
    const result = JobSchema.safeParse({ id: 'job_abc123', type: 'ingestion', payload: {}, attempts: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects zero maxAttempts', () => {
    const result = JobSchema.safeParse({ id: 'job_abc123', type: 'ingestion', payload: {}, maxAttempts: 0 });
    expect(result.success).toBe(false);
  });

  it('applies defaults', () => {
    const result = JobSchema.safeParse({ id: 'job_abc123', type: 'ingestion', payload: {} });
    expect(result.success).toBe(true);
    expect(result.data.status).toBe('pending');
    expect(result.data.attempts).toBe(0);
    expect(result.data.maxAttempts).toBe(3);
    expect(result.data.createdAt).toBeInstanceOf(Date);
  });
});

describe('CreateJobSchema', () => {
  it('validates minimal create input', () => {
    const result = CreateJobSchema.safeParse({ type: 'summarization', payload: {} });
    expect(result.success).toBe(true);
    expect(result.data.type).toBe('summarization');
  });

  it('strips id in create input', () => {
    const result = CreateJobSchema.safeParse({ id: 'job_abc123', type: 'ingestion', payload: {} });
    expect(result.success).toBe(true);
    expect(result.data.id).toBeUndefined();
  });
});

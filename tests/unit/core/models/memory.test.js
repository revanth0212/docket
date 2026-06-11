// tests/unit/core/models/memory.test.js

const { MemorySchema, CreateMemorySchema, UpdateMemorySchema } = require('../../../../src/core/models/memory');

describe('MemorySchema', () => {
  it('validates a complete memory', () => {
    const memory = {
      id: 'mem_abc123',
      rawRef: 'blob:123',
      contentType: 'text/plain',
      summary: 'test',
      metadata: { source: 'test' },
      parentId: 'mem_parent'
    };
    const result = MemorySchema.safeParse(memory);
    expect(result.success).toBe(true);
    expect(result.data.id).toBe('mem_abc123');
    expect(result.data.createdAt).toBeInstanceOf(Date);
  });

  it('rejects invalid id format', () => {
    const result = MemorySchema.safeParse({ id: 'bad-id', rawRef: 'blob:1', contentType: 'text/plain' });
    expect(result.success).toBe(false);
  });

  it('rejects empty rawRef', () => {
    const result = MemorySchema.safeParse({ id: 'mem_abc123', rawRef: '', contentType: 'text/plain' });
    expect(result.success).toBe(false);
  });

  it('rejects empty contentType', () => {
    const result = MemorySchema.safeParse({ id: 'mem_abc123', rawRef: 'blob:1', contentType: '' });
    expect(result.success).toBe(false);
  });

  it('applies default metadata and createdAt', () => {
    const result = MemorySchema.safeParse({ id: 'mem_abc123', rawRef: 'blob:1', contentType: 'text/plain' });
    expect(result.success).toBe(true);
    expect(result.data.metadata).toEqual({});
    expect(result.data.createdAt).toBeInstanceOf(Date);
  });
});

describe('CreateMemorySchema', () => {
  it('validates minimal create input', () => {
    const result = CreateMemorySchema.safeParse({ rawRef: 'blob:1', contentType: 'text/plain' });
    expect(result.success).toBe(true);
  });

  it('strips id in create input', () => {
    const result = CreateMemorySchema.safeParse({ id: 'mem_abc123', rawRef: 'blob:1', contentType: 'text/plain' });
    expect(result.success).toBe(true);
    expect(result.data.id).toBeUndefined();
  });
});

describe('UpdateMemorySchema', () => {
  it('validates partial update', () => {
    const result = UpdateMemorySchema.safeParse({ summary: 'updated' });
    expect(result.success).toBe(true);
  });

  it('strips id in update input', () => {
    const result = UpdateMemorySchema.safeParse({ id: 'mem_abc123', summary: 'updated' });
    expect(result.success).toBe(true);
    expect(result.data.id).toBeUndefined();
  });
});

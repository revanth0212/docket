// tests/unit/core/utils/id-generator.test.js

const { generateMemoryId, generateJobId, generateBlobKey } = require('../../../../src/core/utils/id-generator');

describe('generateMemoryId', () => {
  it('starts with mem_', () => {
    const id = generateMemoryId();
    expect(id).toMatch(/^mem_[a-f0-9]{12}$/);
  });

  it('generates unique ids', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(generateMemoryId());
    }
    expect(ids.size).toBe(100);
  });
});

describe('generateJobId', () => {
  it('starts with job_', () => {
    const id = generateJobId();
    expect(id).toMatch(/^job_[a-f0-9]{12}$/);
  });

  it('generates unique ids', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(generateJobId());
    }
    expect(ids.size).toBe(100);
  });
});

describe('generateBlobKey', () => {
  it('builds key with extension', () => {
    const key = generateBlobKey('mem_abc', 'photo.jpg');
    expect(key).toBe('mem_abc/raw.jpg');
  });

  it('uses whole name as extension when no dot', () => {
    const key = generateBlobKey('mem_abc', 'noextension');
    expect(key).toBe('mem_abc/raw.noextension');
  });

  it('handles empty filename', () => {
    const key = generateBlobKey('mem_abc', '');
    expect(key).toBe('mem_abc/raw.bin');
  });
});

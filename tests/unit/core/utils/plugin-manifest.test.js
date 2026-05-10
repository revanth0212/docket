// tests/unit/core/utils/plugin-manifest.test.js

const {
  validateManifest,
  inferCategory,
  suggestPackageName
} = require('../../../../src/core/utils/plugin-manifest');

describe('validateManifest', () => {
  const validManifest = {
    name: 'groq-llm',
    version: '0.1.0',
    category: 'llm',
    capabilities: ['chat'],
    cortexCompatibility: '>=0.1.0 <0.3.0'
  };

  it('returns valid for a correct manifest', () => {
    const result = validateManifest(validManifest);
    expect(result.valid).toBe(true);
    expect(result.manifest).toMatchObject(validManifest);
  });

  it('returns valid with optional fields', () => {
    const result = validateManifest({
      ...validManifest,
      description: 'Groq LLM adapter',
      author: 'you@example.com',
      repository: 'https://github.com/you/groq',
      license: 'MIT'
    });
    expect(result.valid).toBe(true);
    expect(result.manifest.description).toBe('Groq LLM adapter');
  });

  it('rejects missing name', () => {
    const { valid, errors } = validateManifest({ ...validManifest, name: undefined });
    expect(valid).toBe(false);
    expect(errors[0]).toMatch(/name/);
  });

  it('rejects invalid name characters', () => {
    const { valid, errors } = validateManifest({ ...validManifest, name: 'Groq LLM' });
    expect(valid).toBe(false);
    expect(errors[0]).toMatch(/name/);
  });

  it('rejects missing version', () => {
    const { valid, errors } = validateManifest({ ...validManifest, version: undefined });
    expect(valid).toBe(false);
    expect(errors[0]).toMatch(/version/);
  });

  it('rejects invalid category', () => {
    const { valid, errors } = validateManifest({ ...validManifest, category: 'invalid' });
    expect(valid).toBe(false);
    expect(errors[0]).toMatch(/category/);
  });

  it('rejects empty capabilities', () => {
    const { valid, errors } = validateManifest({ ...validManifest, capabilities: [] });
    expect(valid).toBe(false);
    expect(errors[0]).toMatch(/capabilities/);
  });

  it('rejects missing cortexCompatibility', () => {
    const { valid, errors } = validateManifest({
      ...validManifest,
      cortexCompatibility: undefined
    });
    expect(valid).toBe(false);
    expect(errors[0]).toMatch(/cortexCompatibility/);
  });

  it('rejects invalid repository URL', () => {
    const { valid, errors } = validateManifest({
      ...validManifest,
      repository: 'not-a-url'
    });
    expect(valid).toBe(false);
    expect(errors[0]).toMatch(/repository/);
  });
});

describe('inferCategory', () => {
  it('infers llm from cortex-llm-groq', () => {
    expect(inferCategory('cortex-llm-groq')).toBe('llm');
  });

  it('infers embedder from cortex-embedder-cohere', () => {
    expect(inferCategory('cortex-embedder-cohere')).toBe('embedder');
  });

  it('infers store from @myorg/cortex-store-qdrant', () => {
    expect(inferCategory('@myorg/cortex-store-qdrant')).toBe('store');
  });

  it('infers blob from cortex-blob-s3', () => {
    expect(inferCategory('cortex-blob-s3')).toBe('blob');
  });

  it('infers queue from cortex-queue-redis', () => {
    expect(inferCategory('cortex-queue-redis')).toBe('queue');
  });

  it('returns null for unknown names', () => {
    expect(inferCategory('some-random-package')).toBeNull();
  });
});

describe('suggestPackageName', () => {
  it('suggests cortex-llm-groq', () => {
    expect(suggestPackageName('llm', 'groq')).toBe('cortex-llm-groq');
  });

  it('suggests cortex-store-postgres', () => {
    expect(suggestPackageName('store', 'postgres')).toBe('cortex-store-postgres');
  });
});

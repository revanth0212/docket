// tests/unit/core/modules/classifier/sector-classifier.test.js

const { SectorClassifier } = require('../../../../../src/core/modules/classifier/sector-classifier');

describe('SectorClassifier', () => {
  function createClassifier(overrides = {}) {
    return new SectorClassifier({
      llmAdapter: {
        chat: jest.fn().mockResolvedValue({ content: 'semantic' })
      },
      config: {
        enabled: true,
        types: ['episodic', 'semantic', 'procedural', 'emotional', 'reflective'],
        default: 'semantic',
        cacheClassifications: true
      },
      ...overrides
    });
  }

  it('returns default when disabled', async () => {
    const classifier = createClassifier({ config: { enabled: false } });
    const result = await classifier.classify('text');
    expect(result).toEqual({ sector: 'semantic', confidence: 1.0 });
  });

  it('returns default when llm adapter is missing', async () => {
    const classifier = createClassifier({ llmAdapter: null });
    const result = await classifier.classify('text');
    expect(result).toEqual({ sector: 'semantic', confidence: 1.0 });
  });

  it('returns default for empty text', async () => {
    const classifier = createClassifier();
    const result = await classifier.classify('');
    expect(result).toEqual({ sector: 'semantic', confidence: 1.0 });
  });

  it('classifies via LLM and caches result', async () => {
    const llmAdapter = { chat: jest.fn().mockResolvedValue({ content: 'episodic (0.9)' }) };
    const classifier = createClassifier({ llmAdapter });

    const first = await classifier.classify('birthday party');
    const second = await classifier.classify('birthday party');

    expect(first).toEqual({ sector: 'episodic', confidence: 0.9 });
    expect(second).toEqual(first);
    expect(llmAdapter.chat).toHaveBeenCalledTimes(1);
  });

  it('caches only when cacheClassifications is true', async () => {
    const llmAdapter = { chat: jest.fn().mockResolvedValue({ content: 'semantic' }) };
    const classifier = createClassifier({
      llmAdapter,
      config: { enabled: true, cacheClassifications: false }
    });

    await classifier.classify('text');
    await classifier.classify('text');

    expect(llmAdapter.chat).toHaveBeenCalledTimes(2);
  });

  it('falls back to default on LLM error', async () => {
    const llmAdapter = { chat: jest.fn().mockRejectedValue(new Error('llm down')) };
    const classifier = createClassifier({ llmAdapter });
    const result = await classifier.classify('text');
    expect(result).toEqual({ sector: 'semantic', confidence: 0.5 });
  });

  it('falls back when response contains no known sector', async () => {
    const llmAdapter = { chat: jest.fn().mockResolvedValue({ content: 'unknown sector' }) };
    const classifier = createClassifier({ llmAdapter });
    const result = await classifier.classify('text');
    expect(result).toEqual({ sector: 'semantic', confidence: 0.5 });
  });

  it('uses custom prompt when provided', async () => {
    const llmAdapter = { chat: jest.fn().mockResolvedValue({ content: 'semantic' }) };
    const classifier = createClassifier({
      llmAdapter,
      config: { classificationPrompt: 'Custom prompt' }
    });

    await classifier.classify('text');

    expect(llmAdapter.chat).toHaveBeenCalledWith(
      [expect.objectContaining({ content: expect.stringContaining('Custom prompt') })],
      expect.any(Object)
    );
  });

  it('builds default prompt with configured types', async () => {
    const llmAdapter = { chat: jest.fn().mockResolvedValue({ content: 'semantic' }) };
    const classifier = createClassifier({
      llmAdapter,
      config: { types: ['work', 'personal'] }
    });

    await classifier.classify('text');

    expect(llmAdapter.chat).toHaveBeenCalledWith(
      [expect.objectContaining({ content: expect.stringContaining('work, personal') })],
      expect.any(Object)
    );
  });

  it('defaults confidence to 0.8 when not specified', async () => {
    const llmAdapter = { chat: jest.fn().mockResolvedValue({ content: 'emotional' }) };
    const classifier = createClassifier({ llmAdapter });
    const result = await classifier.classify('text');
    expect(result.confidence).toBe(0.8);
  });

  it('ignores invalid confidence values', async () => {
    const llmAdapter = { chat: jest.fn().mockResolvedValue({ content: 'procedural (1.5)' }) };
    const classifier = createClassifier({ llmAdapter });
    const result = await classifier.classify('text');
    expect(result.sector).toBe('procedural');
    expect(result.confidence).toBe(0.8);
  });
});

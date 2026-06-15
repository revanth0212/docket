// tests/unit/core/modules/query/recall-engine.test.js

const { RecallEngine } = require('../../../../../src/core/modules/query/recall-engine');

describe('RecallEngine', () => {
  function createEngine(storeOverrides = {}, config = {}, temporalOverrides = {}) {
    const memories = {
      mem_a: { id: 'mem_a', sector: 'semantic', salience: 1.0, createdAt: new Date(), validFrom: new Date('2024-01-01') },
      mem_b: { id: 'mem_b', sector: 'episodic', salience: 0.8, createdAt: new Date(), validFrom: new Date('2024-01-01') },
      mem_c: { id: 'mem_c', sector: 'semantic', salience: 0.9, createdAt: new Date(), validFrom: new Date('2024-01-01') }
    };

    return new RecallEngine({
      storeAdapter: {
        vectorSearch: jest.fn().mockResolvedValue([
          { memory: memories.mem_a, score: 0.95 }
        ]),
        getMemoryGraph: jest.fn().mockResolvedValue([]),
        getMemory: jest.fn().mockImplementation(id => memories[id] || null),
        ...storeOverrides
      },
      temporalQuery: {
        isValidAt: jest.fn().mockReturnValue(true),
        ...temporalOverrides
      },
      config
    });
  }

  it('returns vector search results ranked', async () => {
    const engine = createEngine();
    const { results, trace } = await engine.recall({ embedding: [1, 2, 3] });

    expect(results.length).toBe(1);
    expect(results[0].memory.id).toBe('mem_a');
    expect(trace.some(t => t.step === 'vector_search')).toBe(true);
    expect(trace.some(t => t.step === 'final_rank')).toBe(true);
  });

  it('expands graph from vector seeds', async () => {
    const storeAdapter = {
      vectorSearch: jest.fn().mockResolvedValue([{ memory: { id: 'mem_a' }, score: 0.9 }]),
      getMemoryGraph: jest.fn().mockImplementation(id => {
        if (id === 'mem_a') return [{ sourceId: 'mem_a', targetId: 'mem_b', confidence: 0.8 }];
        return [];
      }),
      getMemory: jest.fn().mockImplementation(id => ({ mem_a: { id: 'mem_a' }, mem_b: { id: 'mem_b', sector: 'semantic', salience: 1.0, createdAt: new Date() } }[id]))
    };
    const engine = createEngine(storeAdapter);

    const { results, trace } = await engine.recall({ embedding: [1] });

    expect(trace.some(t => t.step === 'graph_traversal')).toBe(true);
    expect(results.length).toBe(2);
  });

  it('applies temporal filter', async () => {
    const temporalQuery = { isValidAt: jest.fn().mockReturnValue(false) };
    const engine = createEngine({}, {}, temporalQuery);

    const { results, trace } = await engine.recall({
      embedding: [1],
      atDate: new Date('2025-01-01')
    });

    expect(trace.some(t => t.step === 'temporal_filter' && t.count === 1)).toBe(true);
    expect(results.length).toBe(0);
  });

  it('applies sector filter', async () => {
    const engine = createEngine({
      vectorSearch: jest.fn().mockResolvedValue([
        { memory: { id: 'mem_a', sector: 'semantic', salience: 1.0, createdAt: new Date() }, score: 0.9 },
        { memory: { id: 'mem_b', sector: 'episodic', salience: 0.8, createdAt: new Date() }, score: 0.8 }
      ])
    });

    const { results } = await engine.recall({ embedding: [1], sectors: ['episodic'] });

    expect(results.length).toBe(1);
    expect(results[0].memory.id).toBe('mem_b');
  });

  it('respects limit', async () => {
    const engine = createEngine({
      vectorSearch: jest.fn().mockResolvedValue([
        { memory: { id: 'mem_a', sector: 'semantic', salience: 1.0, createdAt: new Date() }, score: 0.9 },
        { memory: { id: 'mem_b', sector: 'semantic', salience: 0.8, createdAt: new Date() }, score: 0.8 }
      ])
    });

    const { results } = await engine.recall({ embedding: [1], limit: 1 });
    expect(results.length).toBe(1);
  });

  it('computes composite score from signals', async () => {
    const engine = createEngine({
      vectorSearch: jest.fn().mockResolvedValue([
        { memory: { id: 'mem_a', sector: 'semantic', salience: 0.5, createdAt: new Date() }, score: 0.5 }
      ])
    }, { vectorWeight: 0.4, salienceWeight: 0.6, recencyWeight: 0, graphWeight: 0 });

    const { results } = await engine.recall({ embedding: [1] });
    expect(results[0].compositeScore).toBeCloseTo(0.5, 1);
  });

  it('avoids revisiting nodes during graph expansion', async () => {
    const storeAdapter = {
      vectorSearch: jest.fn().mockResolvedValue([{ memory: { id: 'mem_a' }, score: 0.9 }]),
      getMemoryGraph: jest.fn().mockImplementation(id => {
        if (id === 'mem_a') return [{ sourceId: 'mem_a', targetId: 'mem_b', confidence: 1 }];
        if (id === 'mem_b') return [{ sourceId: 'mem_b', targetId: 'mem_a', confidence: 1 }];
        return [];
      }),
      getMemory: jest.fn().mockImplementation(id => ({
        mem_a: { id: 'mem_a' },
        mem_b: { id: 'mem_b', sector: 'semantic', salience: 1.0, createdAt: new Date() }
      }[id]))
    };
    const engine = createEngine(storeAdapter, { graphDepth: 2 });

    const { results } = await engine.recall({ embedding: [1] });
    expect(results.length).toBe(2);
    expect(storeAdapter.getMemoryGraph).toHaveBeenCalledTimes(2);
  });
});

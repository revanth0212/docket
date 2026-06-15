// tests/unit/core/modules/query/query-service.test.js

const { QueryService } = require('../../../../../src/core/modules/query/query-service');
const { QueryError } = require('../../../../../src/core/errors');

describe('QueryService', () => {
  function createService(overrides = {}) {
    return new QueryService({
      storeAdapter: {
        vectorSearch: jest.fn().mockResolvedValue([])
      },
      embedderAdapter: {
        embed: jest.fn().mockResolvedValue([0.1, 0.2])
      },
      llmAdapter: {
        chat: jest.fn().mockResolvedValue({ content: 'Generated answer' })
      },
      recallEngine: {
        recall: jest.fn().mockResolvedValue({
          results: [
            {
              memory: { id: 'mem_abc', summary: 'test memory', sector: 'semantic' },
              compositeScore: 0.9,
              signals: { vector: 0.9, graph: 0, salience: 1.0, recency: 1.0 }
            }
          ],
          trace: [{ step: 'vector_search', count: 1 }]
        })
      },
      config: { memory: {} },
      ...overrides
    });
  }

  it('requires a question', async () => {
    const service = createService();
    await expect(service.query({})).rejects.toThrow(QueryError);
  });

  it('embeds the question and calls recall engine', async () => {
    const service = createService();
    const result = await service.query({ question: 'what is this?' });

    expect(service.embedderAdapter.embed).toHaveBeenCalledWith('what is this?');
    expect(service.recallEngine.recall).toHaveBeenCalledWith(expect.objectContaining({
      question: 'what is this?',
      limit: 10,
      threshold: 0.0
    }));
    expect(result.answer).toBe('Generated answer');
    expect(result.sources.length).toBe(1);
  });

  it('passes sector and temporal filters to recall engine', async () => {
    const service = createService();
    await service.query({
      question: 'test',
      sectors: ['semantic'],
      temporal: { atDate: '2024-01-01T00:00:00Z' }
    });

    expect(service.recallEngine.recall).toHaveBeenCalledWith(
      expect.objectContaining({
        sectors: ['semantic'],
        atDate: expect.any(Date)
      })
    );
  });

  it('wraps embed errors in QueryError', async () => {
    const service = createService({
      embedderAdapter: { embed: jest.fn().mockRejectedValue(new Error('embedder down')) }
    });
    await expect(service.query({ question: 'test' })).rejects.toThrow('Failed to embed question');
  });

  it('returns answer without LLM when llm adapter is absent', async () => {
    const service = createService({ llmAdapter: null });
    const result = await service.query({ question: 'test' });
    expect(result.answer).toBe('Found 1 relevant memories.');
  });

  it('gracefully handles LLM failure', async () => {
    const service = createService({
      llmAdapter: { chat: jest.fn().mockRejectedValue(new Error('llm down')) }
    });
    const result = await service.query({ question: 'test' });
    expect(result.answer).toContain('could not generate an answer');
  });

  it('includes trace when requested', async () => {
    const service = createService();
    const result = await service.query({ question: 'test', includeTrace: true });
    expect(result.trace).toEqual([{ step: 'vector_search', count: 1 }]);
  });

  it('omits trace by default', async () => {
    const service = createService();
    const result = await service.query({ question: 'test' });
    expect(result.trace).toBeUndefined();
  });

  it('uses empty summary fallback for sources', async () => {
    const service = createService({
      recallEngine: {
        recall: jest.fn().mockResolvedValue({
          results: [{
            memory: { id: 'mem_xyz', extractedText: 'raw text', sector: 'semantic' },
            compositeScore: 0.7,
            signals: {}
          }],
          trace: []
        })
      }
    });
    const result = await service.query({ question: 'test' });
    expect(result.sources[0].summary).toBe('raw text');
  });
});

// src/core/modules/query/query-service.js
// RAG query pipeline

const { QueryError } = require('../../errors');

/**
 * Query Service
 *
 * Executes RAG queries: embed question, recall relevant memories,
 * build context prompt, call LLM, return answer + sources + trace.
 */
class QueryService {
  /**
   * @param {Object} options
   * @param {Object} options.storeAdapter
   * @param {Object} options.embedderAdapter
   * @param {Object} options.llmAdapter
   * @param {Object} options.recallEngine
   * @param {Object} options.config
   */
  constructor({ storeAdapter, embedderAdapter, llmAdapter, recallEngine, config }) {
    this.storeAdapter = storeAdapter;
    this.embedderAdapter = embedderAdapter;
    this.llmAdapter = llmAdapter;
    this.recallEngine = recallEngine;
    this.config = config || {};
    this.memoryConfig = this.config.memory || {};
  }

  /**
   * Execute a RAG query
   * @param {Object} params
   * @param {string} params.question
   * @param {number} [params.topK=10]
   * @param {string[]} [params.sectors]
   * @param {Object} [params.temporal] — { atDate }
   * @param {boolean} [params.includeTrace=false]
   * @returns {Promise<{answer: string, sources: Source[], trace?: Object[]}>}
   */
  async query({
    question,
    topK = 10,
    sectors,
    temporal,
    includeTrace = false
  }) {
    if (!question || typeof question !== 'string') {
      throw new QueryError('Question is required');
    }

    let embedding = null;
    try {
      embedding = await this.embedderAdapter.embed(question);
    } catch (err) {
      throw new QueryError(`Failed to embed question: ${err.message}`, { cause: err });
    }

    const atDate = temporal?.atDate ? new Date(temporal.atDate) : undefined;

    const { results, trace } = await this.recallEngine.recall({
      embedding,
      question,
      sectors,
      atDate,
      limit: topK,
      threshold: 0.0
    });

    const sources = results.map(r => ({
      memoryId: r.memory.id,
      summary: r.memory.summary || r.memory.extractedText || '',
      score: r.compositeScore,
      sector: r.memory.sector,
      signals: r.signals
    }));

    let answer = '';
    if (this.llmAdapter) {
      const prompt = this._buildRagPrompt(question, sources);
      try {
        const response = await this.llmAdapter.chat([
          { role: 'system', content: 'You are a helpful assistant answering questions based on the provided memories.' },
          { role: 'user', content: prompt }
        ], { temperature: 0.7, maxTokens: 512 });
        answer = response.content || '';
      } catch (err) {
        answer = `I found ${sources.length} relevant memories but could not generate an answer: ${err.message}`;
      }
    } else {
      answer = `Found ${sources.length} relevant memories.`;
    }

    const response = {
      answer,
      sources
    };

    if (includeTrace) {
      response.trace = trace;
    }

    return response;
  }

  /**
   * Build RAG prompt from retrieved sources
   * @param {string} question
   * @param {Array} sources
   * @returns {string}
   * @protected
   */
  _buildRagPrompt(question, sources) {
    const context = sources
      .map((s, i) => `[${i + 1}] ${s.summary}`)
      .join('\n');

    return `Answer the question using only the following memories. If none are relevant, say so.

Memories:
${context || '(No relevant memories found)'}

Question: ${question}

Answer:`;
  }
}

module.exports = { QueryService };

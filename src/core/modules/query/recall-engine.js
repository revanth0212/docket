// src/core/modules/query/recall-engine.js
// Composite retrieval: vector similarity + graph traversal + salience + recency + temporal

/**
 * Recall Engine
 *
 * Retrieves and ranks memories using multiple signals:
 * - vector similarity (initial retrieval)
 * - graph traversal (expand from vector results)
 * - salience boost
 * - recency boost
 * - temporal validity filtering
 *
 * Returns ranked results plus a trace of recall steps.
 */
class RecallEngine {
  /**
   * @param {Object} options
   * @param {Object} options.storeAdapter
   * @param {Object} options.temporalQuery
   * @param {Object} [options.config]
   */
  constructor({ storeAdapter, temporalQuery, config = {} }) {
    this.storeAdapter = storeAdapter;
    this.temporalQuery = temporalQuery;
    this.vectorWeight = config.vectorWeight ?? 0.4;
    this.graphWeight = config.graphWeight ?? 0.2;
    this.salienceWeight = config.salienceWeight ?? 0.2;
    this.recencyWeight = config.recencyWeight ?? 0.2;
    this.graphDepth = config.graphDepth ?? 1;
    this.graphBoostDecay = config.graphBoostDecay ?? 0.5;
  }

  /**
   * Composite recall search
   * @param {Object} params
   * @param {number[]} params.embedding
   * @param {string} [params.question]
   * @param {string[]} [params.sectors]
   * @param {Date} [params.atDate]
   * @param {number} [params.limit=10]
   * @param {number} [params.threshold=0.0]
   * @returns {Promise<{results: RankedResult[], trace: WaypointTrace[]}>}
   */
  async recall({
    embedding,
    question: _question,
    sectors,
    atDate,
    limit = 10,
    threshold = 0.0
  }) {
    const trace = [];

    // 1. Vector search
    const vectorResults = await this.storeAdapter.vectorSearch(embedding, {
      limit: limit * 4,
      threshold
    });
    trace.push({ step: 'vector_search', count: vectorResults.length });

    // 2. Graph expansion from vector results
    const { expanded, graphScores } = await this._expandGraph(
      vectorResults.map(r => r.memory.id),
      this.graphDepth
    );
    trace.push({ step: 'graph_traversal', count: expanded.length });

    // Combine vector results and graph-expanded memories
    const candidateMap = new Map();
    for (const { memory, score } of vectorResults) {
      candidateMap.set(memory.id, {
        memory,
        vectorScore: score,
        graphScore: 0,
        source: 'vector'
      });
    }

    for (const memory of expanded) {
      if (candidateMap.has(memory.id)) continue;
      candidateMap.set(memory.id, {
        memory,
        vectorScore: 0,
        graphScore: graphScores.get(memory.id) || 0,
        source: 'graph'
      });
    }

    // 3. Temporal filter
    let candidates = Array.from(candidateMap.values());
    if (atDate) {
      const beforeCount = candidates.length;
      candidates = candidates.filter(c =>
        this.temporalQuery.isValidAt(c.memory, atDate)
      );
      trace.push({ step: 'temporal_filter', count: beforeCount - candidates.length });
    }

    // 4. Sector filter
    if (sectors && sectors.length > 0) {
      const beforeCount = candidates.length;
      candidates = candidates.filter(c =>
        sectors.includes(c.memory.sector)
      );
      trace.push({ step: 'sector_filter', count: beforeCount - candidates.length });
    }

    // 5. Score and rank
    const now = new Date();
    const ranked = candidates.map(c => {
      const salience = c.memory.salience ?? 1.0;
      const recencyScore = this._recencyScore(c.memory.createdAt, now);
      const compositeScore = this._computeScore(
        c.vectorScore,
        c.graphScore,
        salience,
        recencyScore
      );

      return {
        memory: c.memory,
        compositeScore,
        signals: {
          vector: c.vectorScore,
          graph: c.graphScore,
          salience,
          recency: recencyScore
        }
      };
    });

    ranked.sort((a, b) => b.compositeScore - a.compositeScore);

    const results = ranked.slice(0, limit);
    trace.push({ step: 'final_rank', count: results.length });

    return { results, trace };
  }

  /**
   * Expand retrieval via graph traversal from seed memory IDs
   * @param {string[]} seedIds
   * @param {number} depth
   * @returns {Promise<{expanded: MemoryRecord[], graphScores: Map<string, number>}>}
   * @protected
   */
  async _expandGraph(seedIds, depth) {
    const expanded = [];
    const graphScores = new Map();
    const visited = new Set();
    let currentDepth = 0;
    let frontier = [...seedIds];

    while (frontier.length > 0 && currentDepth < depth) {
      const nextFrontier = [];
      currentDepth += 1;
      const boost = Math.pow(this.graphBoostDecay, currentDepth - 1);

      for (const id of frontier) {
        if (visited.has(id)) continue;
        visited.add(id);

        const edges = await this.storeAdapter.getMemoryGraph(id, { depth: 1 });
        for (const edge of edges) {
          const neighborId = edge.sourceId === id ? edge.targetId : edge.sourceId;
          if (visited.has(neighborId)) continue;

          const memory = await this.storeAdapter.getMemory(neighborId);
          if (!memory) continue;

          expanded.push(memory);
          const existing = graphScores.get(neighborId) || 0;
          graphScores.set(neighborId, Math.max(existing, boost * (edge.confidence || 1.0)));
          nextFrontier.push(neighborId);
        }
      }

      frontier = nextFrontier;
    }

    return { expanded, graphScores };
  }

  /**
   * Compute composite score from individual signals
   * @protected
   */
  _computeScore(vectorScore, graphScore, salience, recencyScore) {
    const vectorComponent = vectorScore * this.vectorWeight;
    const graphComponent = graphScore * this.graphWeight;
    const salienceComponent = salience * this.salienceWeight;
    const recencyComponent = recencyScore * this.recencyWeight;

    return vectorComponent + graphComponent + salienceComponent + recencyComponent;
  }

  /**
   * Recency score: 1.0 at creation, decays over 30 days
   * @protected
   */
  _recencyScore(createdAt, now) {
    const created = createdAt ? new Date(createdAt) : now;
    const daysElapsed = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    if (daysElapsed <= 0) return 1.0;
    return Math.max(0, Math.exp(-daysElapsed / 30));
  }
}

module.exports = { RecallEngine };

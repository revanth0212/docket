// src/core/modules/query/temporal-query.js
// Validity-window and point-in-time querying

/**
 * Temporal Query
 *
 * Filters memories by validity windows and supports point-in-time queries.
 * In flat mode, all memories are considered always valid.
 */
class TemporalQuery {
  /**
   * @param {Object} options
   * @param {Object} options.storeAdapter
   * @param {Object} options.config — memory.temporal config
   */
  constructor({ storeAdapter, config }) {
    this.storeAdapter = storeAdapter;
    this.enabled = config.enabled !== false;
  }

  /**
   * Filter memories that are valid at a given point in time
   * @param {Array} memories
   * @param {Date} [atDate=new Date()]
   * @returns {Array}
   */
  filterValid(memories, atDate = new Date()) {
    if (!this.enabled) return memories;
    return memories.filter(m => this.isValidAt(m, atDate));
  }

  /**
   * Check if a single memory is valid at a date
   * @param {Object} memory
   * @param {Date} atDate
   * @returns {boolean}
   */
  isValidAt(memory, atDate) {
    if (!this.enabled) return true;
    if (!memory) return false;

    const from = memory.validFrom ? new Date(memory.validFrom) : null;
    const to = memory.validTo ? new Date(memory.validTo) : null;

    if (from && atDate < from) return false;
    if (to && atDate > to) return false;

    return true;
  }

  /**
   * Query the store and filter results to a point in time.
   * Note: store adapters do not yet expose temporal filters, so we query
   * broadly and filter in memory. This can be optimized later.
   *
   * @param {Object} filters
   * @param {Date} atDate
   * @param {Object} options
   * @returns {Promise<{results: Array, total: number}>}
   */
  async queryAtPointInTime(filters = {}, atDate = new Date(), options = {}) {
    if (!this.enabled) {
      return this.storeAdapter.queryMemories(filters, options);
    }

    const { results, total } = await this.storeAdapter.queryMemories(filters, {
      ...options,
      limit: (options.limit || 50) * 2 // over-fetch to compensate for filtering
    });

    const filtered = this.filterValid(results, atDate);
    const limit = options.limit || 50;
    return { results: filtered.slice(0, limit), total };
  }
}

module.exports = { TemporalQuery };

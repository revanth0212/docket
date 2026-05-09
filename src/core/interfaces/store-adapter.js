// src/core/interfaces/store-adapter.js
// FROZEN INTERFACE — Requires architect approval to modify

/**
 * Memory Record
 * @typedef {Object} MemoryRecord
 * @property {string} id — Unique identifier (e.g., "mem_abc123")
 * @property {string} rawRef — Reference to blob storage (key or URL)
 * @property {string} contentType — MIME type of original file
 * @property {string} [extractedText] — Text extracted from raw content
 * @property {string} [summary] — LLM-generated summary
 * @property {number[]} [embedding] — Vector embedding for semantic search
 * @property {Object} [metadata] — Arbitrary metadata (timestamp, source, tags, etc.)
 * @property {string} [parentId] — For threading/versioning
 * @property {Date} createdAt
 * @property {Date} [updatedAt]
 */

/**
 * @typedef {Object} VectorSearchOptions
 * @property {number} [limit=10] — Max results
 * @property {number} [threshold=0.7] — Minimum similarity score (0-1)
 * @property {Object} [filters] — Additional metadata filters
 */

/**
 * @typedef {Object} VectorSearchResult
 * @property {MemoryRecord} memory
 * @property {number} score — Similarity score
 */

/**
 * Store Adapter Interface
 * 
 * All database adapters (SQLite, PostgreSQL, etc.) implement this contract.
 * Core knows nothing about the database — only this interface.
 * 
 * @abstract
 */
class StoreAdapter {
  constructor(config) {
    this.config = this.validateConfig(config);
  }

  validateConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Config must be an object');
    }
    return config;
  }

  /**
   * Initialize database (create tables, run migrations, connect)
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line require-await
  async initialize() {
    throw new Error('Method "initialize" must be implemented by subclass');
  }

  /**
   * Create a new memory record
   * @param {Omit<MemoryRecord, 'id'|'createdAt'>} memory — Memory data (id generated if not provided)
   * @returns {Promise<MemoryRecord>} — Created memory with generated fields
   */
  // eslint-disable-next-line require-await, no-unused-vars
  async createMemory(memory) {
    throw new Error('Method "createMemory" must be implemented by subclass');
  }

  /**
   * Retrieve memory by ID
   * @param {string} id
   * @returns {Promise<MemoryRecord|null>}
   */
  // eslint-disable-next-line require-await, no-unused-vars
  async getMemory(id) {
    throw new Error('Method "getMemory" must be implemented by subclass');
  }

  /**
   * Query memories with filters (non-vector)
   * @param {Object} filters — { contentType, dateFrom, dateTo, metadata }
   * @param {Object} options — { limit, offset, sortBy, sortOrder }
   * @returns {Promise<{results: MemoryRecord[], total: number}>}
   */
  // eslint-disable-next-line require-await, no-unused-vars
  async queryMemories(_filters = {}, _options = {}) {
    throw new Error('Method "queryMemories" must be implemented by subclass');
  }

  /**
   * Semantic vector search
   * @param {number[]} embedding — Query vector
   * @param {VectorSearchOptions} options
   * @returns {Promise<VectorSearchResult[]>}
   */
  // eslint-disable-next-line require-await, no-unused-vars
  async vectorSearch(embedding, _options = {}) {
    throw new Error('Method "vectorSearch" must be implemented by subclass');
  }

  /**
   * Update memory fields (partial update)
   * @param {string} id
   * @param {Partial<MemoryRecord>} patch
   * @returns {Promise<MemoryRecord>}
   */
  // eslint-disable-next-line require-await, no-unused-vars
  async updateMemory(id, patch) {
    throw new Error('Method "updateMemory" must be implemented by subclass');
  }

  /**
   * Delete memory by ID
   * @param {string} id
   * @returns {Promise<boolean>} — True if deleted
   */
  // eslint-disable-next-line require-await, no-unused-vars
  async deleteMemory(id) {
    throw new Error('Method "deleteMemory" must be implemented by subclass');
  }

  /**
   * Store a relation between memories
   * @param {Object} relation — { sourceId, targetId, type, confidence, metadata }
   * @returns {Promise<Object>}
   */
  // eslint-disable-next-line require-await, no-unused-vars
  async createRelation(relation) {
    throw new Error('Method "createRelation" must be implemented by subclass');
  }

  /**
   * Get related memories
   * @param {string} memoryId
   * @param {Object} options — { type, depth, limit }
   * @returns {Promise<Array>}
   */
  // eslint-disable-next-line require-await, no-unused-vars
  async getMemoryGraph(memoryId, _options = {}) {
    throw new Error('Method "getMemoryGraph" must be implemented by subclass');
  }

  /**
   * Check database health
   * @returns {Promise<{ok: boolean, latency: number, error?: string}>}
   */
  // eslint-disable-next-line require-await
  async health() {
    throw new Error('Method "health" must be implemented by subclass');
  }

  /**
   * Get current migration version
   * @returns {Promise<string>}
   */
  // eslint-disable-next-line require-await
  async getMigrationVersion() {
    throw new Error('Method "getMigrationVersion" must be implemented by subclass');
  }

  /**
   * Run a migration
   * @param {string} sql — Migration SQL
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line require-await, no-unused-vars
  async runMigration(sql) {
    throw new Error('Method "runMigration" must be implemented by subclass');
  }

  static get metadata() {
    throw new Error('Property "metadata" must be implemented by subclass');
  }
}

module.exports = { StoreAdapter };

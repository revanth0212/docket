// src/core/modules/security/access-controlled-store.js
// Resource-based access control wrapper over any StoreAdapter

const { StoreAdapter } = require('../../interfaces/store-adapter');
const { ForbiddenError } = require('../../errors');

/**
 * AccessControlledStore
 *
 * Wraps a StoreAdapter and enforces resource-based access control.
 * Supports owner, readers, writers, and named access policies.
 *
 * Memory access rules:
 * - owner-only: only owner can read/write
 * - public: anyone can read, only owner/writer can write
 * - readers: owner + readers can read; owner + writers can write
 *
 * This wrapper implements the StoreAdapter interface so it can be
 * swapped in anywhere a store adapter is expected.
 */
class AccessControlledStore extends StoreAdapter {
  /**
   * @param {StoreAdapter} storeAdapter
   * @param {Object} config
   * @param {string} [config.defaultPolicy='owner-only']
   * @param {Object} [config.policies={}] — named policy definitions
   * @param {string} [principal] — principal this instance acts on behalf of
   */
  constructor(storeAdapter, config = {}, principal = null) {
    super(config);
    this.storeAdapter = storeAdapter;
    this.defaultPolicy = config.defaultPolicy || 'owner-only';
    this.policies = config.policies || {};
    this.principal = principal;
  }

  /**
   * Create a new wrapper bound to a principal
   * @param {string} principal
   * @returns {AccessControlledStore}
   */
  forPrincipal(principal) {
    return new AccessControlledStore(this.storeAdapter, {
      defaultPolicy: this.defaultPolicy,
      policies: this.policies
    }, principal);
  }

  async initialize() {
    return this.storeAdapter.initialize();
  }

  /**
   * Create a memory, assigning owner if not provided
   * @param {Object} memory
   */
  async createMemory(memory) {
    const enriched = {
      ...memory,
      accessPolicy: memory.accessPolicy || this.defaultPolicy,
      owner: memory.owner || this.principal || null,
      readers: memory.readers || [],
      writers: memory.writers || []
    };

    return this.storeAdapter.createMemory(enriched);
  }

  /**
   * Get memory if principal is allowed to read it
   * @param {string} id
   */
  async getMemory(id) {
    const memory = await this.storeAdapter.getMemory(id);
    if (!memory) return null;
    return this._canRead(memory) ? memory : null;
  }

  /**
   * Query memories, filtering by read access
   */
  async queryMemories(filters = {}, options = {}) {
    const { results } = await this.storeAdapter.queryMemories(filters, options);
    const visible = results.filter(m => this._canRead(m));
    return { results: visible, total: visible.length };
  }

  /**
   * Vector search, filtering by read access
   */
  async vectorSearch(embedding, options = {}) {
    const vectorResults = await this.storeAdapter.vectorSearch(embedding, options);
    return vectorResults.filter(r => this._canRead(r.memory));
  }

  /**
   * Update memory if principal is allowed to write
   */
  async updateMemory(id, patch) {
    const memory = await this.storeAdapter.getMemory(id);
    if (!memory) {
      // Let underlying store handle not-found semantics
      return this.storeAdapter.updateMemory(id, patch);
    }

    if (!this._canWrite(memory)) {
      throw new ForbiddenError('Not authorized to update this memory', { resourceId: id });
    }

    return this.storeAdapter.updateMemory(id, patch);
  }

  /**
   * Delete memory if principal is the owner
   */
  async deleteMemory(id) {
    const memory = await this.storeAdapter.getMemory(id);
    if (!memory) {
      return this.storeAdapter.deleteMemory(id);
    }

    if (!this._isOwner(memory)) {
      throw new ForbiddenError('Not authorized to delete this memory', { resourceId: id });
    }

    return this.storeAdapter.deleteMemory(id);
  }

  /**
   * Create relation if principal can write both endpoints
   */
  async createRelation(relation) {
    const [source, target] = await Promise.all([
      this.storeAdapter.getMemory(relation.sourceId),
      this.storeAdapter.getMemory(relation.targetId)
    ]);

    if (source && !this._canWrite(source)) {
      throw new ForbiddenError('Not authorized to create relation from this memory', { resourceId: relation.sourceId });
    }
    if (target && !this._canWrite(target)) {
      throw new ForbiddenError('Not authorized to create relation to this memory', { resourceId: relation.targetId });
    }

    return this.storeAdapter.createRelation(relation);
  }

  /**
   * Get memory graph. Edge-level filtering is delegated to the underlying
   * adapter; neighbor visibility is enforced when those memories are fetched.
   */
  async getMemoryGraph(memoryId, options = {}) {
    return this.storeAdapter.getMemoryGraph(memoryId, options);
  }

  async health() {
    return this.storeAdapter.health();
  }

  async getMigrationVersion() {
    return this.storeAdapter.getMigrationVersion();
  }

  async runMigration(sql) {
    return this.storeAdapter.runMigration(sql);
  }

  static get metadata() {
    return {
      name: 'access-controlled-store',
      type: 'security'
    };
  }

  /**
   * Check if principal can read a memory
   * @protected
   */
  _canRead(memory) {
    if (!memory) return false;
    if (this._isOwner(memory)) return true;

    const policy = memory.accessPolicy || this.defaultPolicy;

    if (policy === 'public') return true;
    if (policy === 'owner-only') return false;

    if (memory.readers && memory.readers.includes(this.principal)) return true;
    if (memory.writers && memory.writers.includes(this.principal)) return true;

    return this._evaluateNamedPolicy(policy, memory, 'read');
  }

  /**
   * Check if principal can write a memory
   * @protected
   */
  _canWrite(memory) {
    if (!memory) return false;
    if (this._isOwner(memory)) return true;

    const policy = memory.accessPolicy || this.defaultPolicy;

    if (policy === 'public' || policy === 'owner-only') {
      return this._isOwner(memory);
    }

    if (memory.writers && memory.writers.includes(this.principal)) return true;

    return this._evaluateNamedPolicy(policy, memory, 'write');
  }

  /**
   * Check if principal owns the memory
   * @protected
   */
  _isOwner(memory) {
    if (!this.principal || !memory.owner) return false;
    return memory.owner === this.principal;
  }

  /**
   * Evaluate a named policy definition
   * @protected
   */
  _evaluateNamedPolicy(policyName, memory, action) {
    const policy = this.policies[policyName];
    if (!policy || typeof policy !== 'object') return false;

    if (action === 'read' && policy.readers) {
      return policy.readers.includes(this.principal);
    }

    if (action === 'write' && policy.writers) {
      return policy.writers.includes(this.principal);
    }

    return false;
  }
}

module.exports = { AccessControlledStore };

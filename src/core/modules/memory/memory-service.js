// src/core/modules/memory/memory-service.js
// Memory CRUD, relations, supersession, and access policy updates

const { CreateMemorySchema, UpdateMemorySchema } = require('../../models/memory');
const { NotFoundError, ValidationError } = require('../../errors');

/**
 * Memory Service
 *
 * Orchestrates memory CRUD, graph relations, and supersession chains.
 * Handles flat vs rich mode branching via config.memory.mode.
 */
class MemoryService {
  /**
   * @param {Object} options
   * @param {Object} options.storeAdapter
   * @param {Object} options.blobAdapter
   * @param {Object} [options.decayEngine]
   * @param {Object} options.config — memory config section
   */
  constructor({ storeAdapter, blobAdapter, decayEngine, config }) {
    this.storeAdapter = storeAdapter;
    this.blobAdapter = blobAdapter;
    this.decayEngine = decayEngine;
    this.config = config || {};
    this.mode = this.config.mode || 'flat';
    this.temporal = this.config.temporal || {};
  }

  /**
   * Create a memory
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async create(data) {
    const validated = this._validateCreate(data);
    const enriched = this._enrichNewMemory(validated);

    if (this.blobAdapter && enriched.rawRef?.startsWith('blob:')) {
      // rawRef is already a blob key; no new blob to store
    }

    const memory = await this.storeAdapter.createMemory(enriched);

    if (this.mode === 'rich' && this.decayEngine) {
      const salience = this.decayEngine.computeSalience(memory);
      if (salience !== memory.salience) {
        return this.storeAdapter.updateMemory(memory.id, { salience });
      }
    }

    return memory;
  }

  /**
   * Get memory by ID
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async getById(id) {
    return this.storeAdapter.getMemory(id);
  }

  /**
   * Update memory
   * @param {string} id
   * @param {Object} patch
   * @returns {Promise<Object>}
   */
  async update(id, patch) {
    const validated = this._validateUpdate(patch);
    return this.storeAdapter.updateMemory(id, validated);
  }

  /**
   * Delete memory and associated blob
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const memory = await this.storeAdapter.getMemory(id);
    if (!memory) return false;

    if (this.blobAdapter && memory.rawRef) {
      try {
        await this.blobAdapter.delete(memory.rawRef);
      } catch (err) {
        // Blob may already be gone; continue with memory deletion
      }
    }

    return this.storeAdapter.deleteMemory(id);
  }

  /**
   * List memories with filters
   * @param {Object} filters
   * @param {Object} options
   * @returns {Promise<{results: Array, total: number}>}
   */
  async list(filters = {}, options = {}) {
    return this.storeAdapter.queryMemories(filters, options);
  }

  /**
   * Create a relation between memories
   * @param {string} sourceId
   * @param {Object} relation
   * @returns {Promise<Object>}
   */
  async createRelation(sourceId, relation) {
    const target = await this.storeAdapter.getMemory(relation.targetId);
    if (!target) {
      throw new NotFoundError('Memory', relation.targetId);
    }

    return this.storeAdapter.createRelation({
      sourceId,
      targetId: relation.targetId,
      type: relation.type,
      confidence: relation.confidence ?? 1.0,
      metadata: relation.metadata
    });
  }

  /**
   * Get relations for a memory
   * @param {string} memoryId
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async getRelations(memoryId, options = {}) {
    return this.storeAdapter.getMemoryGraph(memoryId, options);
  }

  /**
   * Supersede a memory with a new version
   * @param {string} oldId
   * @param {Object} newData
   * @returns {Promise<{old: Object, new: Object}>}
   */
  async supersede(oldId, newData) {
    const old = await this.storeAdapter.getMemory(oldId);
    if (!old) {
      throw new NotFoundError('Memory', oldId);
    }

    const now = new Date();

    // Mark old memory validity ending now
    await this.storeAdapter.updateMemory(oldId, { validTo: now });

    // Create new memory linked to old
    const enriched = this._enrichNewMemory({
      ...newData,
      parentId: oldId,
      supersedesId: oldId
    });

    const newMemory = await this.storeAdapter.createMemory(enriched);

    // Create relation between old and new
    await this.storeAdapter.createRelation({
      sourceId: oldId,
      targetId: newMemory.id,
      type: 'superseded_by',
      confidence: 1.0,
      metadata: {}
    });

    return {
      old: await this.storeAdapter.getMemory(oldId),
      new: newMemory
    };
  }

  _validateCreate(data) {
    const result = CreateMemorySchema.safeParse(data);
    if (!result.success) {
      throw new ValidationError(`Invalid memory: ${result.error.message}`);
    }
    return result.data;
  }

  _validateUpdate(data) {
    const result = UpdateMemorySchema.safeParse(data);
    if (!result.success) {
      throw new ValidationError(`Invalid memory update: ${result.error.message}`);
    }
    return result.data;
  }

  _enrichNewMemory(data) {
    if (this.mode !== 'rich') return data;

    const now = new Date();
    const defaultFrom = this.temporal.defaultValidFrom
      ? new Date(this.temporal.defaultValidFrom)
      : now;
    const defaultTo = this.temporal.defaultValidTo
      ? new Date(this.temporal.defaultValidTo)
      : null;

    return {
      ...data,
      sector: data.sector || this.config.sectors?.default || 'semantic',
      salience: data.salience ?? 1.0,
      validFrom: data.validFrom || defaultFrom,
      validTo: data.validTo ?? defaultTo,
      accessPolicy: data.accessPolicy || this.config.rbac?.defaultPolicy || 'owner-only'
    };
  }
}

module.exports = { MemoryService };

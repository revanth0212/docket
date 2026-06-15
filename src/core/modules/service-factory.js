// src/core/modules/service-factory.js
// Factory for assembling core services from adapters and config

const { SectorClassifier } = require('./classifier/sector-classifier');
const { TemporalQuery } = require('./query/temporal-query');
const { DecayEngine } = require('./memory/decay-engine');
const { RecallEngine } = require('./query/recall-engine');
const { MemoryService } = require('./memory/memory-service');
const { IngestionService } = require('./ingestion/ingestion-service');
const { QueryService } = require('./query/query-service');
const { AccessControlledStore } = require('./security/access-controlled-store');

/**
 * Wrap a store adapter with RBAC when enabled
 * @param {Object} adapters
 * @param {Object} config
 * @param {string} [principal]
 * @returns {Object}
 */
function wrapStoreAdapter(adapters, config, principal = null) {
  const rbac = config.docket?.memory?.rbac;
  if (!rbac?.enabled) {
    return adapters.store;
  }

  const wrapper = new AccessControlledStore(adapters.store, {
    defaultPolicy: rbac.defaultPolicy,
    policies: rbac.policies
  });

  return principal ? wrapper.forPrincipal(principal) : wrapper;
}

/**
 * Create all core services from initialized adapters and config
 * @param {Object} adapters — { llm, embedder, store, blob, queue }
 * @param {Object} config — loaded Docket config
 * @param {Object} [options]
 * @param {string} [options.principal] — requesting principal for RBAC filtering
 * @returns {Object} — { ingestion, query, memory, sectorClassifier, temporalQuery, decayEngine, recallEngine }
 */
function createCoreServices(adapters, config, options = {}) {
  const memoryConfig = config.docket.memory || {};
  const principal = options.principal || null;
  const storeAdapter = wrapStoreAdapter(adapters, config, principal);

  const sectorClassifier = new SectorClassifier({
    llmAdapter: adapters.llm,
    config: memoryConfig.sectors || {}
  });

  const temporalQuery = new TemporalQuery({
    storeAdapter,
    config: memoryConfig.temporal || {}
  });

  const decayEngine = new DecayEngine({
    storeAdapter,
    config: memoryConfig.decay || {}
  });

  const recallEngine = new RecallEngine({
    storeAdapter,
    temporalQuery,
    config: {}
  });

  const memoryService = new MemoryService({
    storeAdapter,
    blobAdapter: adapters.blob,
    decayEngine,
    config: memoryConfig
  });

  const ingestionService = new IngestionService({
    storeAdapter,
    blobAdapter: adapters.blob,
    embedderAdapter: adapters.embedder,
    llmAdapter: adapters.llm,
    sectorClassifier,
    memoryService,
    queueAdapter: adapters.queue,
    config: config.docket
  });

  const queryService = new QueryService({
    storeAdapter,
    embedderAdapter: adapters.embedder,
    llmAdapter: adapters.llm,
    recallEngine,
    config: config.docket
  });

  return {
    ingestion: ingestionService,
    query: queryService,
    memory: memoryService,
    sectorClassifier,
    temporalQuery,
    decayEngine,
    recallEngine
  };
}

module.exports = { createCoreServices, wrapStoreAdapter };

// src/core/modules/service-factory.js
// Factory for assembling core services from adapters and config

const { SectorClassifier } = require('./classifier/sector-classifier');
const { TemporalQuery } = require('./query/temporal-query');
const { DecayEngine } = require('./memory/decay-engine');
const { RecallEngine } = require('./query/recall-engine');
const { MemoryService } = require('./memory/memory-service');
const { IngestionService } = require('./ingestion/ingestion-service');
const { QueryService } = require('./query/query-service');

/**
 * Create all core services from initialized adapters and config
 * @param {Object} adapters — { llm, embedder, store, blob, queue }
 * @param {Object} config — loaded Docket config
 * @returns {Object} — { ingestion, query, memory, sectorClassifier, temporalQuery, decayEngine, recallEngine }
 */
function createCoreServices(adapters, config) {
  const memoryConfig = config.docket.memory || {};

  const sectorClassifier = new SectorClassifier({
    llmAdapter: adapters.llm,
    config: memoryConfig.sectors || {}
  });

  const temporalQuery = new TemporalQuery({
    storeAdapter: adapters.store,
    config: memoryConfig.temporal || {}
  });

  const decayEngine = new DecayEngine({
    storeAdapter: adapters.store,
    config: memoryConfig.decay || {}
  });

  const recallEngine = new RecallEngine({
    storeAdapter: adapters.store,
    temporalQuery,
    config: {}
  });

  const memoryService = new MemoryService({
    storeAdapter: adapters.store,
    blobAdapter: adapters.blob,
    decayEngine,
    config: memoryConfig
  });

  const ingestionService = new IngestionService({
    storeAdapter: adapters.store,
    blobAdapter: adapters.blob,
    embedderAdapter: adapters.embedder,
    llmAdapter: adapters.llm,
    sectorClassifier,
    memoryService,
    queueAdapter: adapters.queue,
    config: config.docket
  });

  const queryService = new QueryService({
    storeAdapter: adapters.store,
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

module.exports = { createCoreServices };

// src/data-plane/app.js
// Fastify application for the data plane — ingestion, query, memory CRUD

const fastify = require('fastify');

/**
 * Register data plane routes on a Fastify instance
 * @param {import('fastify').FastifyInstance} app
 * @param {Object} [options={}]
 */
async function registerDataPlaneRoutes(app, options = {}) {
  const adapters = options.adapters || {};

  // Health check (data plane only)
  app.get('/health', async () => {
    if (adapters.store) {
      const storeHealth = await adapters.store.health();
      return { status: 'ok', plane: 'data', adapters: { store: storeHealth } };
    }
    return { status: 'ok', plane: 'data' };
  });

  // Ingestion
  app.post('/ingest', async (_request, _reply) => {
    // TODO: wire to IngestionService in Phase 3
    return { status: 'pending', id: 'mem_stub' };
  });

  // Query
  app.post('/query', async (_request, _reply) => {
    // TODO: wire to QueryService in Phase 3
    return { answer: '', sources: [], trace: [] };
  });

  // Memory CRUD
  app.get('/memories/:id', async (request) => {
    if (adapters.store) {
      const memory = await adapters.store.getMemory(request.params.id);
      return memory || { id: request.params.id, error: 'not_found' };
    }
    return { id: request.params.id };
  });

  app.post('/memories', async (_request) => {
    // TODO: wire to MemoryService in Phase 3
    return { status: 'pending' };
  });

  app.patch('/memories/:id', async (request) => {
    // TODO: wire to MemoryService in Phase 3
    return { id: request.params.id };
  });

  app.delete('/memories/:id', async (_request) => {
    // TODO: wire to MemoryService in Phase 3
    return { deleted: true };
  });

  app.get('/memories/:id/relations', async (request) => {
    if (adapters.store) {
      const edges = await adapters.store.getMemoryGraph(request.params.id);
      return { memoryId: request.params.id, edges };
    }
    return { memoryId: request.params.id, edges: [] };
  });
}

/**
 * Build the data plane Fastify server
 * @param {Object} [options={}]
 * @returns {import('fastify').FastifyInstance}
 */
function buildDataPlane(options = {}) {
  const app = fastify({
    logger: options.logger ?? true
  });

  app.register(registerDataPlaneRoutes);
  return app;
}

/**
 * Start the data plane server
 * @param {Object} [options={}]
 * @returns {Promise<import('fastify').FastifyInstance>}
 */
async function startDataPlane(options = {}) {
  const app = buildDataPlane(options);
  const port = options.port ?? 3000;
  const host = options.host ?? '0.0.0.0';

  await app.listen({ port, host });
  app.log.info(`Cortex data plane listening on http://${host}:${port}`);

  return app;
}

module.exports = { registerDataPlaneRoutes, buildDataPlane, startDataPlane };

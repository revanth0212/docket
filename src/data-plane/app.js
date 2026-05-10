// src/data-plane/app.js
// Fastify application for the data plane — ingestion, query, memory CRUD

const fastify = require('fastify');

/**
 * Build the data plane Fastify server
 * @param {Object} [options={}]
 * @returns {import('fastify').FastifyInstance}
 */
function buildDataPlane(options = {}) {
  const app = fastify({
    logger: options.logger ?? true
  });

  // Health check (data plane only)
  app.get('/health', async () => {
    return { status: 'ok', plane: 'data' };
  });

  // Ingestion
  app.post('/ingest', async (request, reply) => {
    // TODO: wire to IngestionService in Phase 3
    return { status: 'pending', id: 'mem_stub' };
  });

  // Query
  app.post('/query', async (request, reply) => {
    // TODO: wire to QueryService in Phase 3
    return { answer: '', sources: [], trace: [] };
  });

  // Memory CRUD
  app.get('/memories/:id', async (request) => {
    // TODO: wire to MemoryService in Phase 3
    return { id: request.params.id };
  });

  app.post('/memories', async (request) => {
    // TODO: wire to MemoryService in Phase 3
    return { status: 'pending' };
  });

  app.patch('/memories/:id', async (request) => {
    // TODO: wire to MemoryService in Phase 3
    return { id: request.params.id };
  });

  app.delete('/memories/:id', async (request) => {
    // TODO: wire to MemoryService in Phase 3
    return { deleted: true };
  });

  app.get('/memories/:id/relations', async (request) => {
    // TODO: wire to MemoryService in Phase 3
    return { memoryId: request.params.id, edges: [] };
  });

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

module.exports = { buildDataPlane, startDataPlane };

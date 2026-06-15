// src/data-plane/app.js
// Fastify application for the data plane — ingestion, query, memory CRUD

const fastify = require('fastify');
const multipart = require('@fastify/multipart');
const { errorHandler } = require('./middleware/error-handler');
const { registerIngestRoute } = require('./routes/ingest');
const { registerQueryRoute } = require('./routes/query');
const { registerMemoryRoutes } = require('./routes/memory');

/**
 * Register data plane routes on a Fastify instance
 * @param {import('fastify').FastifyInstance} app
 * @param {Object} [options={}]
 */
async function registerDataPlaneRoutes(app, options = {}) {
  const adapters = options.adapters || {};
  const services = options.services || {};

  // Health check (data plane only)
  app.get('/health', async () => {
    if (adapters.store) {
      const storeHealth = await adapters.store.health();
      return { status: 'ok', plane: 'data', adapters: { store: storeHealth } };
    }
    return { status: 'ok', plane: 'data' };
  });

  // Multipart support must be registered before routes that consume it
  await app.register(multipart, { limits: { fileSize: 100 * 1024 * 1024 } });

  // JSON + multipart ingestion
  await app.register(registerIngestRoute, { ingestionService: services.ingestion });

  // Query
  await app.register(registerQueryRoute, { queryService: services.query });

  // Memory CRUD + relations
  await app.register(registerMemoryRoutes, { memoryService: services.memory });
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

  app.setErrorHandler(errorHandler);
  app.register(registerDataPlaneRoutes, options);

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
  app.log.info(`Docket data plane listening on http://${host}:${port}`);

  return app;
}

module.exports = { registerDataPlaneRoutes, buildDataPlane, startDataPlane };

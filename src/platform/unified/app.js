// src/platform/unified/app.js
// Unified server — mounts data plane and control plane in one process

const fastify = require('fastify');
const { registerDataPlaneRoutes } = require('../../data-plane/app');
const { registerControlPlaneRoutes } = require('../../control-plane/app');

/**
 * Build the unified Fastify server
 * @param {Object} [options={}]
 * @returns {import('fastify').FastifyInstance}
 */
function buildUnifiedApp(options = {}) {
  const app = fastify({
    logger: options.logger ?? true
  });

  // Register data plane routes at root
  app.register(registerDataPlaneRoutes, { adapters: options.adapters });

  // Register control plane routes (already prefixed with /admin)
  app.register(registerControlPlaneRoutes, {
    registry: options.registry,
    config: options.config
  });

  return app;
}

/**
 * Start the unified server
 * @param {Object} [options={}]
 * @returns {Promise<import('fastify').FastifyInstance>}
 */
async function startUnifiedApp(options = {}) {
  const app = buildUnifiedApp(options);
  const port = options.port ?? 3000;
  const host = options.host ?? '0.0.0.0';

  await app.listen({ port, host });
  app.log.info(`Cortex unified server listening on http://${host}:${port}`);

  return app;
}

module.exports = { buildUnifiedApp, startUnifiedApp };

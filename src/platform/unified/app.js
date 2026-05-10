// src/platform/unified/app.js
// Unified server — mounts data plane and control plane in one process

const fastify = require('fastify');
const { buildDataPlane } = require('../../data-plane/app');
const { buildControlPlane } = require('../../control-plane/app');

/**
 * Build the unified Fastify server
 * @param {Object} [options={}]
 * @returns {import('fastify').FastifyInstance}
 */
function buildUnifiedApp(options = {}) {
  const app = fastify({
    logger: options.logger ?? true
  });

  const dataPlane = buildDataPlane({ logger: false });
  const controlPlane = buildControlPlane({ logger: false });

  // Register data plane routes at root
  app.register(dataPlane);

  // Register control plane routes under /admin
  app.register(controlPlane, { prefix: '/admin' });

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

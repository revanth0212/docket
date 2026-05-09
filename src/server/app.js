// src/server/app.js
// Fastify application factory — creates and configures the HTTP server

const fastify = require('fastify');

/**
 * Build and configure the Fastify server instance
 * @param {Object} [options={}] — Server options
 * @param {boolean} [options.logger=true] — Enable Pino logging
 * @returns {import('fastify').FastifyInstance}
 */
function buildApp(options = {}) {
  const app = fastify({
    logger: options.logger ?? true
  });

  // Health check route
  app.get('/health', () => {
    return { status: 'ok' };
  });

  return app;
}

/**
 * Start the server and listen for connections
 * @param {Object} [options={}] — Start options
 * @param {number} [options.port=3000] — Port to listen on
 * @param {string} [options.host='0.0.0.0'] — Host to bind to
 * @returns {Promise<import('fastify').FastifyInstance>}
 */
async function startServer(options = {}) {
  const app = buildApp(options);
  const port = options.port ?? 3000;
  const host = options.host ?? '0.0.0.0';

  await app.listen({ port, host });
  app.log.info(`Cortex server listening on http://${host}:${port}`);

  return app;
}

module.exports = { buildApp, startServer };

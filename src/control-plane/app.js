// src/control-plane/app.js
// Fastify application for the control plane — config, RBAC, plugins, observability

const fastify = require('fastify');

/**
 * Build the control plane Fastify server
 * @param {Object} [options={}]
 * @returns {import('fastify').FastifyInstance}
 */
function buildControlPlane(options = {}) {
  const app = fastify({
    logger: options.logger ?? true
  });

  // Aggregated health across all adapters
  app.get('/admin/health', async () => {
    // TODO: query adapter health from registry in Phase 3
    return { status: 'ok', plane: 'control', adapters: {} };
  });

  // Config management
  app.get('/admin/config', async () => {
    // TODO: return resolved runtime config snapshot
    return { mode: 'flat', adapters: {} };
  });

  app.post('/admin/config', async (request) => {
    // TODO: validate and hot-reload config
    return { status: 'reloaded' };
  });

  // Plugin / adapter registry
  app.get('/admin/plugins', async () => {
    // TODO: list registered adapters from AdapterRegistry
    return { plugins: [] };
  });

  app.post('/admin/plugins', async (request) => {
    // TODO: validate and onboard adapter
    return { status: 'registered' };
  });

  app.delete('/admin/plugins/:name', async (request) => {
    // TODO: deregister adapter
    return { status: 'deregistered', name: request.params.name };
  });

  // RBAC policy management
  app.get('/admin/rbac/policies', async () => {
    // TODO: list policies from RBAC service
    return { policies: [] };
  });

  app.post('/admin/rbac/policies', async (request) => {
    // TODO: create or update policy
    return { status: 'saved' };
  });

  // Metrics (Prometheus-compatible)
  app.get('/admin/metrics', async (_, reply) => {
    // TODO: emit real metrics
    reply.type('text/plain');
    return '# cortex_metrics placeholder\n';
  });

  return app;
}

/**
 * Start the control plane server
 * @param {Object} [options={}]
 * @returns {Promise<import('fastify').FastifyInstance>}
 */
async function startControlPlane(options = {}) {
  const app = buildControlPlane(options);
  const port = options.port ?? 3001;
  const host = options.host ?? '0.0.0.0';

  await app.listen({ port, host });
  app.log.info(`Cortex control plane listening on http://${host}:${port}`);

  return app;
}

module.exports = { buildControlPlane, startControlPlane };

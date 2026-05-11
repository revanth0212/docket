// src/control-plane/app.js
// Fastify application for the control plane — config, RBAC, plugins, observability

const fastify = require('fastify');
const { PluginService } = require('./services/plugin-service');

/**
 * Register control plane routes on a Fastify instance
 * @param {import('fastify').FastifyInstance} app
 * @param {Object} [options={}]
 */
async function registerControlPlaneRoutes(app, options = {}) {
  const pluginService = new PluginService();
  const registry = options.registry;
  const config = options.config;

  // Aggregated health across all adapters
  app.get('/admin/health', async () => {
    if (registry) {
      const adapters = await registry.healthCheck();
      return { status: 'ok', plane: 'control', adapters };
    }
    return { status: 'ok', plane: 'control', adapters: {} };
  });

  // Config management
  app.get('/admin/config', async () => {
    if (config) {
      return {
        mode: config.cortex.memory?.mode || 'flat',
        adapters: config.cortex.adapters
      };
    }
    return { mode: 'flat', adapters: {} };
  });

  app.post('/admin/config', async (_request) => {
    // TODO: validate and hot-reload config
    return { status: 'reloaded' };
  });

  // Plugin / adapter registry
  app.get('/admin/plugins', async () => {
    return { plugins: pluginService.list() };
  });

  app.post('/admin/plugins', async (request, reply) => {
    const { packageName, config } = request.body || {};
    if (!packageName) {
      return reply.status(400).send({ error: 'packageName is required' });
    }

    const info = await pluginService.register(packageName, config || {});
    return { status: 'registered', plugin: info };
  });

  app.post('/admin/plugins/validate', async (request, reply) => {
    const { packageName } = request.body || {};
    if (!packageName) {
      return reply.status(400).send({ error: 'packageName is required' });
    }

    const result = await pluginService.validate(packageName);
    return result;
  });

  app.delete('/admin/plugins/:category/:name', async (request) => {
    const key = `${request.params.category}:${request.params.name}`;
    const ok = pluginService.deregister(key);
    return { status: ok ? 'deregistered' : 'not_found', key };
  });

  // RBAC policy management
  app.get('/admin/rbac/policies', async () => {
    // TODO: list policies from RBAC service
    return { policies: [] };
  });

  app.post('/admin/rbac/policies', async (_request) => {
    // TODO: create or update policy
    return { status: 'saved' };
  });

  // Metrics (Prometheus-compatible)
  app.get('/admin/metrics', async (_, reply) => {
    // TODO: emit real metrics
    reply.type('text/plain');
    return '# cortex_metrics placeholder\n';
  });
}

/**
 * Build the control plane Fastify server
 * @param {Object} [options={}]
 * @returns {import('fastify').FastifyInstance}
 */
function buildControlPlane(options = {}) {
  const app = fastify({
    logger: options.logger ?? true
  });

  app.register(registerControlPlaneRoutes);
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

module.exports = { registerControlPlaneRoutes, buildControlPlane, startControlPlane };

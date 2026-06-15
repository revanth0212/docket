// src/platform/serverless/cloudflare-workers/handler.js
// Cloudflare Workers fetch handler for Docket data + control planes

const { loadConfig } = require('../../../core/config/loader');
const { AdapterRegistry } = require('../../../core/utils/adapter-registry');
const { createCoreServices } = require('../../../core/modules/service-factory');
const { buildUnifiedApp } = require('../../unified/app');

let cached = null;

async function bootstrap() {
  if (cached) return cached;

  const config = loadConfig();
  const registry = new AdapterRegistry();
  const adapters = await registry.initializeFromConfig(config);
  const services = createCoreServices(adapters, config);
  const app = buildUnifiedApp({ adapters, registry, config, services });
  await app.ready();

  cached = { app, config, adapters, services };
  return cached;
}

/**
 * Cloudflare Workers fetch handler
 * @param {Request} request
 * @param {Object} env
 * @param {Object} ctx
 */
async function handleFetch(request, _env, _ctx) {
  const { app } = await bootstrap();

  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const headers = Object.fromEntries(request.headers.entries());

  let body;
  if (method !== 'GET' && method !== 'HEAD') {
    body = Buffer.from(await request.arrayBuffer());
  }

  const response = await app.inject({
    method,
    url: `${url.pathname}${url.search}`,
    headers,
    payload: body
  });

  return new Response(response.body, {
    status: response.statusCode,
    headers: response.headers
  });
}

function resetBootstrapCache() {
  cached = null;
}

module.exports = { handleFetch, bootstrap, resetBootstrapCache };

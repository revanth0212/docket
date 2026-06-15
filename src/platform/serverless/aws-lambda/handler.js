// src/platform/serverless/aws-lambda/handler.js
// AWS Lambda handler for Docket data + control planes

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
 * AWS Lambda handler (API Gateway v2 / HTTP API)
 * @param {Object} event
 * @param {Object} context
 */
async function handler(event, context) {
  // Keep the Lambda execution context warm for subsequent invocations
  context.callbackWaitsForEmptyEventLoop = false;

  const { app } = await bootstrap();

  const method = (event.requestContext?.http?.method || event.httpMethod || 'GET').toUpperCase();
  const path = event.rawPath || event.path || '/';
  const queryString = buildQueryString(event.queryStringParameters || event.queryString || {});
  const url = `${path}${queryString ? `?${queryString}` : ''}`;

  const headers = normalizeHeaders(event.headers || {});
  const body = event.body
    ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body)
    : undefined;

  const response = await app.inject({
    method,
    url,
    headers,
    payload: body
  });

  return {
    statusCode: response.statusCode,
    headers: response.headers,
    body: response.body
  };
}

function buildQueryString(params) {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return entries.join('&');
}

function normalizeHeaders(headers) {
  const normalized = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined && value !== null) {
      normalized[key.toLowerCase()] = String(value);
    }
  }
  return normalized;
}

function resetBootstrapCache() {
  cached = null;
}

module.exports = { handler, bootstrap, resetBootstrapCache };

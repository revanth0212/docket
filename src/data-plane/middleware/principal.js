// src/data-plane/middleware/principal.js
// Extract the requesting principal from headers, JWT, or API key

/**
 * Build a principal extractor middleware for Fastify
 * @param {Object} config
 * @param {boolean} [config.enabled=false]
 * @param {string} [config.authStrategy='header']
 * @param {string} [config.principalHeader='X-Principal']
 * @param {string} [config.jwtSecret]
 * @returns {Function}
 */
function buildPrincipalExtractor(config = {}) {
  const enabled = config.enabled === true;
  const strategy = config.authStrategy || 'header';
  const headerName = config.principalHeader || 'X-Principal';

  return async function extractPrincipal(request, reply) {
    if (!enabled) {
      request.principal = null;
      return;
    }

    const principal = await resolvePrincipal(request, strategy, headerName, config);

    if (!principal) {
      reply.status(401).send({
        error: 'unauthorized',
        message: 'A valid principal is required'
      });
      return;
    }

    request.principal = principal;
  };
}

async function resolvePrincipal(request, strategy, headerName, config) {
  if (strategy === 'header') {
    const value = request.headers[headerName.toLowerCase()];
    return value ? String(value).trim() : null;
  }

  if (strategy === 'jwt') {
    return resolveJwtPrincipal(request, config.jwtSecret);
  }

  if (strategy === 'apiKey') {
    return resolveApiKeyPrincipal(request, config.apiKeys);
  }

  return null;
}

function resolveJwtPrincipal(request, jwtSecret) {
  const authHeader = request.headers.authorization || '';
  const match = authHeader.match(/^bearer\s+(.+)$/i);
  if (!match || !jwtSecret) return null;

  try {
    // Minimal JWT verification: verify HMAC signature and parse payload.
    const token = match[1];
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', jwtSecret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    if (signatureB64 !== expectedSignature) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    return payload.sub || payload.principal || null;
  } catch {
    return null;
  }
}

function resolveApiKeyPrincipal(request, apiKeys) {
  const key = request.headers['x-api-key'];
  if (!key || !apiKeys || typeof apiKeys !== 'object') return null;
  return apiKeys[key] || null;
}

module.exports = { buildPrincipalExtractor };

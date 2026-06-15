// src/data-plane/routes/query.js
// Query route

const { QueryRequestSchema, validate } = require('../middleware/request-validator');

/**
 * Register query route
 * @param {import('fastify').FastifyInstance} app
 * @param {Object} options
 */
async function registerQueryRoute(app, options = {}) {
  const queryService = options.queryService;
  const getQueryService = options.getQueryService || (() => queryService);

  app.post('/query', { preHandler: validate(QueryRequestSchema) }, async (request) => {
    const service = getQueryService(request);
    return service.query({
      question: request.body.question,
      topK: request.body.topK,
      sectors: request.body.sectors,
      temporal: request.body.temporal,
      includeTrace: request.body.includeTrace
    });
  });
}

module.exports = { registerQueryRoute };

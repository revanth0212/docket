// src/data-plane/routes/memory.js
// Memory CRUD and relations routes

const {
  CreateMemorySchema,
  UpdateMemorySchema,
  CreateRelationSchema,
  validate
} = require('../middleware/request-validator');

/**
 * Register memory routes
 * @param {import('fastify').FastifyInstance} app
 * @param {Object} options
 */
async function registerMemoryRoutes(app, options = {}) {
  const memoryService = options.memoryService;
  const getMemoryService = options.getMemoryService || (() => memoryService);

  app.get('/memories/:id', async (request, reply) => {
    const service = getMemoryService(request);
    const memory = await service.getById(request.params.id);
    if (!memory) {
      reply.status(404).send({ id: request.params.id, error: 'not_found' });
      return;
    }
    return memory;
  });

  app.post('/memories', { preHandler: validate(CreateMemorySchema) }, async (request) => {
    const service = getMemoryService(request);
    return service.create(request.body);
  });

  app.patch('/memories/:id', { preHandler: validate(UpdateMemorySchema) }, async (request) => {
    const service = getMemoryService(request);
    return service.update(request.params.id, request.body);
  });

  app.delete('/memories/:id', async (request) => {
    const service = getMemoryService(request);
    const deleted = await service.delete(request.params.id);
    return { id: request.params.id, deleted };
  });

  app.get('/memories/:id/relations', async (request) => {
    const service = getMemoryService(request);
    const edges = await service.getRelations(request.params.id, request.query);
    return { memoryId: request.params.id, edges };
  });

  app.post('/memories/:id/relations', { preHandler: validate(CreateRelationSchema) }, async (request) => {
    const service = getMemoryService(request);
    const relation = await service.createRelation(request.params.id, request.body);
    return { memoryId: request.params.id, relation };
  });
}

module.exports = { registerMemoryRoutes };

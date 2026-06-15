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

  app.get('/memories/:id', async (request, reply) => {
    const memory = await memoryService.getById(request.params.id);
    if (!memory) {
      reply.status(404).send({ id: request.params.id, error: 'not_found' });
      return;
    }
    return memory;
  });

  app.post('/memories', { preHandler: validate(CreateMemorySchema) }, async (request) => {
    return memoryService.create(request.body);
  });

  app.patch('/memories/:id', { preHandler: validate(UpdateMemorySchema) }, async (request) => {
    return memoryService.update(request.params.id, request.body);
  });

  app.delete('/memories/:id', async (request) => {
    const deleted = await memoryService.delete(request.params.id);
    return { id: request.params.id, deleted };
  });

  app.get('/memories/:id/relations', async (request) => {
    const edges = await memoryService.getRelations(request.params.id, request.query);
    return { memoryId: request.params.id, edges };
  });

  app.post('/memories/:id/relations', { preHandler: validate(CreateRelationSchema) }, async (request) => {
    const relation = await memoryService.createRelation(request.params.id, request.body);
    return { memoryId: request.params.id, relation };
  });
}

module.exports = { registerMemoryRoutes };

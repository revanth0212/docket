// src/data-plane/routes/ingest.js
// Ingestion route (JSON + multipart)

const { IngestRequestSchema, validate } = require('../middleware/request-validator');
const { IngestionError } = require('../../core/errors');

/**
 * Register ingestion route
 * @param {import('fastify').FastifyInstance} app
 * @param {Object} options
 */
async function registerIngestRoute(app, options = {}) {
  const ingestionService = options.ingestionService;
  const getIngestionService = options.getIngestionService || (() => ingestionService);

  const validateJson = validate(IngestRequestSchema);

  app.post('/ingest', {
    preHandler: async (request, reply) => {
      if (!request.isMultipart()) {
        await validateJson(request, reply);
      }
    }
  }, async (request, reply) => {
    const service = getIngestionService(request);
    let result;

    if (request.isMultipart()) {
      result = await handleMultipart(request, service);
    } else {
      result = await service.ingest({
        text: request.body.text,
        contentType: request.body.contentType,
        filename: request.body.filename,
        async: request.body.async,
        metadata: request.body.metadata,
        sectorHint: request.body.sectorHint,
        validFrom: request.body.validFrom,
        validTo: request.body.validTo
      });
    }

    const statusCode = result.status === 'pending' ? 202 : 201;
    reply.status(statusCode).send(result);
  });
}

async function handleMultipart(request, service) {
  const parts = request.parts();
  let fileBuffer = null;
  let filename = null;
  let contentType = 'application/octet-stream';
  let asyncFlag = false;
  let metadata = {};
  let sectorHint;

  for await (const part of parts) {
    if (part.type === 'file') {
      const chunks = [];
      for await (const chunk of part.file) {
        chunks.push(chunk);
      }
      fileBuffer = Buffer.concat(chunks);
      filename = part.filename;
      contentType = part.mimetype || contentType;
    } else {
      const value = await part.value;
      switch (part.fieldname) {
      case 'async':
        asyncFlag = value === 'true' || value === true;
        break;
      case 'metadata':
        try {
          metadata = JSON.parse(value);
        } catch {
          metadata = {};
        }
        break;
      case 'sectorHint':
        sectorHint = value;
        break;
      }
    }
  }

  if (!fileBuffer) {
    throw new IngestionError('Multipart ingest requires a file');
  }

  return service.ingest({
    buffer: fileBuffer,
    contentType,
    filename,
    async: asyncFlag,
    metadata,
    sectorHint
  });
}

module.exports = { registerIngestRoute };

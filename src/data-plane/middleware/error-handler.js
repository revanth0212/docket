// src/data-plane/middleware/error-handler.js
// Centralized error handling for data plane routes

const { DocketError, ValidationError, NotFoundError, QueryError, IngestionError } = require('../../core/errors');

/**
 * Fastify error handler
 * @param {Error} err
 * @param {import('fastify').FastifyRequest} _request
 * @param {import('fastify').FastifyReply} reply
 */
function errorHandler(err, _request, reply) {
  if (err instanceof ValidationError || err.name === 'ValidationError') {
    reply.status(400).send({
      error: 'validation_error',
      message: err.message
    });
    return;
  }

  if (err instanceof NotFoundError || err.name === 'NotFoundError') {
    reply.status(404).send({
      error: 'not_found',
      message: err.message
    });
    return;
  }

  if (err instanceof QueryError || err instanceof IngestionError) {
    reply.status(422).send({
      error: 'processing_error',
      message: err.message
    });
    return;
  }

  if (err instanceof DocketError) {
    reply.status(500).send({
      error: 'internal_error',
      message: err.message
    });
    return;
  }

  // Fastify validation errors
  if (err.statusCode === 400) {
    reply.status(400).send({
      error: 'bad_request',
      message: err.message
    });
    return;
  }

  reply.status(500).send({
    error: 'internal_error',
    message: err.message || 'Internal server error'
  });
}

module.exports = { errorHandler };

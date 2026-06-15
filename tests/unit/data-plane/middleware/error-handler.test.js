// tests/unit/data-plane/middleware/error-handler.test.js

const { errorHandler } = require('../../../../src/data-plane/middleware/error-handler');
const {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  IngestionError,
  QueryError
} = require('../../../../src/core/errors');

describe('errorHandler', () => {
  function createReply() {
    return {
      sent: false,
      statusCode: null,
      payload: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      send(payload) {
        this.sent = true;
        this.payload = payload;
        return this;
      }
    };
  }

  it('returns 400 for ValidationError', () => {
    const reply = createReply();
    errorHandler(new ValidationError('bad input'), {}, reply);
    expect(reply.statusCode).toBe(400);
    expect(reply.payload.error).toBe('validation_error');
  });

  it('returns 404 for NotFoundError', () => {
    const reply = createReply();
    errorHandler(new NotFoundError('Memory', 'mem_abc'), {}, reply);
    expect(reply.statusCode).toBe(404);
  });

  it('returns 403 for ForbiddenError', () => {
    const reply = createReply();
    errorHandler(new ForbiddenError('denied'), {}, reply);
    expect(reply.statusCode).toBe(403);
    expect(reply.payload.error).toBe('forbidden');
  });

  it('returns 422 for IngestionError', () => {
    const reply = createReply();
    errorHandler(new IngestionError('failed'), {}, reply);
    expect(reply.statusCode).toBe(422);
  });

  it('returns 422 for QueryError', () => {
    const reply = createReply();
    errorHandler(new QueryError('failed'), {}, reply);
    expect(reply.statusCode).toBe(422);
  });

  it('returns 400 for Fastify validation errors', () => {
    const reply = createReply();
    errorHandler({ statusCode: 400, message: 'schema mismatch' }, {}, reply);
    expect(reply.statusCode).toBe(400);
  });

  it('returns 500 for unknown errors', () => {
    const reply = createReply();
    errorHandler(new Error('boom'), {}, reply);
    expect(reply.statusCode).toBe(500);
  });
});

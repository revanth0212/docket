// src/core/errors/index.js
// Domain-specific error classes for Docket

/**
 * Base error for all Docket errors
 */
class DocketError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'DocketError';
    this.code = options.code || 'DOCKET_ERROR';
    this.statusCode = options.statusCode || 500;
    this.cause = options.cause || null;
    this.context = options.context || {};

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context,
      cause: this.cause ? {
        message: this.cause.message,
        code: this.cause.code
      } : null
    };
  }
}

/**
 * Validation error — bad user input
 */
class ValidationError extends DocketError {
  constructor(message, options = {}) {
    super(message, { code: 'VALIDATION_ERROR', statusCode: 400, ...options });
    this.name = 'ValidationError';
  }
}

/**
 * Adapter error — external service failure
 */
class AdapterError extends DocketError {
  constructor(message, options = {}) {
    super(message, { ...options, code: 'ADAPTER_ERROR', statusCode: 502 });
    this.name = 'AdapterError';
    this.adapterName = options.adapterName || 'unknown';
  }
}

/**
 * Not found error — resource doesn't exist
 */
class NotFoundError extends DocketError {
  constructor(message, options = {}) {
    super(message, { ...options, code: 'NOT_FOUND', statusCode: 404 });
    this.name = 'NotFoundError';
    this.resource = options.resource || 'resource';
    this.resourceId = options.resourceId;
  }
}

/**
 * Ingestion error — pipeline failure
 */
class IngestionError extends DocketError {
  constructor(message, options = {}) {
    super(message, { ...options, code: 'INGESTION_ERROR', statusCode: 422 });
    this.name = 'IngestionError';
    this.jobId = options.jobId;
    this.stage = options.stage || 'unknown'; // extract | embed | store
  }
}

/**
 * Query error — search/retrieval failure
 */
class QueryError extends DocketError {
  constructor(message, options = {}) {
    super(message, { ...options, code: 'QUERY_ERROR', statusCode: 500 });
    this.name = 'QueryError';
    this.query = options.query;
  }
}

/**
 * Configuration error — bad setup
 */
class ConfigError extends DocketError {
  constructor(message, options = {}) {
    super(message, { ...options, code: 'CONFIG_ERROR', statusCode: 500 });
    this.name = 'ConfigError';
    this.configKey = options.configKey;
  }
}

/**
 * Unsupported content type
 */
class UnsupportedContentTypeError extends ValidationError {
  constructor(contentType, options = {}) {
    super(`Unsupported content type: ${contentType}`, { ...options, code: 'UNSUPPORTED_CONTENT_TYPE' });
    this.name = 'UnsupportedContentTypeError';
    this.contentType = contentType;
  }
}

/**
 * Rate limit error
 */
class RateLimitError extends DocketError {
  constructor(message, options = {}) {
    super(message, { ...options, code: 'RATE_LIMIT', statusCode: 429 });
    this.name = 'RateLimitError';
    this.retryAfter = options.retryAfter || 60;
  }
}

module.exports = {
  DocketError,
  ValidationError,
  AdapterError,
  NotFoundError,
  IngestionError,
  QueryError,
  ConfigError,
  UnsupportedContentTypeError,
  RateLimitError
};

// tests/unit/core/errors/index.test.js

const {
  DocketError,
  ValidationError,
  AdapterError,
  NotFoundError,
  IngestionError,
  QueryError,
  ConfigError,
  UnsupportedContentTypeError,
  RateLimitError
} = require('../../../../src/core/errors');

describe('DocketError', () => {
  it('creates with defaults', () => {
    const err = new DocketError('something went wrong');
    expect(err.message).toBe('something went wrong');
    expect(err.name).toBe('DocketError');
    expect(err.code).toBe('DOCKET_ERROR');
    expect(err.statusCode).toBe(500);
    expect(err.cause).toBeNull();
    expect(err.context).toEqual({});
  });

  it('creates with custom options', () => {
    const cause = new Error('root cause');
    const err = new DocketError('wrapper', {
      code: 'CUSTOM',
      statusCode: 418,
      cause,
      context: { foo: 'bar' }
    });
    expect(err.code).toBe('CUSTOM');
    expect(err.statusCode).toBe(418);
    expect(err.cause).toBe(cause);
    expect(err.context).toEqual({ foo: 'bar' });
  });

  it('serializes to JSON', () => {
    const err = new DocketError('test');
    const json = err.toJSON();
    expect(json).toEqual({
      name: 'DocketError',
      code: 'DOCKET_ERROR',
      message: 'test',
      statusCode: 500,
      context: {},
      cause: null
    });
  });

  it('serializes cause in JSON', () => {
    const cause = new Error('root');
    cause.code = 'CAUSE_CODE';
    const err = new DocketError('test', { cause });
    const json = err.toJSON();
    expect(json.cause).toEqual({
      message: 'root',
      code: 'CAUSE_CODE'
    });
  });
});

describe('ValidationError', () => {
  it('has correct defaults', () => {
    const err = new ValidationError('bad input');
    expect(err.name).toBe('ValidationError');
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.statusCode).toBe(400);
  });
});

describe('AdapterError', () => {
  it('has correct defaults', () => {
    const err = new AdapterError('service down');
    expect(err.name).toBe('AdapterError');
    expect(err.code).toBe('ADAPTER_ERROR');
    expect(err.statusCode).toBe(502);
    expect(err.adapterName).toBe('unknown');
  });

  it('captures adapter name', () => {
    const err = new AdapterError('down', { adapterName: 'ollama' });
    expect(err.adapterName).toBe('ollama');
  });
});

describe('NotFoundError', () => {
  it('has correct defaults', () => {
    const err = new NotFoundError('missing');
    expect(err.name).toBe('NotFoundError');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.statusCode).toBe(404);
    expect(err.resource).toBe('resource');
    expect(err.resourceId).toBeUndefined();
  });

  it('captures resource and id', () => {
    const err = new NotFoundError('gone', { resource: 'memory', resourceId: 'mem_1' });
    expect(err.resource).toBe('memory');
    expect(err.resourceId).toBe('mem_1');
  });
});

describe('IngestionError', () => {
  it('has correct defaults', () => {
    const err = new IngestionError('failed');
    expect(err.name).toBe('IngestionError');
    expect(err.code).toBe('INGESTION_ERROR');
    expect(err.statusCode).toBe(422);
    expect(err.stage).toBe('unknown');
    expect(err.jobId).toBeUndefined();
  });

  it('captures stage and jobId', () => {
    const err = new IngestionError('fail', { stage: 'extract', jobId: 'job_1' });
    expect(err.stage).toBe('extract');
    expect(err.jobId).toBe('job_1');
  });
});

describe('QueryError', () => {
  it('has correct defaults', () => {
    const err = new QueryError('search failed');
    expect(err.name).toBe('QueryError');
    expect(err.code).toBe('QUERY_ERROR');
    expect(err.statusCode).toBe(500);
    expect(err.query).toBeUndefined();
  });

  it('captures query', () => {
    const err = new QueryError('fail', { query: 'test' });
    expect(err.query).toBe('test');
  });
});

describe('ConfigError', () => {
  it('has correct defaults', () => {
    const err = new ConfigError('bad config');
    expect(err.name).toBe('ConfigError');
    expect(err.code).toBe('CONFIG_ERROR');
    expect(err.statusCode).toBe(500);
    expect(err.configKey).toBeUndefined();
  });

  it('captures config key', () => {
    const err = new ConfigError('missing', { configKey: 'adapters.store' });
    expect(err.configKey).toBe('adapters.store');
  });
});

describe('UnsupportedContentTypeError', () => {
  it('has correct defaults', () => {
    const err = new UnsupportedContentTypeError('image/tiff');
    expect(err.name).toBe('UnsupportedContentTypeError');
    expect(err.code).toBe('UNSUPPORTED_CONTENT_TYPE');
    expect(err.statusCode).toBe(400);
    expect(err.contentType).toBe('image/tiff');
    expect(err.message).toBe('Unsupported content type: image/tiff');
  });
});

describe('RateLimitError', () => {
  it('has correct defaults', () => {
    const err = new RateLimitError('slow down');
    expect(err.name).toBe('RateLimitError');
    expect(err.code).toBe('RATE_LIMIT');
    expect(err.statusCode).toBe(429);
    expect(err.retryAfter).toBe(60);
  });

  it('captures retryAfter', () => {
    const err = new RateLimitError('slow', { retryAfter: 120 });
    expect(err.retryAfter).toBe(120);
  });
});

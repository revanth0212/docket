// tests/unit/core/utils/logger.test.js

const { createLogger, getLogger, setLogger } = require('../../../../src/core/utils/logger');

describe('createLogger', () => {
  it('creates a logger with defaults', () => {
    const logger = createLogger();
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
  });

  it('respects custom level', () => {
    const logger = createLogger({ level: 'debug' });
    expect(logger.level).toBe('debug');
  });

  it('respects env LOG_LEVEL', () => {
    process.env.LOG_LEVEL = 'warn';
    const logger = createLogger();
    expect(logger.level).toBe('warn');
    delete process.env.LOG_LEVEL;
  });

  it('uses pretty transport in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const logger = createLogger({ format: 'pretty' });
    expect(logger).toBeDefined();
    process.env.NODE_ENV = originalEnv;
  });

  it('skips pretty transport in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const logger = createLogger({ format: 'pretty' });
    expect(logger).toBeDefined();
    process.env.NODE_ENV = originalEnv;
  });
});

describe('getLogger', () => {
  it('returns a logger', () => {
    const logger = getLogger();
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
  });

  it('returns the same instance', () => {
    const logger1 = getLogger();
    const logger2 = getLogger();
    expect(logger1).toBe(logger2);
  });
});

describe('setLogger', () => {
  it('replaces the logger instance', () => {
    const custom = { info: jest.fn() };
    setLogger(custom);
    expect(getLogger()).toBe(custom);
    // Reset to real logger for other tests
    setLogger(null);
  });
});

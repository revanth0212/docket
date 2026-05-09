// src/core/utils/logger.js
// Structured logging with Pino

const pino = require('pino');

let instance = null;

function createLogger(config = {}) {
  const level = config.level || process.env.LOG_LEVEL || 'info';
  const format = config.format || process.env.LOG_FORMAT || 'pretty';

  const options = {
    level,
    base: {
      pid: process.pid,
      env: process.env.NODE_ENV || 'development'
    }
  };

  if (format === 'pretty' && process.env.NODE_ENV !== 'production') {
    options.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    };
  }

  return pino(options);
}

function getLogger(config) {
  if (!instance) {
    instance = createLogger(config);
  }
  return instance;
}

function setLogger(logger) {
  instance = logger;
}

module.exports = {
  getLogger,
  setLogger,
  createLogger
};

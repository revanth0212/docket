// src/platform/standalone/index.js
// Standalone platform entry point (production single-process deployment)

const { buildUnifiedApp, startUnifiedApp } = require('../unified/app');

module.exports = { buildUnifiedApp, startUnifiedApp };

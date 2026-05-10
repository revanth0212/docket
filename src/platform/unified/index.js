// src/platform/unified/index.js
// Unified platform entry point (re-exports for programmatic use)

const { buildUnifiedApp, startUnifiedApp } = require('./app');

module.exports = { buildUnifiedApp, startUnifiedApp };

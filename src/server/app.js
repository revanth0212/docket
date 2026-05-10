// src/server/app.js
// Re-export data plane for backward compatibility.
// New code should import from src/data-plane/app.js or src/platform/unified/app.js

const { buildDataPlane, startDataPlane } = require('../data-plane/app');

function buildApp(options = {}) {
  return buildDataPlane(options);
}

async function startServer(options = {}) {
  return startDataPlane(options);
}

module.exports = { buildApp, startServer };

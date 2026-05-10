#!/usr/bin/env node
// src/platform/unified/bin.js
// Entry point for unified mode (local dev, small deployments)

const { startUnifiedApp } = require('./app');

async function main() {
  const port = process.env.CORTEX_PORT ? Number(process.env.CORTEX_PORT) : 3000;
  const host = process.env.CORTEX_HOST || '0.0.0.0';

  try {
    await startUnifiedApp({ port, host });
  } catch (err) {
    console.error('Failed to start Cortex unified server:', err.message);
    process.exit(1);
  }
}

main();

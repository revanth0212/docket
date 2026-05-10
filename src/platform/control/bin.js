#!/usr/bin/env node
// src/platform/control/bin.js
// Entry point for control plane only

const { startControlPlane } = require('../../control-plane/app');

async function main() {
  const port = process.env.CORTEX_CONTROL_PORT ? Number(process.env.CORTEX_CONTROL_PORT) : 3001;
  const host = process.env.CORTEX_CONTROL_HOST || '0.0.0.0';

  try {
    await startControlPlane({ port, host });
  } catch (err) {
    console.error('Failed to start Cortex control plane:', err.message);
    process.exit(1);
  }
}

main();

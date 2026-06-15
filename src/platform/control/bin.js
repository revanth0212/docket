#!/usr/bin/env node
// src/platform/control/bin.js
// Entry point for control plane only

const { loadConfig } = require('../../core/config/loader');
const { AdapterRegistry } = require('../../core/utils/adapter-registry');
const { createCoreServices } = require('../../core/modules/service-factory');
const { startControlPlane } = require('../../control-plane/app');

async function main() {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    console.error('Failed to load configuration:', err.message);
    process.exit(1);
  }

  const registry = new AdapterRegistry();
  let adapters;
  try {
    adapters = await registry.initializeFromConfig(config);
  } catch (err) {
    console.error('Failed to initialize adapters:', err.message);
    process.exit(1);
  }

  const services = createCoreServices(adapters, config);

  const port = process.env.DOCKET_CONTROL_PORT ? Number(process.env.DOCKET_CONTROL_PORT) : 3001;
  const host = process.env.DOCKET_CONTROL_HOST || '0.0.0.0';

  try {
    await startControlPlane({ port, host, adapters, registry, config, services });
  } catch (err) {
    console.error('Failed to start Docket control plane:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };

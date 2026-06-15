#!/usr/bin/env node
// src/platform/standalone/bin.js
// Production entry point for standalone Docket deployment

const { loadConfig } = require('../../core/config/loader');
const { AdapterRegistry } = require('../../core/utils/adapter-registry');
const { createCoreServices } = require('../../core/modules/service-factory');
const { startUnifiedApp } = require('../unified/app');

async function main() {
  let config;
  try {
    config = loadConfig();
    if (!config) {
      throw new Error('configuration is empty');
    }
  } catch (err) {
    console.error('Failed to load configuration:', err.message);
    console.error('Run `npm run setup` to create a config file, or check config/defaults.yaml');
    process.exit(1);
  }

  const registry = new AdapterRegistry();
  let adapters;
  try {
    adapters = await registry.initializeFromConfig(config);
  } catch (err) {
    console.error('Failed to initialize adapters:', err.message);
    console.error('Run `npm run doctor` to check prerequisites.');
    process.exit(1);
  }

  const services = createCoreServices(adapters, config);

  const port = process.env.PORT
    ? Number(process.env.PORT)
    : (process.env.DOCKET_PORT
      ? Number(process.env.DOCKET_PORT)
      : (config.docket.server?.port ?? 3000));
  const host = process.env.HOST || process.env.DOCKET_HOST || (config.docket.server?.host ?? '0.0.0.0');

  try {
    const app = await startUnifiedApp({ port, host, adapters, registry, config, services });
    app.log.info('Docket standalone server listening on http://%s:%d', host, port);
    app.log.info('Adapter registry initialized: %o', Object.keys(adapters));
    app.log.info('Core services initialized: %o', Object.keys(services));
  } catch (err) {
    console.error('Failed to start Docket standalone server:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };

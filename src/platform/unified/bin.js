#!/usr/bin/env node
// src/platform/unified/bin.js
// Entry point for unified mode (local dev, small deployments)

const { loadConfig } = require('../../core/config/loader');
const { AdapterRegistry } = require('../../core/utils/adapter-registry');
const { startUnifiedApp } = require('./app');

async function main() {
  let config;
  try {
    config = loadConfig();
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

  const port = process.env.DOCKET_PORT
    ? Number(process.env.DOCKET_PORT)
    : (config.docket.server?.port ?? 3000);
  const host = process.env.DOCKET_HOST || (config.docket.server?.host ?? '0.0.0.0');

  try {
    const app = await startUnifiedApp({ port, host, adapters, registry, config });
    app.log.info('Adapter registry initialized: %o', Object.keys(adapters));
  } catch (err) {
    console.error('Failed to start Docket unified server:', err.message);
    process.exit(1);
  }
}

main();

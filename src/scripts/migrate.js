#!/usr/bin/env node
// src/scripts/migrate.js
// Run database migrations for the configured store adapter

const { loadConfig } = require('../core/config/loader');
const { AdapterRegistry } = require('../core/utils/adapter-registry');

async function main() {
  console.log('\n🗄️  Cortex Migrations\n');

  const config = loadConfig();
  const registry = new AdapterRegistry();

  const storeConfig = config.cortex.adapters.store.providers[config.cortex.adapters.store.default];
  if (!storeConfig) {
    console.error('No store adapter configured');
    process.exit(1);
  }

  const store = await registry.loadAdapter('store', config.cortex.adapters.store.default, storeConfig);

  const version = await store.getMigrationVersion();
  console.log(`Current migration version: ${version}`);

  // Cleanup
  if (store.db && store.db.close) {
    store.db.close();
  }

  console.log('✅ Migrations checked.\n');
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});

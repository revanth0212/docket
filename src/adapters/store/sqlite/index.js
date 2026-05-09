// src/adapters/store/sqlite/index.js
// STUB: Phase 1 scaffold — will be replaced with real SQLite implementation in Phase 2

const { StoreAdapter } = require('../../../core/interfaces/store-adapter');

/**
 * SQLite Store Adapter (stub)
 * @implements {StoreAdapter}
 */
class SQLiteStoreAdapter extends StoreAdapter {
  async initialize() {
    // Stub: no-op
  }

  static get metadata() {
    return {
      name: 'sqlite-store',
      version: '0.1.0',
      capabilities: ['crud', 'vectorSearch', 'relations', 'migrations'],
      cortexCompatibility: '>=0.1.0 <0.3.0'
    };
  }
}

module.exports = { SQLiteStoreAdapter };

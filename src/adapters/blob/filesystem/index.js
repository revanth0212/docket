// src/adapters/blob/filesystem/index.js
// STUB: Phase 1 scaffold — will be replaced with real filesystem implementation in Phase 2

const { BlobAdapter } = require('../../../core/interfaces/blob-adapter');

/**
 * Filesystem Blob Adapter (stub)
 * @implements {BlobAdapter}
 */
class FilesystemBlobAdapter extends BlobAdapter {
  async initialize() {
    // Stub: no-op
  }

  static get metadata() {
    return {
      name: 'filesystem-blob',
      version: '0.1.0',
      capabilities: ['put', 'get', 'delete', 'exists'],
      cortexCompatibility: '>=0.1.0 <0.3.0'
    };
  }
}

module.exports = { FilesystemBlobAdapter };

// src/adapters/queue/memory/index.js
// STUB: Phase 1 scaffold — will be replaced with real in-memory implementation in Phase 2

const { QueueAdapter } = require('../../../core/interfaces/queue-adapter');

/**
 * In-Memory Queue Adapter (stub)
 * @implements {QueueAdapter}
 */
class InMemoryQueueAdapter extends QueueAdapter {
  async initialize() {
    // Stub: no-op
  }

  static get metadata() {
    return {
      name: 'memory-queue',
      version: '0.1.0',
      capabilities: ['enqueue', 'dequeue', 'workers'],
      cortexCompatibility: '>=0.1.0 <0.3.0'
    };
  }
}

module.exports = { InMemoryQueueAdapter };

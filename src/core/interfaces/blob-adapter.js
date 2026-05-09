// src/core/interfaces/blob-adapter.js
// FROZEN INTERFACE — Requires architect approval to modify

/**
 * Blob Storage Adapter Interface
 * 
 * All blob stores (filesystem, S3, R2, MinIO, etc.) implement this contract.
 * Core knows nothing about the storage backend — only this interface.
 * 
 * @abstract
 */
class BlobAdapter {
  constructor(config) {
    this.config = this.validateConfig(config);
  }

  validateConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Config must be an object');
    }
    return config;
  }

  /**
   * Initialize connection to blob store
   * @returns {Promise<void>}
   */
  async initialize() {
    // Override if needed
  }

  /**
   * Store a blob
   * @param {string} key — Unique identifier (e.g., "mem_abc123/raw.jpg")
   * @param {Buffer|ReadableStream} data — File content
   * @param {Object} metadata — { contentType, size, filename, userMetadata }
   * @returns {Promise<{key: string, url?: string, size: number}>}
   */
  // eslint-disable-next-line require-await, no-unused-vars
  async put(key, data, metadata) {
    throw new Error('Method "put" must be implemented by subclass');
  }

  /**
   * Retrieve a blob
   * @param {string} key
   * @returns {Promise<{data: Buffer, metadata: Object}>}
   */
  // eslint-disable-next-line require-await, no-unused-vars
  async get(key) {
    throw new Error('Method "get" must be implemented by subclass');
  }

  /**
   * Delete a blob
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  // eslint-disable-next-line require-await, no-unused-vars
  async delete(key) {
    throw new Error('Method "delete" must be implemented by subclass');
  }

  /**
   * Check if blob exists
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  // eslint-disable-next-line require-await, no-unused-vars
  async exists(key) {
    throw new Error('Method "exists" must be implemented by subclass');
  }

  /**
   * Get presigned URL for temporary access
   * @param {string} key
   * @param {number} expirySeconds
   * @returns {Promise<string|null>} — URL or null if not supported
   */
  // eslint-disable-next-line require-await, no-unused-vars
  async getUrl(key, _expirySeconds = 3600) {
    return null; // Default: not supported
  }

  /**
   * Check blob store health
   * @returns {Promise<{ok: boolean, latency: number, error?: string}>}
   */
  async health() {
    const start = Date.now();
    try {
      const testKey = `_health_${Date.now()}`;
      await this.put(testKey, Buffer.from('health'), { contentType: 'text/plain' });
      await this.delete(testKey);
      return { ok: true, latency: Date.now() - start };
    } catch (err) {
      return { ok: false, latency: Date.now() - start, error: err.message };
    }
  }

  static get metadata() {
    throw new Error('Property "metadata" must be implemented by subclass');
  }
}

module.exports = { BlobAdapter };

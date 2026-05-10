const fs = require('fs');
const path = require('path');
const { BlobAdapter } = require('../../../core/interfaces/blob-adapter');

/**
 * Filesystem Blob Adapter
 * @implements {BlobAdapter}
 */
class FilesystemBlobAdapter extends BlobAdapter {
  constructor(config) {
    super(config);
    this.basePath = this.config.basePath || './data/blobs';
  }

  validateConfig(config) {
    const validated = super.validateConfig(config);
    if (config.maxFileSize) {
      const size = this.parseSize(config.maxFileSize);
      validated.maxFileSize = size;
    }
    return validated;
  }

  parseSize(sizeStr) {
    if (typeof sizeStr === 'number') return sizeStr;
    const match = String(sizeStr).match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i);
    if (!match) return Infinity;
    const num = parseFloat(match[1]);
    const unit = (match[2] || 'b').toLowerCase();
    const multipliers = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 };
    return num * (multipliers[unit] || 1);
  }

  async initialize() {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  resolvePath(key) {
    // Prevent directory traversal
    const sanitized = key.replace(/\.\./g, '').replace(/^[/\\]/, '');
    return path.join(this.basePath, sanitized);
  }

  async put(key, data, metadata = {}) {
    const filePath = this.resolvePath(key);
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

    if (this.config.maxFileSize && buffer.length > this.config.maxFileSize) {
      throw new Error(`File size ${buffer.length} exceeds max ${this.config.maxFileSize}`);
    }

    fs.writeFileSync(filePath, buffer);

    // Store metadata alongside the file
    const metaPath = `${filePath}.meta.json`;
    fs.writeFileSync(metaPath, JSON.stringify({
      ...metadata,
      size: buffer.length,
      storedAt: new Date().toISOString()
    }));

    return {
      key,
      size: buffer.length
    };
  }

  async get(key) {
    const filePath = this.resolvePath(key);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Blob not found: ${key}`);
    }

    const data = fs.readFileSync(filePath);
    const metaPath = `${filePath}.meta.json`;
    let metadata = {};

    if (fs.existsSync(metaPath)) {
      metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    }

    return { data, metadata };
  }

  async delete(key) {
    const filePath = this.resolvePath(key);

    if (!fs.existsSync(filePath)) {
      return false;
    }

    fs.unlinkSync(filePath);

    const metaPath = `${filePath}.meta.json`;
    if (fs.existsSync(metaPath)) {
      fs.unlinkSync(metaPath);
    }

    return true;
  }

  async exists(key) {
    const filePath = this.resolvePath(key);
    return fs.existsSync(filePath);
  }

  async getUrl(_key, _expirySeconds = 3600) {
    // Filesystem doesn't support presigned URLs
    return null;
  }

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
    return {
      name: 'filesystem-blob',
      version: '0.1.0',
      capabilities: ['put', 'get', 'delete', 'exists'],
      cortexCompatibility: '>=0.1.0 <0.3.0'
    };
  }
}

module.exports = { FilesystemBlobAdapter };

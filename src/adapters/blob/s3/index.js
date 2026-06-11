const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { BlobAdapter } = require('../../../core/interfaces/blob-adapter');

/**
 * S3-Compatible Blob Adapter
 * Works with AWS S3, Cloudflare R2, MinIO, and any S3-compatible service.
 * @implements {BlobAdapter}
 */
class S3BlobAdapter extends BlobAdapter {
  constructor(config) {
    super(config);
    this.endpoint = this.config.endpoint;
    this.bucket = this.config.bucket;
    this.region = this.config.region || 'us-east-1';
    this.accessKeyId = this.config.accessKeyId;
    this.secretAccessKey = this.config.secretAccessKey;
    this.forcePathStyle = this.config.forcePathStyle ?? false;
  }

  async initialize() {
    const clientConfig = {
      region: this.region,
      forcePathStyle: this.forcePathStyle
    };

    if (this.endpoint) {
      clientConfig.endpoint = this.endpoint;
    }

    if (this.accessKeyId && this.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey
      };
    }

    this.client = new S3Client(clientConfig);
  }

  async put(key, data, metadata = {}) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: data,
      ContentType: metadata.contentType || 'application/octet-stream',
      Metadata: metadata.userMetadata || {}
    });

    await this.client.send(command);

    return {
      key,
      size: Buffer.isBuffer(data) ? data.length : 0,
      url: await this.getUrl(key)
    };
  }

  async get(key) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key
    });

    const response = await this.client.send(command);
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }

    return {
      data: Buffer.concat(chunks),
      metadata: {
        contentType: response.ContentType,
        size: response.ContentLength,
        lastModified: response.LastModified,
        ...response.Metadata
      }
    };
  }

  async delete(key) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      });
      await this.client.send(command);
      return true;
    } catch (err) {
      if (err.name === 'NoSuchKey') return false;
      throw err;
    }
  }

  async exists(key) {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key
      });
      await this.client.send(command);
      return true;
    } catch (err) {
      if (err.name === 'NotFound' || err.name === 'NoSuchKey') return false;
      throw err;
    }
  }

  async getUrl(key, expirySeconds = 3600) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });
      return await getSignedUrl(this.client, command, { expiresIn: expirySeconds });
    } catch {
      return null;
    }
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
      name: 's3-blob',
      version: '0.1.0',
      capabilities: ['put', 'get', 'delete', 'exists', 'presignedUrls'],
      docketCompatibility: '>=0.1.0 <0.3.0'
    };
  }
}

module.exports = { S3BlobAdapter };

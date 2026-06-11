// tests/unit/adapters/blob/s3/index.test.js

const { S3BlobAdapter } = require('../../../../../src/adapters/blob/s3');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

describe('S3BlobAdapter', () => {
  let adapter;
  let sendMock;

  beforeEach(async () => {
    sendMock = jest.fn();
    S3Client.mockImplementation(() => ({ send: sendMock }));
    PutObjectCommand.mockImplementation((input) => ({ ...input, _type: 'PutObject' }));
    GetObjectCommand.mockImplementation((input) => ({ ...input, _type: 'GetObject' }));
    DeleteObjectCommand.mockImplementation((input) => ({ ...input, _type: 'DeleteObject' }));
    HeadObjectCommand.mockImplementation((input) => ({ ...input, _type: 'HeadObject' }));

    adapter = new S3BlobAdapter({
      endpoint: 'http://localhost:9000',
      bucket: 'test-bucket',
      region: 'us-west-2',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      forcePathStyle: true
    });
    await adapter.initialize();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('constructs with defaults', () => {
    const a = new S3BlobAdapter({ bucket: 'b' });
    expect(a.region).toBe('us-east-1');
    expect(a.forcePathStyle).toBe(false);
  });

  it('initializes S3 client with credentials', () => {
    expect(S3Client).toHaveBeenCalledWith({
      region: 'us-west-2',
      forcePathStyle: true,
      endpoint: 'http://localhost:9000',
      credentials: {
        accessKeyId: 'key',
        secretAccessKey: 'secret'
      }
    });
  });

  it('initializes S3 client without credentials when omitted', async () => {
    S3Client.mockClear();
    const a = new S3BlobAdapter({ bucket: 'b' });
    await a.initialize();
    expect(S3Client).toHaveBeenCalledWith({
      region: 'us-east-1',
      forcePathStyle: false
    });
  });

  it('puts a blob and returns key, size, url', async () => {
    sendMock.mockResolvedValue({});
    getSignedUrl.mockResolvedValue('http://signed-url');

    const result = await adapter.put('file.txt', Buffer.from('hello'), {
      contentType: 'text/plain',
      userMetadata: { owner: 'me' }
    });

    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: 'test-bucket',
      Key: 'file.txt',
      Body: expect.any(Buffer),
      ContentType: 'text/plain',
      Metadata: { owner: 'me' }
    });
    expect(sendMock).toHaveBeenCalled();
    expect(result).toEqual({
      key: 'file.txt',
      size: 5,
      url: 'http://signed-url'
    });
  });

  it('gets a blob', async () => {
    sendMock.mockResolvedValue({
      Body: [Buffer.from('hel'), Buffer.from('lo')],
      ContentType: 'text/plain',
      ContentLength: 5,
      LastModified: new Date('2024-01-01'),
      Metadata: { owner: 'me' }
    });

    const result = await adapter.get('file.txt');

    expect(GetObjectCommand).toHaveBeenCalledWith({ Bucket: 'test-bucket', Key: 'file.txt' });
    expect(result.data.toString()).toBe('hello');
    expect(result.metadata.contentType).toBe('text/plain');
    expect(result.metadata.size).toBe(5);
    expect(result.metadata.owner).toBe('me');
  });

  it('deletes a blob', async () => {
    sendMock.mockResolvedValue({});
    const result = await adapter.delete('file.txt');
    expect(DeleteObjectCommand).toHaveBeenCalledWith({ Bucket: 'test-bucket', Key: 'file.txt' });
    expect(result).toBe(true);
  });

  it('returns false deleting non-existent blob', async () => {
    const err = new Error('Not found');
    err.name = 'NoSuchKey';
    sendMock.mockRejectedValue(err);

    const result = await adapter.delete('missing.txt');
    expect(result).toBe(false);
  });

  it('throws on unexpected delete error', async () => {
    sendMock.mockRejectedValue(new Error('network failure'));
    await expect(adapter.delete('file.txt')).rejects.toThrow('network failure');
  });

  it('checks existence', async () => {
    sendMock.mockResolvedValue({});
    const result = await adapter.exists('file.txt');
    expect(HeadObjectCommand).toHaveBeenCalledWith({ Bucket: 'test-bucket', Key: 'file.txt' });
    expect(result).toBe(true);
  });

  it('returns false when blob does not exist', async () => {
    const err = new Error('NotFound');
    err.name = 'NotFound';
    sendMock.mockRejectedValue(err);
    expect(await adapter.exists('missing.txt')).toBe(false);
  });

  it('throws on unexpected exists error', async () => {
    sendMock.mockRejectedValue(new Error('network failure'));
    await expect(adapter.exists('file.txt')).rejects.toThrow('network failure');
  });

  it('returns presigned url', async () => {
    getSignedUrl.mockResolvedValue('http://signed');
    const url = await adapter.getUrl('file.txt', 60);
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ Bucket: 'test-bucket', Key: 'file.txt' }),
      { expiresIn: 60 }
    );
    expect(url).toBe('http://signed');
  });

  it('returns null when presigned url fails', async () => {
    getSignedUrl.mockRejectedValue(new Error('no signing'));
    const url = await adapter.getUrl('file.txt');
    expect(url).toBeNull();
  });

  it('returns health ok', async () => {
    sendMock.mockResolvedValue({});
    getSignedUrl.mockResolvedValue('http://signed');
    const health = await adapter.health();
    expect(health.ok).toBe(true);
    expect(health.latency).toBeGreaterThanOrEqual(0);
  });

  it('returns health error on failure', async () => {
    sendMock.mockRejectedValue(new Error('s3 down'));
    const health = await adapter.health();
    expect(health.ok).toBe(false);
    expect(health.error).toBe('s3 down');
  });

  it('returns metadata', () => {
    expect(S3BlobAdapter.metadata.name).toBe('s3-blob');
    expect(S3BlobAdapter.metadata.capabilities).toContain('presignedUrls');
  });
});

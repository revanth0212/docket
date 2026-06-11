// tests/unit/adapters/store/dynamodb/index.test.js

const { DynamoDBStoreAdapter } = require('../../../../../src/adapters/store/dynamodb');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

describe('DynamoDBStoreAdapter', () => {
  let adapter;
  let sendMock;

  beforeEach(async () => {
    sendMock = jest.fn();
    DynamoDBDocumentClient.from.mockReturnValue({ send: sendMock });
    DynamoDBClient.mockImplementation(() => ({ send: sendMock }));

    DynamoDBClient.mockClear();

    adapter = new DynamoDBStoreAdapter({
      tableName: 'docket-test',
      region: 'us-west-2',
      accessKeyId: 'key',
      secretAccessKey: 'secret'
    });

    // initialize calls health which creates its own client; mock success
    sendMock.mockResolvedValue({ TableNames: ['docket-test'] });
    await adapter.initialize();
    sendMock.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('uses default config values', () => {
    const a = new DynamoDBStoreAdapter({});
    expect(a.tableName).toBe('docket');
    expect(a.region).toBe('us-east-1');
  });

  it('initializes with credentials', () => {
    expect(DynamoDBClient).toHaveBeenCalledWith({
      region: 'us-west-2',
      credentials: {
        accessKeyId: 'key',
        secretAccessKey: 'secret'
      }
    });
  });

  it('throws when dynamodb is unreachable', async () => {
    sendMock.mockRejectedValue(new Error('unreachable'));
    const a = new DynamoDBStoreAdapter({ tableName: 't' });
    await expect(a.initialize()).rejects.toThrow('DynamoDB unreachable');
  });

  it('creates a memory', async () => {
    sendMock
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: itemFor({ id: 'mem_1', rawRef: 'r.jpg', contentType: 'image/jpeg' }) });

    const memory = await adapter.createMemory({
      id: 'mem_1',
      rawRef: 'r.jpg',
      contentType: 'image/jpeg',
      metadata: { source: 'test' }
    });

    expect(PutCommand).toHaveBeenCalledWith(expect.objectContaining({
      TableName: 'docket-test',
      Item: expect.objectContaining({ pk: 'MEM#mem_1', rawRef: 'r.jpg' })
    }));
    expect(memory.id).toBe('mem_1');
  });

  it('gets a memory by id', async () => {
    sendMock.mockResolvedValue({ Item: itemFor({ id: 'mem_1', rawRef: 'r.jpg', contentType: 'image/jpeg' }) });

    const memory = await adapter.getMemory('mem_1');
    expect(GetCommand).toHaveBeenCalledWith(expect.objectContaining({
      TableName: 'docket-test',
      Key: { pk: 'MEM#mem_1', sk: 'META' }
    }));
    expect(memory.id).toBe('mem_1');
  });

  it('returns null for missing memory', async () => {
    sendMock.mockResolvedValue({});
    expect(await adapter.getMemory('mem_missing')).toBeNull();
  });

  it('queries memories by content type', async () => {
    sendMock.mockResolvedValue({
      Items: [itemFor({ id: 'mem_1', rawRef: 'a.jpg', contentType: 'image/jpeg' })]
    });

    const { results, total } = await adapter.queryMemories({ contentType: 'image/jpeg' }, { limit: 5 });

    expect(ScanCommand).toHaveBeenCalledWith(expect.objectContaining({
      TableName: 'docket-test',
      FilterExpression: expect.stringContaining('contentType = :ct'),
      Limit: 5
    }));
    expect(total).toBe(1);
    expect(results[0].contentType).toBe('image/jpeg');
  });

  it('queries all memories when no content type filter', async () => {
    sendMock.mockResolvedValue({ Items: [] });
    await adapter.queryMemories({}, { limit: 10 });
    expect(ScanCommand).toHaveBeenCalledWith(expect.objectContaining({
      FilterExpression: 'begins_with(pk, :pkPrefix)'
    }));
  });

  it('performs vector search', async () => {
    sendMock.mockResolvedValue({
      Items: [
        itemFor({ id: 'mem_1', rawRef: 'a.jpg', contentType: 'image/jpeg', embedding: [1, 0, 0] }),
        itemFor({ id: 'mem_2', rawRef: 'b.jpg', contentType: 'image/jpeg', embedding: [0, 1, 0] })
      ]
    });

    const results = await adapter.vectorSearch([1, 0, 0], { limit: 5 });
    expect(results.length).toBe(2);
    expect(results[0].memory.id).toBe('mem_1');
    expect(results[0].score).toBe(1);
  });

  it('filters vector search by threshold', async () => {
    sendMock.mockResolvedValue({
      Items: [
        itemFor({ id: 'mem_1', rawRef: 'a.jpg', contentType: 'image/jpeg', embedding: [1, 0, 0] }),
        itemFor({ id: 'mem_2', rawRef: 'b.jpg', contentType: 'image/jpeg', embedding: [0, 1, 0] })
      ]
    });

    const results = await adapter.vectorSearch([1, 0, 0], { limit: 5, threshold: 0.99 });
    expect(results.length).toBe(1);
  });

  it('throws on invalid vector search input', async () => {
    await expect(adapter.vectorSearch(null)).rejects.toThrow('Embedding must be an array');
  });

  it('updates a memory', async () => {
    sendMock
      .mockResolvedValueOnce({ Item: itemFor({ id: 'mem_1', rawRef: 'r.jpg', contentType: 'image/jpeg' }) })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: itemFor({ id: 'mem_1', rawRef: 'r.jpg', contentType: 'image/jpeg', summary: 'updated' }) });

    const updated = await adapter.updateMemory('mem_1', { summary: 'updated' });

    expect(UpdateCommand).toHaveBeenCalledWith(expect.objectContaining({
      TableName: 'docket-test',
      UpdateExpression: expect.stringContaining('summary = :summary')
    }));
    expect(updated.summary).toBe('updated');
  });

  it('throws updating non-existent memory', async () => {
    sendMock.mockResolvedValue({});
    await expect(adapter.updateMemory('mem_missing', { summary: 'x' })).rejects.toThrow('Memory not found');
  });

  it('deletes a memory', async () => {
    sendMock
      .mockResolvedValueOnce({ Item: itemFor({ id: 'mem_1', rawRef: 'r.jpg', contentType: 'image/jpeg' }) })
      .mockResolvedValueOnce({});

    const deleted = await adapter.deleteMemory('mem_1');
    expect(DeleteCommand).toHaveBeenCalledWith(expect.objectContaining({
      TableName: 'docket-test',
      Key: { pk: 'MEM#mem_1', sk: 'META' }
    }));
    expect(deleted).toBe(true);
  });

  it('returns false deleting non-existent memory', async () => {
    sendMock.mockResolvedValue({});
    expect(await adapter.deleteMemory('mem_missing')).toBe(false);
  });

  it('creates a relation', async () => {
    sendMock.mockResolvedValue({});

    const relation = await adapter.createRelation({
      sourceId: 'mem_1',
      targetId: 'mem_2',
      type: 'related',
      confidence: 0.9,
      metadata: { reason: 'test' }
    });

    expect(PutCommand).toHaveBeenCalledWith(expect.objectContaining({
      TableName: 'docket-test',
      Item: expect.objectContaining({ pk: 'REL#mem_1:mem_2:related' })
    }));
    expect(relation.sourceId).toBe('mem_1');
    expect(relation.targetId).toBe('mem_2');
  });

  it('gets memory graph', async () => {
    sendMock.mockResolvedValue({
      Items: [
        { pk: 'REL#mem_1:mem_2:related', sk: 'META', id: 'mem_1:mem_2:related', sourceId: 'mem_1', targetId: 'mem_2', type: 'related', confidence: 1, metadata: null, createdAt: '2024-01-01T00:00:00.000Z' }
      ]
    });

    const edges = await adapter.getMemoryGraph('mem_1');
    expect(edges.length).toBe(1);
    expect(edges[0].sourceId).toBe('mem_1');
  });

  it('filters memory graph by type', async () => {
    sendMock.mockResolvedValue({ Items: [] });
    await adapter.getMemoryGraph('mem_1', { type: 'related' });
    expect(ScanCommand).toHaveBeenCalledWith(expect.objectContaining({
      FilterExpression: expect.stringContaining('type = :type'),
      ExpressionAttributeValues: expect.objectContaining({ ':type': 'related' })
    }));
  });

  it('returns health ok', async () => {
    sendMock.mockResolvedValue({ TableNames: ['docket-test'] });
    const health = await adapter.health();
    expect(health.ok).toBe(true);
  });

  it('returns health error on failure', async () => {
    sendMock.mockRejectedValue(new Error('dynamodb down'));
    const health = await adapter.health();
    expect(health.ok).toBe(false);
    expect(health.error).toBe('dynamodb down');
  });

  it('returns static migration version', async () => {
    expect(await adapter.getMigrationVersion()).toBe('0.0.0');
  });

  it('runMigration is a no-op', async () => {
    await expect(adapter.runMigration('SELECT 1')).resolves.toBeUndefined();
  });

  it('returns metadata', () => {
    expect(DynamoDBStoreAdapter.metadata.name).toBe('dynamodb-store');
  });
});

function itemFor(fields) {
  return {
    pk: `MEM#${fields.id}`,
    sk: 'META',
    id: fields.id,
    rawRef: fields.rawRef,
    contentType: fields.contentType,
    extractedText: fields.extractedText || null,
    summary: fields.summary || null,
    metadata: fields.metadata ? JSON.stringify(fields.metadata) : null,
    embedding: fields.embedding ? JSON.stringify(fields.embedding) : undefined,
    parentId: fields.parentId || null,
    sector: fields.sector || null,
    salience: fields.salience ?? 1.0,
    validFrom: fields.validFrom || null,
    validTo: fields.validTo || null,
    accessPolicy: fields.accessPolicy || 'owner-only',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

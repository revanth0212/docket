const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { StoreAdapter } = require('../../../core/interfaces/store-adapter');
const { generateMemoryId } = require('../../../core/utils/id-generator');

/**
 * AWS DynamoDB Store Adapter
 * Uses DynamoDB for memory storage with GSI for content type and sector queries.
 * Vector search uses in-memory cosine similarity over stored embeddings.
 * @implements {StoreAdapter}
 */
class DynamoDBStoreAdapter extends StoreAdapter {
  constructor(config) {
    super(config);
    this.tableName = this.config.tableName || 'docket';
    this.region = this.config.region || 'us-east-1';
    this.accessKeyId = this.config.accessKeyId;
    this.secretAccessKey = this.config.secretAccessKey;
  }

  async initialize() {
    const clientConfig = { region: this.region };
    if (this.accessKeyId && this.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey
      };
    }

    const client = new DynamoDBClient(clientConfig);
    this.docClient = DynamoDBDocumentClient.from(client);

    // Verify table exists
    const health = await this.health();
    if (!health.ok) {
      throw new Error(`DynamoDB unreachable: ${health.error}`);
    }
  }

  _toItem(memory) {
    const item = {
      pk: `MEM#${memory.id}`,
      sk: 'META',
      id: memory.id,
      rawRef: memory.rawRef,
      contentType: memory.contentType,
      extractedText: memory.extractedText || null,
      summary: memory.summary || null,
      metadata: memory.metadata ? JSON.stringify(memory.metadata) : null,
      parentId: memory.parentId || null,
      sector: memory.sector || null,
      salience: memory.salience ?? 1.0,
      validFrom: memory.validFrom || null,
      validTo: memory.validTo || null,
      accessPolicy: memory.accessPolicy || 'owner-only',
      createdAt: memory.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (memory.embedding && Array.isArray(memory.embedding)) {
      item.embedding = JSON.stringify(memory.embedding);
    }

    return item;
  }

  _fromItem(item) {
    return {
      id: item.id,
      rawRef: item.rawRef,
      contentType: item.contentType,
      extractedText: item.extractedText,
      summary: item.summary,
      metadata: item.metadata ? JSON.parse(item.metadata) : undefined,
      embedding: item.embedding ? JSON.parse(item.embedding) : undefined,
      parentId: item.parentId,
      sector: item.sector,
      salience: item.salience,
      validFrom: item.validFrom ? new Date(item.validFrom) : undefined,
      validTo: item.validTo ? new Date(item.validTo) : undefined,
      accessPolicy: item.accessPolicy,
      createdAt: new Date(item.createdAt),
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined
    };
  }

  async createMemory(memory) {
    const id = memory.id || generateMemoryId();
    const item = this._toItem({ ...memory, id });

    await this.docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: item
    }));

    return this.getMemory(id);
  }

  async getMemory(id) {
    const result = await this.docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: { pk: `MEM#${id}`, sk: 'META' }
    }));

    if (!result.Item) return null;
    return this._fromItem(result.Item);
  }

  async queryMemories(filters = {}, options = {}) {
    const limit = options.limit || 50;
    const results = [];

    if (filters.contentType) {
      const scanResult = await this.docClient.send(new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'begins_with(pk, :pkPrefix) AND contentType = :ct',
        ExpressionAttributeValues: {
          ':pkPrefix': 'MEM#',
          ':ct': filters.contentType
        },
        Limit: limit
      }));
      results.push(...(scanResult.Items || []).map((i) => this._fromItem(i)));
    } else {
      const scanResult = await this.docClient.send(new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'begins_with(pk, :pkPrefix)',
        ExpressionAttributeValues: { ':pkPrefix': 'MEM#' },
        Limit: limit
      }));
      results.push(...(scanResult.Items || []).map((i) => this._fromItem(i)));
    }

    // Sort by createdAt desc
    results.sort((a, b) => b.createdAt - a.createdAt);

    return { results, total: results.length };
  }

  async vectorSearch(embedding, options = {}) {
    const threshold = options.threshold ?? 0.0;
    const limit = options.limit || 10;

    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Embedding must be an array of numbers');
    }

    // DynamoDB does not natively support vector search. Scan and compute similarity.
    const scanResult = await this.docClient.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'begins_with(pk, :pkPrefix) AND attribute_exists(embedding)',
      ExpressionAttributeValues: { ':pkPrefix': 'MEM#' }
    }));

    const results = [];
    for (const item of scanResult.Items || []) {
      if (!item.embedding) continue;
      const stored = JSON.parse(item.embedding);
      const score = this._cosineSimilarity(embedding, stored);
      if (score >= threshold) {
        results.push({ memory: this._fromItem(item), score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  _cosineSimilarity(a, b) {
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
  }

  async updateMemory(id, patch) {
    const existing = await this.getMemory(id);
    if (!existing) {
      throw new Error(`Memory not found: ${id}`);
    }

    const updateExpressions = [];
    const expressionValues = {};

    const fieldMap = {
      rawRef: 'rawRef',
      contentType: 'contentType',
      extractedText: 'extractedText',
      summary: 'summary',
      metadata: 'metadata',
      parentId: 'parentId',
      sector: 'sector',
      salience: 'salience',
      validFrom: 'validFrom',
      validTo: 'validTo',
      accessPolicy: 'accessPolicy'
    };

    for (const [jsKey, attrKey] of Object.entries(fieldMap)) {
      if (patch[jsKey] !== undefined) {
        updateExpressions.push(`${attrKey} = :${attrKey}`);
        expressionValues[`:${attrKey}`] =
          jsKey === 'metadata' && patch[jsKey] != null
            ? JSON.stringify(patch[jsKey])
            : patch[jsKey];
      }
    }

    if (patch.embedding !== undefined) {
      updateExpressions.push('embedding = :embedding');
      expressionValues[':embedding'] =
        patch.embedding && Array.isArray(patch.embedding)
          ? JSON.stringify(patch.embedding)
          : null;
    }

    if (updateExpressions.length > 0) {
      updateExpressions.push('updatedAt = :updatedAt');
      expressionValues[':updatedAt'] = new Date().toISOString();

      await this.docClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { pk: `MEM#${id}`, sk: 'META' },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeValues: expressionValues
      }));
    }

    return this.getMemory(id);
  }

  async deleteMemory(id) {
    const existing = await this.getMemory(id);
    if (!existing) return false;

    await this.docClient.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { pk: `MEM#${id}`, sk: 'META' }
    }));

    return true;
  }

  async createRelation(relation) {
    const { sourceId, targetId, type, confidence = 1.0, metadata } = relation;
    const id = `${sourceId}:${targetId}:${type}`;

    await this.docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: {
        pk: `REL#${id}`,
        sk: 'META',
        id,
        sourceId,
        targetId,
        type,
        confidence,
        metadata: metadata ? JSON.stringify(metadata) : null,
        createdAt: new Date().toISOString()
      }
    }));

    return {
      id,
      sourceId,
      targetId,
      type,
      confidence,
      metadata,
      createdAt: new Date()
    };
  }

  async getMemoryGraph(memoryId, options = {}) {
    const typeFilter = options.type;
    const limit = options.limit || 50;

    // Scan for relations involving this memory
    const scanResult = await this.docClient.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'begins_with(pk, :pkPrefix) AND (sourceId = :id OR targetId = :id)',
      ExpressionAttributeValues: {
        ':pkPrefix': 'REL#',
        ':id': memoryId
      },
      Limit: limit
    }));

    const edges = [];
    for (const item of scanResult.Items || []) {
      if (typeFilter && item.type !== typeFilter) continue;
      edges.push({
        id: item.id,
        sourceId: item.sourceId,
        targetId: item.targetId,
        type: item.type,
        confidence: item.confidence,
        metadata: item.metadata ? JSON.parse(item.metadata) : undefined,
        createdAt: new Date(item.createdAt)
      });
    }

    return edges;
  }

  async health() {
    const start = Date.now();
    try {
      // ListTables is a lightweight operation
      const { DynamoDBClient, ListTablesCommand } = require('@aws-sdk/client-dynamodb');
      const clientConfig = { region: this.region };
      if (this.accessKeyId && this.secretAccessKey) {
        clientConfig.credentials = {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey
        };
      }
      const client = new DynamoDBClient(clientConfig);
      await client.send(new ListTablesCommand({}));
      return { ok: true, latency: Date.now() - start };
    } catch (err) {
      return { ok: false, latency: Date.now() - start, error: err.message };
    }
  }

  async getMigrationVersion() {
    return '0.0.0';
  }

  async runMigration(_sql) {
    // DynamoDB is schemaless; migrations are handled by item structure
  }

  static get metadata() {
    return {
      name: 'dynamodb-store',
      version: '0.1.0',
      capabilities: ['crud', 'vectorSearch', 'relations'],
      docketCompatibility: '>=0.1.0 <0.3.0'
    };
  }
}

module.exports = { DynamoDBStoreAdapter };

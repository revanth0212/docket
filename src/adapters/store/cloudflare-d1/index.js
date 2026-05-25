const { StoreAdapter } = require('../../../core/interfaces/store-adapter');
const { generateMemoryId } = require('../../../core/utils/id-generator');

/**
 * Cloudflare D1 Store Adapter
 * Uses the Cloudflare D1 HTTP API.
 * Note: Vector search requires sqlite-vec extension which may not be available
 * on D1. This adapter implements CRUD and graph relations; vector search
 * falls back to in-memory cosine similarity or raises an error.
 * @implements {StoreAdapter}
 */
class CloudflareD1StoreAdapter extends StoreAdapter {
  constructor(config) {
    super(config);
    this.accountId = this.config.accountId;
    this.databaseId = this.config.databaseId;
    this.apiToken = this.config.apiToken;
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}`;
  }

  async initialize() {
    // Verify database is accessible and run migrations
    await this._query('SELECT 1');
    await this._ensureSchema();
  }

  async _query(sql, params = []) {
    const url = `${this.baseUrl}/query`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiToken}`
      },
      body: JSON.stringify({ sql, params })
    });

    const data = await res.json();
    if (!data.success) {
      const errors = data.errors?.map((e) => e.message).join('; ') || 'D1 query failed';
      throw new Error(errors);
    }
    return data.result?.[0]?.results || [];
  }

  async _exec(sql) {
    return this._query(sql);
  }

  async _ensureSchema() {
    await this._exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        raw_ref TEXT NOT NULL,
        content_type TEXT NOT NULL,
        extracted_text TEXT,
        summary TEXT,
        metadata TEXT,
        parent_id TEXT,
        sector TEXT,
        salience REAL DEFAULT 1.0,
        valid_from TEXT,
        valid_to TEXT,
        access_policy TEXT DEFAULT 'owner-only',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this._exec(`
      CREATE INDEX IF NOT EXISTS idx_memories_parent ON memories(parent_id)
    `);
    await this._exec(`
      CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at)
    `);
    await this._exec(`
      CREATE INDEX IF NOT EXISTS idx_memories_sector ON memories(sector)
    `);

    await this._exec(`
      CREATE TABLE IF NOT EXISTS relations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        type TEXT NOT NULL,
        confidence REAL DEFAULT 1.0,
        metadata TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(source_id, target_id, type)
      )
    `);

    await this._exec(`
      CREATE INDEX IF NOT EXISTS idx_relations_source ON relations(source_id)
    `);
    await this._exec(`
      CREATE INDEX IF NOT EXISTS idx_relations_target ON relations(target_id)
    `);

    await this._exec(`
      CREATE TABLE IF NOT EXISTS vec_memories (
        memory_id TEXT PRIMARY KEY,
        embedding TEXT
      )
    `);

    await this._exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL UNIQUE,
        applied_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async createMemory(memory) {
    const id = memory.id || generateMemoryId();
    const now = new Date().toISOString();

    await this._query(
      `INSERT INTO memories (
        id, raw_ref, content_type, extracted_text, summary, metadata,
        parent_id, sector, salience, valid_from, valid_to, access_policy,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        memory.rawRef,
        memory.contentType,
        memory.extractedText || null,
        memory.summary || null,
        memory.metadata ? JSON.stringify(memory.metadata) : null,
        memory.parentId || null,
        memory.sector || null,
        memory.salience ?? 1.0,
        memory.validFrom || null,
        memory.validTo || null,
        memory.accessPolicy || 'owner-only',
        memory.createdAt?.toISOString() || now,
        now
      ]
    );

    if (memory.embedding && Array.isArray(memory.embedding)) {
      await this._query(
        'INSERT INTO vec_memories (memory_id, embedding) VALUES (?, ?)',
        [id, JSON.stringify(memory.embedding)]
      );
    }

    return this.getMemory(id);
  }

  async getMemory(id) {
    const rows = await this._query('SELECT * FROM memories WHERE id = ?', [id]);
    if (!rows.length) return null;
    return this._hydrate(rows[0]);
  }

  async queryMemories(filters = {}, options = {}) {
    const conditions = ['1=1'];
    const params = [];

    if (filters.contentType) {
      conditions.push('content_type = ?');
      params.push(filters.contentType);
    }
    if (filters.dateFrom) {
      conditions.push('created_at >= ?');
      params.push(filters.dateFrom.toISOString());
    }
    if (filters.dateTo) {
      conditions.push('created_at <= ?');
      params.push(filters.dateTo.toISOString());
    }

    const limit = options.limit || 50;
    const offset = options.offset || 0;
    const sortBy = options.sortBy || 'created_at';
    const sortOrder = options.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const allowedSort = ['created_at', 'updated_at', 'salience', 'id'];
    const safeSort = allowedSort.includes(sortBy) ? sortBy : 'created_at';

    const whereClause = conditions.join(' AND ');

    const countRows = await this._query(
      `SELECT COUNT(*) as total FROM memories WHERE ${whereClause}`,
      params
    );

    const rows = await this._query(
      `SELECT * FROM memories WHERE ${whereClause} ORDER BY ${safeSort} ${sortOrder} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      results: rows.map((r) => this._hydrate(r)),
      total: countRows[0]?.total || 0
    };
  }

  async vectorSearch(embedding, options = {}) {
    const threshold = options.threshold ?? 0.0;

    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Embedding must be an array of numbers');
    }

    // D1 does not support sqlite-vec. Fall back to in-memory cosine similarity.
    const rows = await this._query('SELECT memory_id, embedding FROM vec_memories');
    const results = [];

    for (const row of rows) {
      if (!row.embedding) continue;
      const stored = JSON.parse(row.embedding);
      const score = this._cosineSimilarity(embedding, stored);
      if (score >= threshold) {
        const memory = await this.getMemory(row.memory_id);
        if (memory) {
          results.push({ memory, score });
        }
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    const limit = options.limit || 10;
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

    const values = [];
    const sets = [];

    const fieldMap = {
      rawRef: 'raw_ref',
      contentType: 'content_type',
      extractedText: 'extracted_text',
      summary: 'summary',
      metadata: 'metadata',
      parentId: 'parent_id',
      sector: 'sector',
      salience: 'salience',
      validFrom: 'valid_from',
      validTo: 'valid_to',
      accessPolicy: 'access_policy'
    };

    for (const [jsKey, sqlKey] of Object.entries(fieldMap)) {
      if (patch[jsKey] !== undefined) {
        sets.push(`${sqlKey} = ?`);
        values.push(
          jsKey === 'metadata' && patch[jsKey] != null
            ? JSON.stringify(patch[jsKey])
            : patch[jsKey]
        );
      }
    }

    if (sets.length === 0 && patch.embedding === undefined) {
      return existing;
    }

    if (sets.length > 0) {
      sets.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      await this._query(
        `UPDATE memories SET ${sets.join(', ')} WHERE id = ?`,
        values
      );
    }

    if (patch.embedding !== undefined) {
      await this._query('DELETE FROM vec_memories WHERE memory_id = ?', [id]);
      if (patch.embedding && Array.isArray(patch.embedding)) {
        await this._query(
          'INSERT INTO vec_memories (memory_id, embedding) VALUES (?, ?)',
          [id, JSON.stringify(patch.embedding)]
        );
      }
    }

    return this.getMemory(id);
  }

  async deleteMemory(id) {
    const existing = await this.getMemory(id);
    if (!existing) return false;

    await this._query('DELETE FROM vec_memories WHERE memory_id = ?', [id]);
    await this._query('DELETE FROM relations WHERE source_id = ? OR target_id = ?', [id, id]);
    await this._query('DELETE FROM memories WHERE id = ?', [id]);

    return true;
  }

  async createRelation(relation) {
    const { sourceId, targetId, type, confidence = 1.0, metadata } = relation;

    await this._query(
      `INSERT INTO relations (source_id, target_id, type, confidence, metadata)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(source_id, target_id, type) DO UPDATE SET
         confidence = excluded.confidence,
         metadata = excluded.metadata`,
      [sourceId, targetId, type, confidence, metadata ? JSON.stringify(metadata) : null]
    );

    const rows = await this._query(
      'SELECT * FROM relations WHERE source_id = ? AND target_id = ? AND type = ?',
      [sourceId, targetId, type]
    );
    return this._hydrateRelation(rows[0]);
  }

  async getMemoryGraph(memoryId, options = {}) {
    const typeFilter = options.type ? `AND type = '${options.type}'` : '';
    const limit = options.limit || 50;
    const depth = options.depth || 1;

    const visited = new Set();
    const edges = [];
    const queue = [{ id: memoryId, d: 0 }];

    while (queue.length > 0) {
      const { id, d } = queue.shift();
      if (visited.has(id) || d > depth) continue;
      visited.add(id);

      const rows = await this._query(
        `SELECT * FROM relations WHERE (source_id = ? OR target_id = ?) ${typeFilter} LIMIT ?`,
        [id, id, limit]
      );

      for (const row of rows) {
        edges.push(this._hydrateRelation(row));
        const nextId = row.source_id === id ? row.target_id : row.source_id;
        if (!visited.has(nextId)) {
          queue.push({ id: nextId, d: d + 1 });
        }
      }
    }

    return edges;
  }

  async health() {
    const start = Date.now();
    try {
      await this._query('SELECT 1');
      return { ok: true, latency: Date.now() - start };
    } catch (err) {
      return { ok: false, latency: Date.now() - start, error: err.message };
    }
  }

  async getMigrationVersion() {
    try {
      const rows = await this._query(
        'SELECT version FROM _migrations ORDER BY version DESC LIMIT 1'
      );
      return rows[0]?.version || '0.0.0';
    } catch {
      return '0.0.0';
    }
  }

  async runMigration(sql) {
    await this._exec(sql);
  }

  _hydrate(row) {
    return {
      id: row.id,
      rawRef: row.raw_ref,
      contentType: row.content_type,
      extractedText: row.extracted_text,
      summary: row.summary,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      embedding: undefined,
      parentId: row.parent_id,
      sector: row.sector,
      salience: row.salience,
      validFrom: row.valid_from ? new Date(row.valid_from) : undefined,
      validTo: row.valid_to ? new Date(row.valid_to) : undefined,
      accessPolicy: row.access_policy,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
    };
  }

  _hydrateRelation(row) {
    return {
      id: row.id,
      sourceId: row.source_id,
      targetId: row.target_id,
      type: row.type,
      confidence: row.confidence,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: new Date(row.created_at)
    };
  }

  static get metadata() {
    return {
      name: 'cloudflare-d1-store',
      version: '0.1.0',
      capabilities: ['crud', 'vectorSearch', 'relations', 'migrations'],
      cortexCompatibility: '>=0.1.0 <0.3.0'
    };
  }
}

module.exports = { CloudflareD1StoreAdapter };

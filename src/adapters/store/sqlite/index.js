const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const sqliteVec = require('sqlite-vec');
const { StoreAdapter } = require('../../../core/interfaces/store-adapter');
const { generateMemoryId } = require('../../../core/utils/id-generator');

/**
 * SQLite Store Adapter
 * Supports CRUD, vector search via sqlite-vec, relations graph, and migrations.
 * @implements {StoreAdapter}
 */
class SQLiteStoreAdapter extends StoreAdapter {
  constructor(config) {
    super(config);
    this.dbPath = this.config.path || './data/docket.db';
    this.enableWAL = this.config.enableWAL !== false;
    this.busyTimeout = this.config.busyTimeout || 5000;
    this.vectorDimensions = this.config.vectorDimensions || 768;
    this.db = null;
  }

  async initialize() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.db.pragma(`journal_mode = ${this.enableWAL ? 'WAL' : 'DELETE'}`);
    this.db.pragma(`busy_timeout = ${this.busyTimeout}`);

    sqliteVec.load(this.db);

    this._ensureMigrationsTable();
    this._runMigrations();
  }

  _ensureMigrationsTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL UNIQUE,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  _runMigrations() {
    const migrations = this._getMigrationScripts();
    const currentVersion = this._getCurrentVersion();

    for (const [version, sql] of migrations) {
      if (this._compareVersions(version, currentVersion) > 0) {
        this.db.exec(sql);
        this.db
          .prepare('INSERT INTO _migrations (version) VALUES (?)')
          .run(version);
      }
    }
  }

  _getMigrationScripts() {
    return [
      ['0.1.0', this._schemaV010()],
      ['0.2.0', this._schemaV020()]
    ];
  }

  _schemaV010() {
    return `
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        raw_ref TEXT NOT NULL,
        content_type TEXT NOT NULL,
        extracted_text TEXT,
        summary TEXT,
        metadata TEXT,
        parent_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_memories_parent ON memories(parent_id);
      CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at);

      CREATE TABLE IF NOT EXISTS relations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        type TEXT NOT NULL,
        confidence REAL DEFAULT 1.0,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(source_id, target_id, type)
      );

      CREATE INDEX IF NOT EXISTS idx_relations_source ON relations(source_id);
      CREATE INDEX IF NOT EXISTS idx_relations_target ON relations(target_id);
    `;
  }

  _schemaV020() {
    return `
      ALTER TABLE memories ADD COLUMN sector TEXT;
      ALTER TABLE memories ADD COLUMN salience REAL DEFAULT 1.0;
      ALTER TABLE memories ADD COLUMN valid_from DATETIME;
      ALTER TABLE memories ADD COLUMN valid_to DATETIME;
      ALTER TABLE memories ADD COLUMN access_policy TEXT DEFAULT 'owner-only';

      CREATE INDEX IF NOT EXISTS idx_memories_sector ON memories(sector);
      CREATE INDEX IF NOT EXISTS idx_memories_salience ON memories(salience);

      CREATE VIRTUAL TABLE IF NOT EXISTS vec_memories USING vec0(
        memory_id TEXT PRIMARY KEY,
        embedding FLOAT[${this.vectorDimensions}]
      );
    `;
  }

  _getCurrentVersion() {
    const row = this.db
      .prepare('SELECT version FROM _migrations ORDER BY version DESC LIMIT 1')
      .get();
    return row?.version || '0.0.0';
  }

  _compareVersions(a, b) {
    const parse = v => v.split('.').map(Number);
    const [ma, mi, pa] = parse(a);
    const [mb, mib, pb] = parse(b);
    if (ma !== mb) return ma - mb;
    if (mi !== mib) return mi - mib;
    return pa - pb;
  }

  async createMemory(memory) {
    const id = memory.id || generateMemoryId();
    const now = new Date().toISOString();

    const row = {
      id,
      raw_ref: memory.rawRef,
      content_type: memory.contentType,
      extracted_text: memory.extractedText || null,
      summary: memory.summary || null,
      metadata: memory.metadata ? JSON.stringify(memory.metadata) : null,
      parent_id: memory.parentId || null,
      sector: memory.sector || null,
      salience: memory.salience ?? 1.0,
      valid_from: memory.validFrom || null,
      valid_to: memory.validTo || null,
      access_policy: memory.accessPolicy || 'owner-only',
      created_at: memory.createdAt?.toISOString() || now,
      updated_at: now
    };

    this.db.prepare(`
      INSERT INTO memories (
        id, raw_ref, content_type, extracted_text, summary, metadata,
        parent_id, sector, salience, valid_from, valid_to, access_policy,
        created_at, updated_at
      ) VALUES (
        $id, $raw_ref, $content_type, $extracted_text, $summary, $metadata,
        $parent_id, $sector, $salience, $valid_from, $valid_to, $access_policy,
        $created_at, $updated_at
      )
    `).run(row);

    if (memory.embedding && Array.isArray(memory.embedding)) {
      const embeddingBuffer = new Float32Array(memory.embedding);
      this.db.prepare(`
        INSERT INTO vec_memories (memory_id, embedding)
        VALUES (?, ?)
      `).run(id, embeddingBuffer);
    }

    return this.getMemory(id);
  }

  async getMemory(id) {
    const row = this.db.prepare('SELECT * FROM memories WHERE id = ?').get(id);
    if (!row) return null;
    return this._hydrate(row);
  }

  async queryMemories(filters = {}, options = {}) {
    const conditions = ['1=1'];
    const params = {};

    if (filters.contentType) {
      conditions.push('content_type = $contentType');
      params.$contentType = filters.contentType;
    }
    if (filters.dateFrom) {
      conditions.push('created_at >= $dateFrom');
      params.$dateFrom = filters.dateFrom.toISOString();
    }
    if (filters.dateTo) {
      conditions.push('created_at <= $dateTo');
      params.$dateTo = filters.dateTo.toISOString();
    }
    if (filters.metadata) {
      for (const [key, value] of Object.entries(filters.metadata)) {
        conditions.push(`json_extract(metadata, '$.${key}') = $meta_${key}`);
        params[`$meta_${key}`] = value;
      }
    }

    const limit = options.limit || 50;
    const offset = options.offset || 0;
    const sortBy = options.sortBy || 'created_at';
    const sortOrder = options.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const allowedSort = ['created_at', 'updated_at', 'salience', 'id'];
    const safeSort = allowedSort.includes(sortBy) ? sortBy : 'created_at';

    const whereClause = conditions.join(' AND ');

    const countRow = this.db.prepare(`
      SELECT COUNT(*) as total FROM memories WHERE ${whereClause}
    `).get(params);

    const rows = this.db.prepare(`
      SELECT * FROM memories
      WHERE ${whereClause}
      ORDER BY ${safeSort} ${sortOrder}
      LIMIT ${limit} OFFSET ${offset}
    `).all(params);

    return {
      results: rows.map(r => this._hydrate(r)),
      total: countRow.total
    };
  }

  async vectorSearch(embedding, options = {}) {
    const limit = options.limit || 10;
    const threshold = options.threshold ?? 0.0;

    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Embedding must be an array of numbers');
    }

    const queryBuffer = new Float32Array(embedding);

    const sql = `
      SELECT
        vm.memory_id,
        distance
      FROM vec_memories vm
      WHERE vm.embedding MATCH ?
        AND k = ?
      ORDER BY distance
    `;

    const rows = this.db.prepare(sql).all(queryBuffer, limit);

    const results = [];
    for (const row of rows) {
      const memory = await this.getMemory(row.memory_id);
      if (!memory) continue;

      const score = 1 - row.distance;
      if (score >= threshold) {
        results.push({ memory, score });
      }
    }

    return results;
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
      this.db.prepare(`
        UPDATE memories SET ${sets.join(', ')} WHERE id = ?
      `).run(...values);
    }

    if (patch.embedding !== undefined) {
      this.db.prepare('DELETE FROM vec_memories WHERE memory_id = ?').run(id);
      if (patch.embedding && Array.isArray(patch.embedding)) {
        const embeddingBuffer = new Float32Array(patch.embedding);
        this.db.prepare(`
          INSERT INTO vec_memories (memory_id, embedding) VALUES (?, ?)
        `).run(id, embeddingBuffer);
      }
    }

    return this.getMemory(id);
  }

  async deleteMemory(id) {
    const existing = await this.getMemory(id);
    if (!existing) return false;

    this.db.prepare('DELETE FROM vec_memories WHERE memory_id = ?').run(id);
    this.db.prepare('DELETE FROM relations WHERE source_id = ? OR target_id = ?').run(id, id);
    this.db.prepare('DELETE FROM memories WHERE id = ?').run(id);

    return true;
  }

  async createRelation(relation) {
    const { sourceId, targetId, type, confidence = 1.0, metadata } = relation;

    const result = this.db.prepare(`
      INSERT INTO relations (source_id, target_id, type, confidence, metadata)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(source_id, target_id, type) DO UPDATE SET
        confidence = excluded.confidence,
        metadata = excluded.metadata
      RETURNING *
    `).get(sourceId, targetId, type, confidence, metadata ? JSON.stringify(metadata) : null);

    return this._hydrateRelation(result);
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

      const rows = this.db.prepare(`
        SELECT * FROM relations
        WHERE (source_id = ? OR target_id = ?) ${typeFilter}
        LIMIT ?
      `).all(id, id, limit);

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
      this.db.prepare('SELECT 1').get();
      return { ok: true, latency: Date.now() - start };
    } catch (err) {
      return { ok: false, latency: Date.now() - start, error: err.message };
    }
  }

  async getMigrationVersion() {
    return this._getCurrentVersion();
  }

  async runMigration(sql) {
    this.db.exec(sql);
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
      name: 'sqlite-store',
      version: '0.1.0',
      capabilities: ['crud', 'vectorSearch', 'relations', 'migrations'],
      docketCompatibility: '>=0.1.0 <0.3.0'
    };
  }
}

module.exports = { SQLiteStoreAdapter };

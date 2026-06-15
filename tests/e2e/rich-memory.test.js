// tests/e2e/rich-memory.test.js
// End-to-end test: rich memory semantics (sector, temporal, RBAC)

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { buildUnifiedApp } = require('../../src/platform/unified/app');
const { SQLiteStoreAdapter } = require('../../src/adapters/store/sqlite');
const { FilesystemBlobAdapter } = require('../../src/adapters/blob/filesystem');
const { InMemoryQueueAdapter } = require('../../src/adapters/queue/memory');
const { LlmAdapter } = require('../../src/core/interfaces/llm-adapter');
const { EmbedderAdapter } = require('../../src/core/interfaces/embedder-adapter');

class MockLlmAdapter extends LlmAdapter {
  async chat(messages, _options) {
    const content = messages.map(m => m.content).join(' ').toLowerCase();
    if (content.includes('summarize') || content.includes('summary')) {
      return { content: 'A birthday party with friends.' };
    }
    if (content.includes('classify') || content.includes('sector')) {
      return { content: 'episodic' };
    }
    return { content: 'You had a birthday party with friends.' };
  }

  static get metadata() {
    return { name: 'mock-llm', capabilities: ['chat'] };
  }
}

class MockEmbedderAdapter extends EmbedderAdapter {
  async embed(_text) {
    const vector = new Array(768).fill(0);
    vector[0] = 1;
    return vector;
  }

  static get metadata() {
    return { name: 'mock-embedder', capabilities: ['embed'] };
  }
}

function createConfig() {
  return {
    docket: {
      memory: {
        mode: 'rich',
        sectors: {
          enabled: true,
          types: ['episodic', 'semantic', 'procedural', 'emotional', 'reflective'],
          default: 'semantic'
        },
        decay: { enabled: false },
        temporal: { enabled: true },
        rbac: {
          enabled: true,
          authStrategy: 'header',
          principalHeader: 'X-Principal',
          defaultPolicy: 'owner-only'
        }
      }
    }
  };
}

async function createApp(testId) {
  const testDir = path.join(__dirname, '../fixtures/temp', `e2e-rich-${testId}`);
  fs.rmSync(testDir, { recursive: true, force: true });
  fs.mkdirSync(testDir, { recursive: true });

  const store = new SQLiteStoreAdapter({ path: path.join(testDir, 'docket.db'), vectorDimensions: 768 });
  const blob = new FilesystemBlobAdapter({ basePath: path.join(testDir, 'blobs') });
  const queue = new InMemoryQueueAdapter({});
  const llm = new MockLlmAdapter({});
  const embedder = new MockEmbedderAdapter({});

  await Promise.all([store.initialize(), blob.initialize(), queue.initialize()]);

  const adapters = { llm, embedder, store, blob, queue };
  const { createCoreServices } = require('../../src/core/modules/service-factory');
  const services = createCoreServices(adapters, createConfig());
  const app = buildUnifiedApp({ adapters, config: createConfig(), services });
  await app.ready();

  return app;
}

describe('Rich Memory E2E', () => {
  it('classifies sector on ingestion and owner is set from principal', async () => {
    const app = await createApp('sector');

    try {
      const ingestRes = await request(app.server)
        .post('/ingest')
        .set('X-Principal', 'user:alice')
        .send({ text: 'My birthday party with friends last weekend.', contentType: 'text/plain' })
        .expect(201);

      expect(ingestRes.body.status).toBe('completed');
      expect(ingestRes.body.sector).toBe('episodic');

      const memoryRes = await request(app.server)
        .get(`/memories/${ingestRes.body.id}`)
        .set('X-Principal', 'user:alice')
        .expect(200);

      expect(memoryRes.body.owner).toBe('user:alice');
      expect(memoryRes.body.sector).toBe('episodic');
    } finally {
      await app.close();
    }
  });

  it('denies non-owner access to owner-only memories', async () => {
    const app = await createApp('rbac-deny');

    try {
      const ingestRes = await request(app.server)
        .post('/ingest')
        .set('X-Principal', 'user:alice')
        .send({ text: 'Private journal entry.', contentType: 'text/plain' })
        .expect(201);

      await request(app.server)
        .get(`/memories/${ingestRes.body.id}`)
        .set('X-Principal', 'user:bob')
        .expect(404);
    } finally {
      await app.close();
    }
  });

  it('filters query results by principal ownership', async () => {
    const app = await createApp('rbac-query');

    try {
      await request(app.server)
        .post('/ingest')
        .set('X-Principal', 'user:alice')
        .send({ text: 'Alice private note about bicycles.', contentType: 'text/plain' })
        .expect(201);

      await request(app.server)
        .post('/ingest')
        .set('X-Principal', 'user:bob')
        .send({ text: 'Bob note about bicycles.', contentType: 'text/plain' })
        .expect(201);

      const aliceQuery = await request(app.server)
        .post('/query')
        .set('X-Principal', 'user:alice')
        .send({ question: 'What do I know about bicycles?' })
        .expect(200);

      expect(aliceQuery.body.sources.length).toBe(1);
      expect(aliceQuery.body.sources[0].memoryId).toContain('mem_');
    } finally {
      await app.close();
    }
  });

  it('supports temporal point-in-time queries', async () => {
    const app = await createApp('temporal');

    try {
      const ingestRes = await request(app.server)
        .post('/ingest')
        .set('X-Principal', 'user:alice')
        .send({
          text: 'I started a new job.',
          contentType: 'text/plain',
          validFrom: '2024-06-01T00:00:00Z',
          validTo: '2024-12-31T23:59:59Z'
        })
        .expect(201);

      const queryRes = await request(app.server)
        .post('/query')
        .set('X-Principal', 'user:alice')
        .send({
          question: 'What was my status in mid 2024?',
          temporal: { atDate: '2024-07-01T00:00:00Z' }
        })
        .expect(200);

      expect(queryRes.body.sources.length).toBeGreaterThan(0);
      expect(queryRes.body.sources[0].memoryId).toBe(ingestRes.body.id);

      const futureQuery = await request(app.server)
        .post('/query')
        .set('X-Principal', 'user:alice')
        .send({
          question: 'What was my status in 2025?',
          temporal: { atDate: '2025-06-01T00:00:00Z' }
        })
        .expect(200);

      expect(futureQuery.body.sources.length).toBe(0);
    } finally {
      await app.close();
    }
  });
});

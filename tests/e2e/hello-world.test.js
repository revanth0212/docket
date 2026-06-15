// tests/e2e/hello-world.test.js
// End-to-end test: text ingestion -> AI summary -> semantic query

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
      return { content: 'A red bicycle photo.' };
    }
    return { content: 'You took photos with a red bicycle.' };
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

describe('Hello World E2E', () => {
  let app;
  let store;
  let blob;
  let queue;
  let testDir;

  beforeAll(async () => {
    testDir = path.join(__dirname, '../fixtures/temp/e2e-hello');
    fs.mkdirSync(testDir, { recursive: true });

    store = new SQLiteStoreAdapter({ path: path.join(testDir, 'docket.db'), vectorDimensions: 768 });
    blob = new FilesystemBlobAdapter({ basePath: path.join(testDir, 'blobs') });
    queue = new InMemoryQueueAdapter({});
    const llm = new MockLlmAdapter({});
    const embedder = new MockEmbedderAdapter({});

    await Promise.all([store.initialize(), blob.initialize(), queue.initialize()]);

    const adapters = { llm, embedder, store, blob, queue };
    const config = {
      docket: {
        memory: {
          mode: 'flat',
          sectors: { enabled: false },
          decay: { enabled: false },
          temporal: { enabled: false },
          rbac: { enabled: false }
        }
      }
    };

    const { createCoreServices } = require('../../src/core/modules/service-factory');
    const services = createCoreServices(adapters, config);
    app = buildUnifiedApp({ adapters, config, services });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('ingests a text file and answers a semantic query', async () => {
    const fixturePath = path.join(__dirname, '../fixtures/bicycle.txt');

    const ingestRes = await request(app.server)
      .post('/ingest')
      .attach('file', fixturePath)
      .field('async', 'false')
      .expect(201);

    expect(ingestRes.body.status).toBe('completed');
    expect(ingestRes.body.id).toMatch(/^mem_/);

    const queryRes = await request(app.server)
      .post('/query')
      .send({ question: 'What photos did I take with bicycles?' })
      .expect(200);

    expect(queryRes.body.answer.toLowerCase()).toContain('bicycle');
    expect(queryRes.body.sources.length).toBeGreaterThan(0);
    expect(queryRes.body.sources[0].summary.toLowerCase()).toContain('bicycle');
  });

  it('ingests JSON text and answers a semantic query', async () => {
    const ingestRes = await request(app.server)
      .post('/ingest')
      .send({ text: 'A blue tandem bicycle at the park.', contentType: 'text/plain' })
      .expect(201);

    expect(ingestRes.body.status).toBe('completed');

    const queryRes = await request(app.server)
      .post('/query')
      .send({ question: 'What did I see at the park?' })
      .expect(200);

    expect(queryRes.body.answer.toLowerCase()).toContain('bicycle');
    expect(queryRes.body.sources.length).toBeGreaterThan(0);
  });
});

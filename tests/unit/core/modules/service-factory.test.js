// tests/unit/core/modules/service-factory.test.js

const { createCoreServices } = require('../../../../src/core/modules/service-factory');

describe('createCoreServices', () => {
  function createAdapters(overrides = {}) {
    return {
      llm: { chat: jest.fn() },
      embedder: { embed: jest.fn() },
      store: {
        createMemory: jest.fn(),
        getMemory: jest.fn(),
        updateMemory: jest.fn(),
        deleteMemory: jest.fn(),
        queryMemories: jest.fn(),
        vectorSearch: jest.fn(),
        getMemoryGraph: jest.fn(),
        createRelation: jest.fn()
      },
      blob: { put: jest.fn(), get: jest.fn(), delete: jest.fn() },
      queue: { enqueue: jest.fn() },
      ...overrides
    };
  }

  function createConfig(overrides = {}) {
    return {
      docket: {
        memory: {
          mode: 'rich',
          sectors: { enabled: true, types: ['episodic', 'semantic'] },
          decay: { enabled: true },
          temporal: { enabled: true },
          rbac: { enabled: false }
        },
        ...overrides
      }
    };
  }

  it('creates all expected services', () => {
    const adapters = createAdapters();
    const services = createCoreServices(adapters, createConfig());

    expect(services.ingestion).toBeDefined();
    expect(services.query).toBeDefined();
    expect(services.memory).toBeDefined();
    expect(services.sectorClassifier).toBeDefined();
    expect(services.temporalQuery).toBeDefined();
    expect(services.decayEngine).toBeDefined();
    expect(services.recallEngine).toBeDefined();
  });

  it('passes adapters to ingestion service', async () => {
    const adapters = createAdapters();
    const services = createCoreServices(adapters, createConfig());

    adapters.blob.put.mockResolvedValue({ key: 'blob:mem_abc' });
    adapters.embedder.embed.mockResolvedValue([0.1, 0.2]);
    adapters.store.createMemory.mockResolvedValue({ id: 'mem_abc', salience: 1.0 });

    await services.ingestion.ingest({ text: 'hello', contentType: 'text/plain' });

    expect(adapters.embedder.embed).toHaveBeenCalled();
    expect(adapters.store.createMemory).toHaveBeenCalled();
  });

  it('passes config to memory service for rich mode enrichment', async () => {
    const adapters = createAdapters();
    const services = createCoreServices(adapters, createConfig());

    adapters.store.createMemory.mockResolvedValue({ id: 'mem_abc' });

    await services.memory.create({ rawRef: 'blob:1', contentType: 'text/plain' });

    expect(adapters.store.createMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        sector: 'semantic',
        salience: 1.0,
        accessPolicy: 'owner-only'
      })
    );
  });

  it('works with minimal config defaults', () => {
    const adapters = createAdapters();
    const config = { docket: {} };

    const services = createCoreServices(adapters, config);
    expect(services.ingestion).toBeDefined();
    expect(services.query).toBeDefined();
    expect(services.memory).toBeDefined();
  });
});

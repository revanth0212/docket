// tests/unit/core/interfaces/store-adapter.test.js

const { StoreAdapter } = require('../../../../src/core/interfaces/store-adapter');

describe('StoreAdapter', () => {
  it('validates config', () => {
    const adapter = new StoreAdapter({ path: ':memory:' });
    expect(adapter.config).toEqual({ path: ':memory:' });
  });

  it('throws on invalid config', () => {
    expect(() => new StoreAdapter(null)).toThrow('Config must be an object');
  });

  it('initialize throws by default', async () => {
    const adapter = new StoreAdapter({});
    await expect(adapter.initialize()).rejects.toThrow('Method "initialize" must be implemented by subclass');
  });

  it('createMemory throws by default', async () => {
    const adapter = new StoreAdapter({});
    await expect(adapter.createMemory({})).rejects.toThrow('Method "createMemory" must be implemented by subclass');
  });

  it('getMemory throws by default', async () => {
    const adapter = new StoreAdapter({});
    await expect(adapter.getMemory('id')).rejects.toThrow('Method "getMemory" must be implemented by subclass');
  });

  it('queryMemories throws by default', async () => {
    const adapter = new StoreAdapter({});
    await expect(adapter.queryMemories()).rejects.toThrow('Method "queryMemories" must be implemented by subclass');
  });

  it('vectorSearch throws by default', async () => {
    const adapter = new StoreAdapter({});
    await expect(adapter.vectorSearch([0.1])).rejects.toThrow('Method "vectorSearch" must be implemented by subclass');
  });

  it('updateMemory throws by default', async () => {
    const adapter = new StoreAdapter({});
    await expect(adapter.updateMemory('id', {})).rejects.toThrow('Method "updateMemory" must be implemented by subclass');
  });

  it('deleteMemory throws by default', async () => {
    const adapter = new StoreAdapter({});
    await expect(adapter.deleteMemory('id')).rejects.toThrow('Method "deleteMemory" must be implemented by subclass');
  });

  it('createRelation throws by default', async () => {
    const adapter = new StoreAdapter({});
    await expect(adapter.createRelation({})).rejects.toThrow('Method "createRelation" must be implemented by subclass');
  });

  it('getMemoryGraph throws by default', async () => {
    const adapter = new StoreAdapter({});
    await expect(adapter.getMemoryGraph('id')).rejects.toThrow('Method "getMemoryGraph" must be implemented by subclass');
  });

  it('health throws by default', async () => {
    const adapter = new StoreAdapter({});
    await expect(adapter.health()).rejects.toThrow('Method "health" must be implemented by subclass');
  });

  it('getMigrationVersion throws by default', async () => {
    const adapter = new StoreAdapter({});
    await expect(adapter.getMigrationVersion()).rejects.toThrow('Method "getMigrationVersion" must be implemented by subclass');
  });

  it('runMigration throws by default', async () => {
    const adapter = new StoreAdapter({});
    await expect(adapter.runMigration('sql')).rejects.toThrow('Method "runMigration" must be implemented by subclass');
  });

  it('metadata throws by default', () => {
    expect(() => StoreAdapter.metadata).toThrow('Property "metadata" must be implemented by subclass');
  });
});

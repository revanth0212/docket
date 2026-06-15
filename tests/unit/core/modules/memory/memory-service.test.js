// tests/unit/core/modules/memory/memory-service.test.js

const { MemoryService } = require('../../../../../src/core/modules/memory/memory-service');
const { NotFoundError, ValidationError } = require('../../../../../src/core/errors');

describe('MemoryService', () => {
  function createService(overrides = {}) {
    return new MemoryService({
      storeAdapter: {
        createMemory: jest.fn().mockResolvedValue({ id: 'mem_abc' }),
        getMemory: jest.fn().mockResolvedValue({ id: 'mem_abc', rawRef: 'blob:1' }),
        updateMemory: jest.fn().mockResolvedValue({ id: 'mem_abc' }),
        deleteMemory: jest.fn().mockResolvedValue(true),
        queryMemories: jest.fn().mockResolvedValue({ results: [], total: 0 }),
        getMemoryGraph: jest.fn().mockResolvedValue([]),
        createRelation: jest.fn().mockResolvedValue({ id: 1, sourceId: 'mem_abc', targetId: 'mem_def' })
      },
      blobAdapter: {
        delete: jest.fn().mockResolvedValue(true)
      },
      decayEngine: null,
      config: { mode: 'flat' },
      ...overrides
    });
  }

  describe('create', () => {
    it('creates a memory in flat mode', async () => {
      const service = createService();
      const result = await service.create({ rawRef: 'blob:1', contentType: 'text/plain' });
      expect(result.id).toBe('mem_abc');
    });

    it('validates input', async () => {
      const service = createService();
      await expect(service.create({})).rejects.toThrow(ValidationError);
    });

    it('enriches rich mode memories', async () => {
      const storeAdapter = {
        createMemory: jest.fn().mockResolvedValue({ id: 'mem_abc' }),
        getMemory: jest.fn(),
        updateMemory: jest.fn().mockResolvedValue({ id: 'mem_abc', salience: 0.5 }),
        deleteMemory: jest.fn(),
        queryMemories: jest.fn(),
        getMemoryGraph: jest.fn(),
        createRelation: jest.fn()
      };
      const decayEngine = {
        computeSalience: jest.fn().mockReturnValue(0.5)
      };
      const service = createService({
        storeAdapter,
        decayEngine,
        config: {
          mode: 'rich',
          sectors: { default: 'semantic' },
          temporal: {},
          rbac: { defaultPolicy: 'owner-only' }
        }
      });

      await service.create({ rawRef: 'blob:1', contentType: 'text/plain' });

      expect(storeAdapter.createMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          sector: 'semantic',
          salience: 1.0,
          accessPolicy: 'owner-only'
        })
      );
      expect(decayEngine.computeSalience).toHaveBeenCalled();
      expect(storeAdapter.updateMemory).toHaveBeenCalledWith('mem_abc', { salience: 0.5 });
    });
  });

  describe('getById', () => {
    it('returns memory when found', async () => {
      const service = createService();
      const result = await service.getById('mem_abc');
      expect(result.id).toBe('mem_abc');
    });

    it('returns null when not found', async () => {
      const service = createService({
        storeAdapter: { getMemory: jest.fn().mockResolvedValue(null) }
      });
      const result = await service.getById('mem_missing');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('updates a memory', async () => {
      const service = createService();
      const result = await service.update('mem_abc', { summary: 'updated' });
      expect(result.id).toBe('mem_abc');
    });

    it('validates updates', async () => {
      const service = createService();
      await expect(service.update('mem_abc', { salience: 99 })).rejects.toThrow(ValidationError);
    });
  });

  describe('delete', () => {
    it('deletes memory and blob', async () => {
      const blobAdapter = { delete: jest.fn().mockResolvedValue(true) };
      const service = createService({ blobAdapter });

      const result = await service.delete('mem_abc');

      expect(result).toBe(true);
      expect(blobAdapter.delete).toHaveBeenCalledWith('blob:1');
    });

    it('returns false when memory not found', async () => {
      const service = createService({
        storeAdapter: { getMemory: jest.fn().mockResolvedValue(null) }
      });
      const result = await service.delete('mem_missing');
      expect(result).toBe(false);
    });

    it('continues deletion when blob delete fails', async () => {
      const blobAdapter = { delete: jest.fn().mockRejectedValue(new Error('gone')) };
      const service = createService({ blobAdapter });

      const result = await service.delete('mem_abc');
      expect(result).toBe(true);
    });
  });

  describe('relations', () => {
    it('creates relation when target exists', async () => {
      const service = createService();
      const result = await service.createRelation('mem_abc', {
        targetId: 'mem_def',
        type: 'related_to',
        confidence: 0.8
      });
      expect(result.targetId).toBe('mem_def');
    });

    it('throws NotFoundError when target missing', async () => {
      const service = createService({
        storeAdapter: { getMemory: jest.fn().mockResolvedValue(null) }
      });
      await expect(service.createRelation('mem_abc', { targetId: 'mem_missing', type: 'related' }))
        .rejects.toThrow(NotFoundError);
    });

    it('gets relations', async () => {
      const service = createService();
      const result = await service.getRelations('mem_abc');
      expect(result).toEqual([]);
    });
  });

  describe('supersede', () => {
    it('creates new memory linked to old', async () => {
      const storeAdapter = {
        createMemory: jest.fn().mockResolvedValue({ id: 'mem_new' }),
        getMemory: jest.fn().mockResolvedValue({ id: 'mem_old', rawRef: 'blob:1' }),
        updateMemory: jest.fn().mockResolvedValue({ id: 'mem_old' }),
        deleteMemory: jest.fn(),
        queryMemories: jest.fn(),
        getMemoryGraph: jest.fn(),
        createRelation: jest.fn().mockResolvedValue({ id: 1, sourceId: 'mem_abc', targetId: 'mem_def' })
      };
      const service = createService({ storeAdapter });

      const result = await service.supersede('mem_old', { rawRef: 'blob:2', contentType: 'text/plain' });

      expect(storeAdapter.updateMemory).toHaveBeenCalledWith('mem_old', expect.objectContaining({ validTo: expect.any(Date) }));
      expect(storeAdapter.createRelation).toHaveBeenCalledWith(
        expect.objectContaining({ sourceId: 'mem_old', targetId: 'mem_new', type: 'superseded_by' })
      );
      expect(result.new.id).toBe('mem_new');
    });

    it('throws NotFoundError when old memory missing', async () => {
      const service = createService({
        storeAdapter: { getMemory: jest.fn().mockResolvedValue(null) }
      });
      await expect(service.supersede('mem_missing', {})).rejects.toThrow(NotFoundError);
    });
  });
});

// tests/unit/core/modules/ingestion/ingestion-service.test.js

jest.mock('../../../../../src/core/utils/id-generator', () => ({
  generateMemoryId: jest.fn().mockReturnValue('mem_testid'),
  generateBlobKey: jest.fn().mockReturnValue('mem_testid/raw.txt')
}));

const { IngestionService } = require('../../../../../src/core/modules/ingestion/ingestion-service');
const { ValidationError } = require('../../../../../src/core/errors');

describe('IngestionService', () => {
  function createService(overrides = {}) {
    return new IngestionService({
      storeAdapter: {
        createMemory: jest.fn().mockResolvedValue({ id: 'mem_testid' })
      },
      blobAdapter: {
        put: jest.fn().mockResolvedValue({ key: 'blob:mem_testid/raw.txt' })
      },
      embedderAdapter: {
        embed: jest.fn().mockResolvedValue([0.1, 0.2, 0.3])
      },
      llmAdapter: {
        chat: jest.fn().mockResolvedValue({ content: 'A concise summary.' })
      },
      sectorClassifier: {
        classify: jest.fn().mockResolvedValue({ sector: 'semantic', confidence: 0.9 })
      },
      memoryService: {
        create: jest.fn().mockImplementation(data => Promise.resolve({
          id: 'mem_testid',
          sector: data.sector,
          salience: data.salience ?? 1.0,
          summary: data.summary,
          createdAt: new Date('2024-01-01')
        }))
      },
      queueAdapter: {
        enqueue: jest.fn().mockResolvedValue({ id: 'job_123' })
      },
      config: {
        memory: { mode: 'flat' }
      },
      ...overrides
    });
  }

  describe('input validation', () => {
    it('throws ValidationError when input is missing', async () => {
      const service = createService();
      await expect(service.ingest()).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when buffer and text are both missing', async () => {
      const service = createService();
      await expect(service.ingest({ contentType: 'text/plain' })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when contentType is missing', async () => {
      const service = createService();
      await expect(service.ingest({ text: 'hello' })).rejects.toThrow(ValidationError);
    });
  });

  describe('sync ingestion', () => {
    it('ingests text and returns completed status', async () => {
      const service = createService();
      const result = await service.ingest({ text: 'hello world', contentType: 'text/plain' });

      expect(result.status).toBe('completed');
      expect(result.id).toBe('mem_testid');
    });

    it('stores blob when buffer is provided', async () => {
      const blobAdapter = { put: jest.fn().mockResolvedValue({ key: 'blob:mem_testid/raw.bin' }) };
      const service = createService({ blobAdapter });

      await service.ingest({
        buffer: Buffer.from('hello'),
        contentType: 'text/plain',
        filename: 'hello.txt'
      });

      expect(blobAdapter.put).toHaveBeenCalledWith(
        'mem_testid/raw.txt',
        expect.any(Buffer),
        expect.objectContaining({ contentType: 'text/plain', filename: 'hello.txt' })
      );
    });

    it('summarizes text via LLM', async () => {
      const llmAdapter = { chat: jest.fn().mockResolvedValue({ content: '  Summary text  ' }) };
      const service = createService({ llmAdapter });

      const result = await service.ingest({ text: 'long text', contentType: 'text/plain' });

      expect(llmAdapter.chat).toHaveBeenCalled();
      expect(result.summary).toBe('Summary text');
    });

    it('embeds summary when available', async () => {
      const embedderAdapter = { embed: jest.fn().mockResolvedValue([0.9]) };
      const service = createService({ embedderAdapter });

      await service.ingest({ text: 'hello', contentType: 'text/plain' });

      expect(embedderAdapter.embed).toHaveBeenCalledWith('A concise summary.');
    });

    it('falls back to extracted text for embedding when no summary', async () => {
      const embedderAdapter = { embed: jest.fn().mockResolvedValue([0.9]) };
      const llmAdapter = { chat: jest.fn().mockResolvedValue({ content: '' }) };
      const service = createService({ embedderAdapter, llmAdapter });

      await service.ingest({ text: 'hello', contentType: 'text/plain' });

      expect(embedderAdapter.embed).toHaveBeenCalledWith('hello');
    });

    it('classifies sector in rich mode', async () => {
      const sectorClassifier = { classify: jest.fn().mockResolvedValue({ sector: 'episodic', confidence: 0.8 }) };
      const service = createService({
        sectorClassifier,
        config: { memory: { mode: 'rich' } }
      });

      const result = await service.ingest({ text: 'birthday party', contentType: 'text/plain' });

      expect(sectorClassifier.classify).toHaveBeenCalledWith('birthday party', undefined);
      expect(result.sector).toBe('episodic');
      expect(result.classificationConfidence).toBe(0.8);
    });

    it('uses sectorHint over classifier result', async () => {
      const sectorClassifier = { classify: jest.fn().mockResolvedValue({ sector: 'semantic', confidence: 0.9 }) };
      const service = createService({
        sectorClassifier,
        config: { memory: { mode: 'rich' } }
      });

      const result = await service.ingest({
        text: 'birthday party',
        contentType: 'text/plain',
        sectorHint: 'episodic'
      });

      expect(sectorClassifier.classify).not.toHaveBeenCalled();
      expect(result.sector).toBe('episodic');
    });

    it('wraps pipeline errors in IngestionError', async () => {
      const service = createService({
        memoryService: {
          create: jest.fn().mockRejectedValue(new Error('store down'))
        }
      });

      await expect(service.ingest({ text: 'hello', contentType: 'text/plain' }))
        .rejects.toThrow('Ingestion failed: store down');
    });
  });

  describe('async ingestion', () => {
    it('enqueues job and returns pending status', async () => {
      const queueAdapter = { enqueue: jest.fn().mockResolvedValue({ id: 'job_999' }) };
      const service = createService({ queueAdapter });

      const result = await service.ingest({ text: 'hello', contentType: 'text/plain', async: true });

      expect(result.status).toBe('pending');
      expect(result.jobId).toBe('job_999');
      expect(queueAdapter.enqueue).toHaveBeenCalledWith('ingestion', expect.objectContaining({ memoryId: 'mem_testid' }));
    });

    it('runs sync when queue adapter is missing', async () => {
      const service = createService({ queueAdapter: null });

      const result = await service.ingest({ text: 'hello', contentType: 'text/plain', async: true });

      expect(result.status).toBe('completed');
    });
  });
});

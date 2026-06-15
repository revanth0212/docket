// src/core/modules/ingestion/ingestion-service.js
// Ingestion pipeline: validate → extract → classify → summarize → embed → store

const { generateMemoryId, generateBlobKey } = require('../../utils/id-generator');
const { TextExtractor } = require('./text-extractor');
const { IngestionError, ValidationError } = require('../../errors');

/**
 * Ingestion Service
 *
 * Orchestrates the ingestion pipeline. Supports sync ingestion;
 * async flag is accepted but runs synchronously in Phase 3.
 */
class IngestionService {
  /**
   * @param {Object} options
   * @param {Object} options.storeAdapter
   * @param {Object} options.blobAdapter
   * @param {Object} options.embedderAdapter
   * @param {Object} [options.llmAdapter]
   * @param {Object} [options.sectorClassifier]
   * @param {Object} options.memoryService
   * @param {Object} [options.queueAdapter]
   * @param {Object} options.config
   */
  constructor({
    storeAdapter,
    blobAdapter,
    embedderAdapter,
    llmAdapter,
    sectorClassifier,
    memoryService,
    queueAdapter,
    config
  }) {
    this.storeAdapter = storeAdapter;
    this.blobAdapter = blobAdapter;
    this.embedderAdapter = embedderAdapter;
    this.llmAdapter = llmAdapter;
    this.sectorClassifier = sectorClassifier;
    this.memoryService = memoryService;
    this.queueAdapter = queueAdapter;
    this.config = config || {};
    this.memoryConfig = this.config.memory || {};
    this.mode = this.memoryConfig.mode || 'flat';
    this.textExtractor = new TextExtractor();
  }

  /**
   * Ingest content
   * @param {Object} input
   * @param {Buffer} [input.buffer]
   * @param {string} [input.text]
   * @param {string} input.contentType
   * @param {string} [input.filename]
   * @param {boolean} [input.async=false]
   * @param {Object} [input.metadata]
   * @param {string} [input.sectorHint]
   * @returns {Promise<{id: string, status: string, ...}>}
   */
  async ingest(input) {
    this._validateInput(input);

    const id = generateMemoryId();
    const async = input.async === true;

    if (async && this.queueAdapter) {
      const job = await this.queueAdapter.enqueue('ingestion', {
        ...input,
        memoryId: id
      });
      return {
        id,
        status: 'pending',
        jobId: job.id
      };
    }

    return this._runPipeline(id, input);
  }

  /**
   * Run the full ingestion pipeline synchronously
   * @param {string} id
   * @param {Object} input
   * @protected
   */
  async _runPipeline(id, input) {
    const { buffer, text, contentType, filename, metadata, sectorHint } = input;

    try {
      let rawRef = null;
      let extractedText = text || null;

      // Store blob if buffer provided
      if (buffer) {
        const blobKey = generateBlobKey(id, filename || 'content');
        const putResult = await this.blobAdapter.put(blobKey, buffer, {
          contentType,
          size: buffer.length,
          filename
        });
        rawRef = putResult.key;

        // Extract text if possible
        const extracted = await this.textExtractor.extract(buffer, contentType);
        if (extracted) extractedText = extracted;
      }

      // Summarize if LLM available and text exists
      let summary = null;
      if (this.llmAdapter && extractedText) {
        summary = await this._summarize(extractedText);
      }

      // Classify sector (rich mode) unless a hint is provided
      let sector = sectorHint || null;
      let classificationConfidence = 1.0;
      if (this.mode === 'rich' && this.sectorClassifier && extractedText && !sectorHint) {
        const result = await this.sectorClassifier.classify(extractedText, metadata);
        sector = result.sector;
        classificationConfidence = result.confidence;
      }

      // Embed text/summary
      const textToEmbed = summary || extractedText || '';
      let embedding = null;
      if (this.embedderAdapter && textToEmbed) {
        embedding = await this.embedderAdapter.embed(textToEmbed);
      }

      // Build memory
      const memoryData = {
        id,
        contentType,
        extractedText,
        metadata: metadata || {},
        salience: 1.0
      };

      if (rawRef) memoryData.rawRef = rawRef;
      if (summary) memoryData.summary = summary;
      if (embedding) memoryData.embedding = embedding;
      if (sector) memoryData.sector = sector;
      if (input.validFrom) memoryData.validFrom = new Date(input.validFrom);
      if (input.validTo) memoryData.validTo = new Date(input.validTo);

      const memory = await this.memoryService.create(memoryData);

      return {
        id: memory.id,
        status: 'completed',
        sector: memory.sector,
        salience: memory.salience,
        summary: memory.summary,
        classificationConfidence,
        createdAt: memory.createdAt
      };
    } catch (err) {
      throw new IngestionError(
        `Ingestion failed: ${err.message}`,
        { stage: 'pipeline', jobId: id, cause: err }
      );
    }
  }

  /**
   * Generate a one-line summary via LLM
   * @param {string} text
   * @returns {Promise<string|null>}
   * @protected
   */
  async _summarize(text) {
    if (!this.llmAdapter) return null;

    try {
      const response = await this.llmAdapter.chat([
        {
          role: 'system',
          content: 'Summarize the user-provided memory in one concise sentence. Respond with only the summary.'
        },
        { role: 'user', content: text.slice(0, 4000) }
      ], { temperature: 0.3, maxTokens: 128 });

      return (response.content || '').trim() || null;
    } catch (err) {
      return null;
    }
  }

  _validateInput(input) {
    if (!input) {
      throw new ValidationError('Ingestion input is required');
    }
    if (!input.buffer && !input.text) {
      throw new ValidationError('Ingestion requires either buffer or text');
    }
    if (!input.contentType) {
      throw new ValidationError('Ingestion requires contentType');
    }
  }
}

module.exports = { IngestionService };

// src/core/modules/classifier/sector-classifier.js
// LLM-based memory sector classification

/**
 * Sector Classifier
 *
 * Classifies memory text into one of the configured sectors.
 * Falls back to the configured default sector when disabled or on failure.
 */
class SectorClassifier {
  /**
   * @param {Object} options
   * @param {Object} options.llmAdapter
   * @param {Object} options.config — memory.sectors config
   */
  constructor({ llmAdapter, config }) {
    this.llmAdapter = llmAdapter;
    this.enabled = config.enabled !== false;
    this.types = config.types || ['episodic', 'semantic', 'procedural', 'emotional', 'reflective'];
    this.defaultSector = config.default || 'semantic';
    this.classificationPrompt = config.classificationPrompt || '';
    this.cacheClassifications = config.cacheClassifications !== false;
    this.cache = new Map();
  }

  /**
   * Classify text into a sector
   * @param {string} text
   * @param {Object} [_metadata]
   * @returns {Promise<{sector: string, confidence: number}>}
   */
  async classify(text, _metadata) {
    if (!this.enabled || !this.llmAdapter) {
      return { sector: this.defaultSector, confidence: 1.0 };
    }

    const normalized = String(text || '').trim();
    if (normalized.length === 0) {
      return { sector: this.defaultSector, confidence: 1.0 };
    }

    if (this.cacheClassifications) {
      const cached = this.cache.get(normalized);
      if (cached) return cached;
    }

    try {
      const prompt = this._buildPrompt(normalized);
      const response = await this.llmAdapter.chat([
        { role: 'user', content: prompt }
      ], { temperature: 0.2, maxTokens: 64 });

      const result = this._parseResponse(response.content || '');
      const output = { sector: result.sector, confidence: result.confidence };

      if (this.cacheClassifications) {
        this.cache.set(normalized, output);
      }

      return output;
    } catch (err) {
      return { sector: this.defaultSector, confidence: 0.5 };
    }
  }

  /**
   * Build the classification prompt
   * @param {string} text
   * @returns {string}
   * @protected
   */
  _buildPrompt(text) {
    if (this.classificationPrompt) {
      return `${this.classificationPrompt}\n\nText: """${text}"""`;
    }

    return `Classify the following memory into exactly one of these sectors: ${this.types.join(', ')}.

Respond with ONLY the sector name, optionally followed by a confidence score between 0 and 1 in parentheses.
Examples:
- semantic
- episodic (0.9)

Text: """${text}"""

Sector:`;
  }

  /**
   * Parse LLM response into sector and confidence
   * @param {string} raw
   * @returns {{sector: string, confidence: number}}
   * @protected
   */
  _parseResponse(raw) {
    const cleaned = raw.trim().toLowerCase();

    // Look for an exact sector match
    for (const sector of this.types) {
      if (cleaned.includes(sector.toLowerCase())) {
        const confidence = this._extractConfidence(cleaned);
        return { sector, confidence };
      }
    }

    return { sector: this.defaultSector, confidence: 0.5 };
  }

  _extractConfidence(raw) {
    const match = raw.match(/\((\d*\.?\d+)\)/);
    if (match) {
      const value = parseFloat(match[1]);
      if (!Number.isNaN(value) && value >= 0 && value <= 1) {
        return value;
      }
    }
    return 0.8;
  }
}

module.exports = { SectorClassifier };

// src/core/modules/ingestion/text-extractor.js
// Minimal text extraction helper.
// Full OCR / PDF parsing is deferred to a later phase.

/**
 * Text Extractor
 *
 * Currently supports plain text. Other content types return null
 * so callers can fall back to summaries or empty extractedText.
 */
class TextExtractor {
  /**
   * @param {Object} [config]
   * @param {number} [config.maxLength=100000] — Max characters to extract
   */
  constructor(config = {}) {
    this.config = config;
    this.maxLength = config.maxLength || 100000;
  }

  /**
   * Determine whether this extractor can handle the content type
   * @param {string} contentType
   * @returns {boolean}
   */
  supports(contentType) {
    return this._isText(contentType);
  }

  /**
   * Extract text from a buffer
   * @param {Buffer} buffer
   * @param {string} contentType
   * @returns {Promise<string|null>}
   */
  async extract(buffer, contentType) {
    if (!this._isText(contentType)) {
      return null;
    }

    const text = buffer.toString('utf8');
    return text.length > this.maxLength ? text.slice(0, this.maxLength) : text;
  }

  _isText(contentType) {
    if (!contentType) return false;
    const normalized = contentType.toLowerCase();
    return (
      normalized === 'text/plain' ||
      normalized.startsWith('text/')
    );
  }
}

module.exports = { TextExtractor };

// src/core/utils/mime-resolver.js
// MIME type detection and validation

const path = require('path');

const MIME_MAP = {
  // Images
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',

  // Text
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.html': 'text/html',
  '.json': 'application/json',

  // Documents
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

  // Audio
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',

  // Video
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',

  // Archives
  '.zip': 'application/zip',
  '.gz': 'application/gzip'
};

const SUPPORTED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/markdown',
  'application/pdf',
  'audio/mpeg',
  'audio/wav',
  'video/mp4'
]);

/**
 * Get MIME type from filename or buffer
 */
function resolveMimeType(filename, buffer) {
  // Try extension first
  const ext = path.extname(filename).toLowerCase();
  if (MIME_MAP[ext]) {
    return MIME_MAP[ext];
  }

  // Try magic bytes (basic)
  if (buffer) {
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'image/jpeg';
    if (buffer[0] === 0x89 && buffer.toString('ascii', 1, 4) === 'PNG') return 'image/png';
    if (buffer[0] === 0x47 && buffer[1] === 0x49) return 'image/gif';
    if (buffer[0] === 0x25 && buffer[1] === 0x50) return 'application/pdf';
  }

  return 'application/octet-stream';
}

/**
 * Check if MIME type is supported for ingestion
 */
function isSupportedType(mimeType) {
  // Support by prefix: image/*, text/*, audio/*, video/*
  const prefix = mimeType.split('/')[0];
  if (['image', 'text', 'audio', 'video'].includes(prefix)) {
    return true;
  }
  return SUPPORTED_TYPES.has(mimeType);
}

/**
 * Get extractor type for MIME type
 */
function getExtractorType(mimeType) {
  const prefix = mimeType.split('/')[0];
  const extractors = {
    image: 'image',
    text: 'text',
    audio: 'audio',
    video: 'video',
    application: mimeType === 'application/pdf' ? 'pdf' : null
  };
  return extractors[prefix] || null;
}

module.exports = {
  resolveMimeType,
  isSupportedType,
  getExtractorType,
  SUPPORTED_TYPES
};

// src/core/utils/id-generator.js
// ID generation utilities

const { v4: uuidv4 } = require('uuid');

/**
 * Generate a Docket memory ID
 * Format: mem_{uuid} (first 8 chars of UUID for readability)
 */
function generateMemoryId() {
  return `mem_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
}

/**
 * Generate a job ID
 */
function generateJobId() {
  return `job_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
}

/**
 * Generate a blob key
 */
function generateBlobKey(memoryId, filename) {
  const ext = filename.split('.').pop() || 'bin';
  return `${memoryId}/raw.${ext}`;
}

module.exports = {
  generateMemoryId,
  generateJobId,
  generateBlobKey
};

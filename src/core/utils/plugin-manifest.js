// src/core/utils/plugin-manifest.js
// Plugin manifest validation and utilities

const { z } = require('zod');

const PluginManifestSchema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9-]+$/),
  version: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(['llm', 'embedder', 'store', 'blob', 'queue']),
  capabilities: z.array(z.string()).min(1),
  cortexCompatibility: z.string().min(1),
  author: z.string().optional(),
  repository: z.string().url().optional(),
  license: z.string().optional(),
  entrypoint: z.string().default('./index.js'),
  configSchema: z.record(z.any()).optional()
});

/**
 * Validate a plugin manifest object
 * @param {Object} manifest
 * @returns {{ valid: boolean, errors?: string[], manifest?: Object }}
 */
function validateManifest(manifest) {
  const result = PluginManifestSchema.safeParse(manifest);
  if (result.success) {
    return { valid: true, manifest: result.data };
  }
  return {
    valid: false,
    errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
  };
}

/**
 * Infer plugin category from package name
 * Supports: @scope/cortex-llm-name, cortex-llm-name, @cortex/llm-name
 * @param {string} packageName
 * @returns {string|null}
 */
function inferCategory(packageName) {
  const categories = ['llm', 'embedder', 'store', 'blob', 'queue'];
  const clean = packageName.replace(/^@[^/]+\//, '');
  for (const cat of categories) {
    if (clean.includes(`-${cat}-`) || clean === `cortex-${cat}`) {
      return cat;
    }
  }
  return null;
}

/**
 * Generate a recommended package name for a plugin
 * @param {string} category
 * @param {string} name
 * @returns {string}
 */
function suggestPackageName(category, name) {
  return `cortex-${category}-${name}`;
}

module.exports = {
  validateManifest,
  inferCategory,
  suggestPackageName,
  PluginManifestSchema
};

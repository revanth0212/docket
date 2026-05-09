// src/core/utils/adapter-registry.js
// Dynamic adapter loading and dependency injection

const path = require('path');
const { ConfigError, AdapterError } = require('../errors');

/**
 * Registry of loaded adapter instances
 */
class AdapterRegistry {
  constructor() {
    this.adapters = {};
    this.instances = {};
  }

  /**
   * Initialize all adapters from config
   * @param {Object} config — Loaded configuration
   * @returns {Promise<Object>} — { llm, embedder, store, blob, queue }
   */
  async initializeFromConfig(config) {
    const categories = ['llm', 'embedder', 'store', 'blob', 'queue'];
    const result = {};

    for (const category of categories) {
      const categoryConfig = config.cortex.adapters[category];
      const defaultName = categoryConfig.default;
      const providerConfig = categoryConfig.providers[defaultName];

      if (!providerConfig) {
        throw new ConfigError(
          `Missing provider config for ${category}: ${defaultName}`,
          { configKey: `adapters.${category}.providers.${defaultName}` }
        );
      }

      const instance = await this.loadAdapter(category, defaultName, providerConfig);
      result[category] = instance;
      this.instances[category] = instance;
    }

    return result;
  }

  /**
   * Load a single adapter
   * @param {string} category — llm | embedder | store | blob | queue
   * @param {string} name — Provider name
   * @param {Object} providerConfig — { adapter, config }
   * @returns {Promise<Object>} — Initialized adapter instance
   */
  async loadAdapter(category, name, providerConfig) {
    const adapterPath = this.resolveAdapterPath(category, providerConfig.adapter);

    try {
      // Dynamic import
      const module = require(adapterPath);
      const AdapterClass = module.default || Object.values(module).find(
        exp => typeof exp === 'function' && exp.prototype
      );

      if (!AdapterClass) {
        throw new AdapterError(
          `No adapter class found in ${adapterPath}`,
          { adapterName: providerConfig.adapter }
        );
      }

      const instance = new AdapterClass(providerConfig.config);
      await instance.initialize();

      // Verify metadata
      const metadata = AdapterClass.metadata;
      if (!metadata) {
        throw new AdapterError(
          `Adapter ${providerConfig.adapter} missing metadata`,
          { adapterName: providerConfig.adapter }
        );
      }

      // Check compatibility (future: semver check)
      // const coreVersion = require('../../package.json').version;
      // if (!satisfies(coreVersion, metadata.cortexCompatibility)) {
      //   throw new AdapterError(`Incompatible adapter version`);
      // }

      return instance;
    } catch (err) {
      if (err instanceof AdapterError || err instanceof ConfigError) {
        throw err;
      }
      throw new AdapterError(
        `Failed to load adapter ${providerConfig.adapter}: ${err.message}`,
        { adapterName: providerConfig.adapter, cause: err }
      );
    }
  }

  /**
   * Resolve adapter path from package name or relative path
   */
  resolveAdapterPath(category, adapterName) {
    // Handle npm package names like @cortex/llm-ollama
    if (adapterName.startsWith('@cortex/')) {
      const shortName = adapterName.replace('@cortex/', '');
      return path.join(
        process.cwd(),
        'src',
        'adapters',
        category,
        shortName.replace(`${category}-`, ''),
        'index'
      );
    }

    // Handle relative paths
    if (adapterName.startsWith('.')) {
      return path.resolve(process.cwd(), adapterName);
    }

    // Try as npm package
    try {
      return require.resolve(adapterName);
    } catch {
      throw new ConfigError(`Cannot resolve adapter: ${adapterName}`);
    }
  }

  /**
   * Get initialized adapter by category
   */
  get(category) {
    return this.instances[category];
  }

  /**
   * Health check all adapters
   */
  async healthCheck() {
    const results = {};
    for (const [category, adapter] of Object.entries(this.instances)) {
      try {
        results[category] = await adapter.health();
      } catch (err) {
        results[category] = { ok: false, error: err.message };
      }
    }
    return results;
  }
}

module.exports = { AdapterRegistry };

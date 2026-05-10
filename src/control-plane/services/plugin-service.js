// src/control-plane/services/plugin-service.js
// Plugin onboarding, validation, and registry management

const { AdapterRegistry } = require('../../core/utils/adapter-registry');
const { validateManifest, inferCategory } = require('../../core/utils/plugin-manifest');
const { ConfigError } = require('../../core/errors');

/**
 * Plugin Service
 * Manages adapter plugins: validation, registration, and lifecycle.
 */
class PluginService {
  constructor() {
    this.registry = new AdapterRegistry();
    this.registered = new Map();
  }

  /**
   * Validate a plugin package without registering it
   * @param {string} packageName — npm package name or local path
   * @returns {{ valid: boolean, manifest?: Object, errors?: string[], category?: string }}
   */
  async validate(packageName) {
    let module;
    try {
      const resolved = require.resolve(packageName);
      module = require(resolved);
    } catch (err) {
      return { valid: false, errors: [`Cannot load package: ${err.message}`] };
    }

    const AdapterClass = module.default || Object.values(module).find(
      exp => typeof exp === 'function' && exp.prototype
    );

    if (!AdapterClass) {
      return { valid: false, errors: ['No adapter class exported'] };
    }

    const metadata = AdapterClass.metadata;
    if (!metadata) {
      return { valid: false, errors: ['Adapter missing static metadata property'] };
    }

    const manifestResult = validateManifest(metadata);
    if (!manifestResult.valid) {
      return { valid: false, errors: manifestResult.errors };
    }

    const category = metadata.category || inferCategory(packageName);
    if (!category) {
      return { valid: false, errors: ['Cannot infer adapter category from package name or metadata'] };
    }

    return {
      valid: true,
      manifest: manifestResult.manifest,
      category
    };
  }

  /**
   * Register a plugin at runtime
   * @param {string} packageName
   * @param {Object} config — Adapter configuration object
   * @returns {Promise<Object>} — Registered plugin info
   */
  async register(packageName, config = {}) {
    const validation = await this.validate(packageName);
    if (!validation.valid) {
      throw new ConfigError(
        `Plugin validation failed: ${validation.errors.join(', ')}`,
        { packageName }
      );
    }

    const { manifest, category } = validation;

    // Prevent duplicate registration
    const key = `${category}:${manifest.name}`;
    if (this.registered.has(key)) {
      throw new ConfigError(`Plugin already registered: ${key}`, { packageName });
    }

    // Instantiate and initialize
    const instance = await this.registry.loadAdapter(category, manifest.name, {
      adapter: packageName,
      config
    });

    const info = {
      key,
      packageName,
      category,
      manifest,
      instance,
      registeredAt: new Date().toISOString()
    };

    this.registered.set(key, info);
    return info;
  }

  /**
   * Deregister a plugin
   * @param {string} key — category:name
   * @returns {boolean}
   */
  deregister(key) {
    const plugin = this.registered.get(key);
    if (!plugin) return false;

    // Graceful cleanup if available
    if (typeof plugin.instance.destroy === 'function') {
      plugin.instance.destroy();
    }

    this.registered.delete(key);
    return true;
  }

  /**
   * List all registered plugins
   * @returns {Array<Object>}
   */
  list() {
    return Array.from(this.registered.values()).map(p => ({
      key: p.key,
      packageName: p.packageName,
      category: p.category,
      manifest: p.manifest,
      registeredAt: p.registeredAt
    }));
  }

  /**
   * Get a registered plugin by key
   * @param {string} key
   * @returns {Object|null}
   */
  get(key) {
    const plugin = this.registered.get(key);
    if (!plugin) return null;
    return {
      key: plugin.key,
      packageName: plugin.packageName,
      category: plugin.category,
      manifest: plugin.manifest,
      registeredAt: plugin.registeredAt
    };
  }
}

module.exports = { PluginService };

// src/core/config/loader.js
// Configuration loading with env var interpolation and validation

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { z } = require('zod');
const { ConfigError } = require('../errors');

/**
 * Interpolate environment variables in config strings
 * Supports: ${VAR} or ${VAR:-default}
 */
function interpolateEnv(value) {
  if (typeof value !== 'string') return value;

  return value.replace(/\$\{([^}]+)\}/g, (match, expr) => {
    const [varName, defaultValue] = expr.split(':-');
    const envValue = process.env[varName.trim()];

    if (envValue !== undefined) return envValue;
    if (defaultValue !== undefined) return defaultValue.trim();

    throw new ConfigError(`Missing required environment variable: ${varName}`, {
      configKey: varName
    });
  });
}

/**
 * Deep interpolate all string values in an object
 */
function deepInterpolate(obj) {
  if (typeof obj === 'string') {
    return interpolateEnv(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(deepInterpolate);
  }
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = deepInterpolate(value);
    }
    return result;
  }
  return obj;
}

/**
 * Zod schema for config validation
 */
const adapterProviderSchema = z.object({
  adapter: z.string().min(1),
  config: z.record(z.any()).default({})
});

const configSchema = z.object({
  docket: z.object({
    version: z.string().optional(),
    server: z.object({
      port: z.number().int().min(1).max(65535).default(3000),
      host: z.string().default('127.0.0.1')
    }).default({}),
    logging: z.object({
      level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
      format: z.enum(['pretty', 'json']).default('pretty')
    }).default({}),
    adapters: z.object({
      llm: z.object({
        default: z.string(),
        providers: z.record(adapterProviderSchema)
      }),
      embedder: z.object({
        default: z.string(),
        providers: z.record(adapterProviderSchema)
      }),
      store: z.object({
        default: z.string(),
        providers: z.record(adapterProviderSchema)
      }),
      blob: z.object({
        default: z.string(),
        providers: z.record(adapterProviderSchema)
      }),
      queue: z.object({
        default: z.string(),
        providers: z.record(adapterProviderSchema)
      })
    })
  })
});

/**
 * Load configuration from file and environment
 * 
 * Priority (low to high):
 * 1. defaults.yaml (built-in)
 * 2. config.yaml (user-provided, gitignored)
 * 3. DOCKET_* environment variables
 * 4. CLI arguments (future)
 */
function loadConfig(options = {}) {
  const configDir = options.configDir || path.join(process.cwd(), 'config');

  // 1. Load defaults
  let config = {};
  const defaultsPath = path.join(configDir, 'defaults.yaml');
  if (fs.existsSync(defaultsPath)) {
    const defaultsContent = fs.readFileSync(defaultsPath, 'utf8');
    config = yaml.load(defaultsContent);
  }

  // 2. Load user config if exists
  const userConfigPath = path.join(configDir, 'config.yaml');
  if (fs.existsSync(userConfigPath)) {
    const userContent = fs.readFileSync(userConfigPath, 'utf8');
    const userConfig = yaml.load(userContent);
    config = mergeDeep(config, userConfig);
  }

  // 3. Interpolate environment variables
  config = deepInterpolate(config);

  // 4. Override with DOCKET_* env vars
  config = applyEnvOverrides(config);

  // 5. Validate
  try {
    const validated = configSchema.parse(config);
    return validated;
  } catch (err) {
    if (err instanceof z.ZodError) {
      const issues = err.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new ConfigError(`Invalid configuration: ${issues}`, { cause: err });
    }
    throw new ConfigError('Failed to load configuration', { cause: err });
  }
}

/**
 * Apply DOCKET_* environment variable overrides
 * Format: DOCKET_ADAPTERS_LLM_DEFAULT=openai
 */
function applyEnvOverrides(config) {
  const prefix = 'DOCKET_';

  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith(prefix)) continue;

    const path = key
      .slice(prefix.length)
      .toLowerCase()
      .split('_');

    // Env vars target config.docket.*, not config.* directly
    setDeep(config, ['docket', ...path], parseEnvValue(value));
  }

  return config;
}

function parseEnvValue(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Deep merge two objects
 */
function mergeDeep(target, source) {
  if (!source) return target;
  if (!target) return source;

  const result = { ...target };

  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = mergeDeep(result[key] || {}, value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

function setDeep(obj, path, value) {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  current[path[path.length - 1]] = value;
}

module.exports = {
  loadConfig,
  mergeDeep,
  interpolateEnv
};

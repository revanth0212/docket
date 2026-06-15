// src/core/config/schema.js
// Zod schemas for Docket configuration

const { z } = require('zod');

const adapterProviderSchema = z.object({
  adapter: z.string().min(1),
  config: z.record(z.any()).default({})
});

const decayFunctionSchema = z.object({
  type: z.enum(['none', 'linear', 'exponential']),
  halfLifeDays: z.number().positive().optional()
});

const memoryConfigSchema = z.object({
  mode: z.enum(['flat', 'rich']).default('flat'),
  sectors: z.object({
    enabled: z.boolean().default(true),
    types: z.array(z.string().min(1)).default([
      'episodic', 'semantic', 'procedural', 'emotional', 'reflective'
    ]),
    default: z.string().min(1).default('semantic'),
    classificationPrompt: z.string().default(''),
    cacheClassifications: z.boolean().default(true)
  }).default({}),
  decay: z.object({
    enabled: z.boolean().default(true),
    interval: z.number().int().min(0).default(3600000),
    functions: z.record(decayFunctionSchema).default({}),
    forgottenThreshold: z.number().min(0).max(1).default(0.05)
  }).default({}),
  temporal: z.object({
    enabled: z.boolean().default(true),
    defaultValidFrom: z.string().datetime().nullable().default(null),
    defaultValidTo: z.string().datetime().nullable().default(null),
    pointInTimeQueries: z.boolean().default(true)
  }).default({}),
  rbac: z.object({
    enabled: z.boolean().default(false),
    authStrategy: z.enum(['header', 'jwt', 'apiKey']).default('header'),
    principalHeader: z.string().default('X-Principal'),
    defaultPolicy: z.string().default('owner-only'),
    policies: z.record(z.any()).default({})
  }).default({})
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
    memory: memoryConfigSchema.default({}),
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

module.exports = {
  configSchema,
  memoryConfigSchema,
  adapterProviderSchema
};

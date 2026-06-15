// src/data-plane/middleware/request-validator.js
// Zod-based request validation helpers for data plane routes

const { z } = require('zod');
const { ValidationError } = require('../../core/errors');

const IngestRequestSchema = z.object({
  text: z.string().optional(),
  contentType: z.string().min(1).default('text/plain'),
  filename: z.string().optional(),
  async: z.boolean().default(false),
  metadata: z.record(z.any()).default({}),
  sectorHint: z.enum(['episodic', 'semantic', 'procedural', 'emotional', 'reflective']).optional(),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional()
}).refine(data => data.text, {
  message: 'text is required for JSON ingest requests',
  path: ['text']
});

const QueryRequestSchema = z.object({
  question: z.string().min(1),
  topK: z.number().int().min(1).max(100).default(10),
  sectors: z.array(z.enum(['episodic', 'semantic', 'procedural', 'emotional', 'reflective'])).optional(),
  temporal: z.object({
    atDate: z.string().datetime().optional()
  }).optional(),
  includeTrace: z.boolean().default(false)
});

const CreateMemorySchema = z.object({
  rawRef: z.string().min(1).optional(),
  contentType: z.string().min(1),
  extractedText: z.string().optional(),
  summary: z.string().optional(),
  sector: z.enum(['episodic', 'semantic', 'procedural', 'emotional', 'reflective']).optional(),
  salience: z.number().min(0).max(1).optional(),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  metadata: z.record(z.any()).default({}),
  parentId: z.string().optional()
});

const UpdateMemorySchema = z.object({
  extractedText: z.string().optional(),
  summary: z.string().optional(),
  sector: z.enum(['episodic', 'semantic', 'procedural', 'emotional', 'reflective']).optional(),
  salience: z.number().min(0).max(1).optional(),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional()
});

const CreateRelationSchema = z.object({
  targetId: z.string().regex(/^mem_[a-z0-9]+$/),
  type: z.string().min(1),
  confidence: z.number().min(0).max(1).default(1.0),
  metadata: z.record(z.any()).default({})
});

/**
 * Validate request body against a Zod schema
 * @param {import('zod').ZodSchema} schema
 * @returns {Function}
 */
function validate(schema) {
  return async (request, _reply) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      throw new ValidationError(`Validation error: ${result.error.message}`);
    }
    request.body = result.data;
  };
}

module.exports = {
  IngestRequestSchema,
  QueryRequestSchema,
  CreateMemorySchema,
  UpdateMemorySchema,
  CreateRelationSchema,
  validate
};

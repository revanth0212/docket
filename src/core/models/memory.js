// src/core/models/memory.js
// Memory data model with Zod validation

const { z } = require('zod');

const MemorySchema = z.object({
  id: z.string().regex(/^mem_[a-z0-9]+$/),
  rawRef: z.string().min(1).optional(),
  contentType: z.string().min(1),
  extractedText: z.string().optional(),
  summary: z.string().optional().nullable(),
  embedding: z.array(z.number()).optional(),
  metadata: z.record(z.any()).default({}),
  parentId: z.string().optional(),
  supersedesId: z.string().optional(),
  sector: z.enum(['episodic', 'semantic', 'procedural', 'emotional', 'reflective']).optional(),
  salience: z.number().min(0).max(1).default(1.0),
  validFrom: z.date().optional(),
  validTo: z.date().optional(),
  accessPolicy: z.string().default('owner-only'),
  owner: z.string().optional(),
  readers: z.array(z.string()).default([]),
  writers: z.array(z.string()).default([]),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().optional()
});

const CreateMemorySchema = MemorySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

const UpdateMemorySchema = MemorySchema.partial().omit({
  id: true,
  createdAt: true
});

module.exports = {
  MemorySchema,
  CreateMemorySchema,
  UpdateMemorySchema
};

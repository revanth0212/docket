// src/core/models/memory.js
// Memory data model with Zod validation

const { z } = require('zod');

const MemorySchema = z.object({
  id: z.string().regex(/^mem_[a-z0-9]+$/),
  rawRef: z.string().min(1),
  contentType: z.string().min(1),
  extractedText: z.string().optional(),
  summary: z.string().optional(),
  embedding: z.array(z.number()).optional(),
  metadata: z.record(z.any()).default({}),
  parentId: z.string().optional(),
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

// src/core/models/job.js
// Job queue data model

const { z } = require('zod');

const JobSchema = z.object({
  id: z.string().regex(/^job_[a-z0-9]+$/),
  type: z.enum(['ingestion', 'insight-generation', 'summarization', 'extraction']),
  payload: z.record(z.any()),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).default('pending'),
  attempts: z.number().int().min(0).default(0),
  maxAttempts: z.number().int().min(1).default(3),
  error: z.string().optional(),
  result: z.record(z.any()).optional(),
  createdAt: z.date().default(() => new Date()),
  startedAt: z.date().optional(),
  completedAt: z.date().optional()
});

const CreateJobSchema = JobSchema.omit({
  id: true,
  status: true,
  attempts: true,
  error: true,
  result: true,
  createdAt: true,
  startedAt: true,
  completedAt: true
});

module.exports = {
  JobSchema,
  CreateJobSchema
};

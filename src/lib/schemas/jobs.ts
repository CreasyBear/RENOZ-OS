/**
 * Job Zod Schemas
 *
 * Validation schemas for job tracking operations.
 */

import { z } from "zod";

// ============================================================================
// ENUMS (must match canonical-enums.json)
// ============================================================================

export const jobStatusValues = [
  "pending",
  "running",
  "completed",
  "failed",
] as const;

export const jobTypeValues = [
  "import",
  "export",
  "bulk_update",
  "report_generation",
  "data_sync",
  "cleanup",
  "other",
] as const;

export const jobStatusSchema = z.enum(jobStatusValues);
export const jobTypeSchema = z.enum(jobTypeValues);

export type JobStatus = z.infer<typeof jobStatusSchema>;
export type JobType = z.infer<typeof jobTypeSchema>;

// ============================================================================
// CREATE JOB
// ============================================================================

export const createJobSchema = z.object({
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
  type: jobTypeSchema,
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  externalId: z.string().optional(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;

// ============================================================================
// UPDATE JOB PROGRESS
// ============================================================================

export const updateJobProgressSchema = z.object({
  jobId: z.string().uuid(),
  progress: z.number().min(0).max(100),
  status: jobStatusSchema.optional(),
  currentStep: z.string().optional(),
});

export type UpdateJobProgressInput = z.infer<typeof updateJobProgressSchema>;

// ============================================================================
// COMPLETE JOB
// ============================================================================

export const completeJobSchema = z.object({
  jobId: z.string().uuid(),
  success: z.boolean(),
  errorMessage: z.string().optional(),
  errorCode: z.string().optional(),
  createNotification: z.boolean().default(true),
});

export type CompleteJobInput = z.infer<typeof completeJobSchema>;

// ============================================================================
// GET JOB
// ============================================================================

export const jobIdSchema = z.object({
  jobId: z.string().uuid(),
});

export type JobIdInput = z.infer<typeof jobIdSchema>;

// ============================================================================
// GET USER JOBS
// ============================================================================

export const userJobsSchema = z.object({
  userId: z.string().uuid(),
  status: jobStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type UserJobsInput = z.infer<typeof userJobsSchema>;

// ============================================================================
// GET ACTIVE JOBS
// ============================================================================

export const userIdSchema = z.object({
  userId: z.string().uuid(),
});

export type UserIdInput = z.infer<typeof userIdSchema>;

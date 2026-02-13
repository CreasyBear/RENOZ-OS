/**
 * Automation Jobs Zod Schemas
 *
 * Validation schemas for background job tracking.
 * Used by Trigger.dev tasks and UI to manage long-running operations.
 *
 * @see drizzle/schema/automation-jobs.ts for database schema
 */

import { z } from 'zod';

// ============================================================================
// JOB STATUS AND TYPE ENUMS
// ============================================================================

export const jobStatusSchema = z.enum(['pending', 'running', 'completed', 'failed']);
export const jobTypeSchema = z.enum([
  'import',
  'export',
  'bulk_update',
  'report_generation',
  'data_sync',
  'cleanup',
  'other',
]);

export type JobStatus = z.infer<typeof jobStatusSchema>;
export type JobType = z.infer<typeof jobTypeSchema>;

// ============================================================================
// JOB CRUD SCHEMAS
// ============================================================================

export const jobIdSchema = z.object({
  jobId: z.string().uuid(),
});

export const createJobSchema = z.object({
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
  type: jobTypeSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  externalId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateJobProgressSchema = z.object({
  jobId: z.string().uuid(),
  progress: z.number().int().min(0).max(100),
  status: jobStatusSchema.optional(),
  currentStep: z.string().optional(),
});

export const completeJobSchema = z.object({
  jobId: z.string().uuid(),
  success: z.boolean(),
  errorMessage: z.string().optional(),
  errorCode: z.string().optional(),
  createNotification: z.boolean().optional(),
});

export const userJobsSchema = z.object({
  status: jobStatusSchema.optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type JobIdInput = z.infer<typeof jobIdSchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobProgressInput = z.infer<typeof updateJobProgressSchema>;
export type CompleteJobInput = z.infer<typeof completeJobSchema>;
export type UserJobsInput = z.infer<typeof userJobsSchema>;

// ============================================================================
// CLIENT-SAFE TYPE DEFINITIONS
// (Duplicated from drizzle schema to avoid client/server bundling issues)
// ============================================================================

/**
 * Automation job metadata interface.
 * Client-safe version from drizzle/schema.
 * Named AutomationJobMetadata to avoid conflict with jobs.JobMetadata (assignment metadata).
 */
export interface AutomationJobMetadata {
  /** Total items to process */
  totalItems?: number;
  /** Items processed so far */
  processedItems?: number;
  /** Current step/phase description */
  currentStep?: string;
  /** Result data (on completion) */
  result?: object;
  /** Error details (on failure) */
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
  /** Additional context-specific data */
  extra?: object;
}


/**
 * Automation job entity.
 * Client-safe version of Job from drizzle/schema.
 *
 * @see drizzle/schema/automation-jobs.ts for database definition
 */
export interface Job {
  id: string;
  organizationId: string;
  userId: string;
  type: JobType;
  name: string;
  description: string | null;
  status: JobStatus;
  progress: number;
  startedAt: Date | string | null;
  completedAt: Date | string | null;
  metadata: AutomationJobMetadata | null;
  externalId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

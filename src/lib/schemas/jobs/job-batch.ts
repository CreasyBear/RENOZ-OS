/**
 * Job Batch Processing Schemas
 *
 * Types for batch job operations.
 * Uses flexibleJsonSchema for ServerFn boundary (SCHEMA-TRACE §4).
 * @see lib/job-batch-processing.ts
 */

import { z } from 'zod';
import { flexibleJsonSchema } from '../_shared/patterns';
import { jobLocationSchema, jobAssignmentMetadataSchema } from './job-assignments';

// ============================================================================
// JOB OPERATION DATA
// ============================================================================

export const jobCreateDataSchema = flexibleJsonSchema;
export const jobUpdateDataSchema = flexibleJsonSchema;
export const jobDeleteDataSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
});
export const jobRescheduleDataSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
});
export const jobAssignDataSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  installerId: z.string().uuid(),
});

export type JobCreateData = z.infer<typeof jobCreateDataSchema>;
export type JobUpdateData = z.infer<typeof jobUpdateDataSchema>;
export type JobDeleteData = z.infer<typeof jobDeleteDataSchema>;
export type JobRescheduleData = z.infer<typeof jobRescheduleDataSchema>;
export type JobAssignData = z.infer<typeof jobAssignDataSchema>;

export type JobOperationData =
  | JobCreateData
  | JobUpdateData
  | JobDeleteData
  | JobRescheduleData
  | JobAssignData;

// ============================================================================
// JOB RESULT
// ============================================================================

export const jobBatchResultSchema = z.object({
  operationId: z.string(),
  success: z.boolean(),
  result: flexibleJsonSchema.optional(),
  error: z.string().optional(),
  duration: z.number(),
});

export type JobBatchResult = z.infer<typeof jobBatchResultSchema>;

// ============================================================================
// ROLLBACK DATA
// ============================================================================

export const jobRollbackDataSchema = z.object({
  operationId: z.string(),
  type: z.enum(['create', 'update', 'delete', 'reschedule', 'assign']),
  originalData: flexibleJsonSchema,
  result: flexibleJsonSchema.optional(),
});

export type JobRollbackData = z.infer<typeof jobRollbackDataSchema>;

// ============================================================================
// JOB BATCH OPERATION
// ============================================================================

export const jobBatchOperationSchema = z.object({
  id: z.string(),
  type: z.enum(['create', 'update', 'delete', 'reschedule', 'assign']),
  data: flexibleJsonSchema,
});

export type JobBatchOperation = z.infer<typeof jobBatchOperationSchema>;

// ============================================================================
// JOB LOCATION / METADATA (re-export for job-assignments server function)
// ============================================================================

export type JobLocation = z.infer<typeof jobLocationSchema>;
export type JobMetadata = z.infer<typeof jobAssignmentMetadataSchema>;

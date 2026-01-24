/**
 * Job Assignment Zod Schemas
 *
 * Validation schemas for field work job assignments.
 * Matches drizzle/schema/jobs/job-assignments.ts
 */

import { z } from 'zod';

// ============================================================================
// ENUMS (must match drizzle schema)
// ============================================================================

export const jobAssignmentStatusValues = [
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'on_hold',
] as const;

export const jobAssignmentTypeValues = [
  'installation',
  'service',
  'warranty',
  'inspection',
  'commissioning',
] as const;

export const jobPhotoTypeValues = ['before', 'during', 'after', 'issue', 'signature'] as const;

// ============================================================================
// BASE SCHEMAS
// ============================================================================

export const jobAssignmentStatusSchema = z.enum(jobAssignmentStatusValues);
export const jobAssignmentTypeSchema = z.enum(jobAssignmentTypeValues);
export const jobPhotoTypeSchema = z.enum(jobPhotoTypeValues);

// ============================================================================
// LOCATION SCHEMA
// ============================================================================

export const jobLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).optional(),
  timestamp: z.string().datetime().optional(),
});

// ============================================================================
// METADATA SCHEMA
// ============================================================================

export const jobAssignmentMetadataSchema = z
  .object({
    notes: z.string().optional(),
    weatherConditions: z.string().optional(),
    accessInstructions: z.string().optional(),
    equipmentRequired: z.array(z.string()).optional(),
  })
  .catchall(z.union([z.string(), z.array(z.string())]).optional());

// ============================================================================
// CREATE JOB ASSIGNMENT
// ============================================================================

export const createJobAssignmentSchema = z.object({
  organizationId: z.string().uuid(),
  orderId: z.string().uuid().optional(),
  customerId: z.string().uuid(),
  installerId: z.string().uuid(),
  jobType: jobAssignmentTypeSchema.default('installation'),
  jobNumber: z.string().min(1).max(50),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  scheduledTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional(), // HH:MM format
  estimatedDuration: z.number().min(15).max(480).optional(), // 15min to 8hrs
  internalNotes: z.string().optional(),
  metadata: jobAssignmentMetadataSchema.optional(),
});

export type CreateJobAssignmentInput = z.infer<typeof createJobAssignmentSchema>;

// ============================================================================
// UPDATE JOB ASSIGNMENT
// ============================================================================

export const updateJobAssignmentSchema = z
  .object({
    jobType: jobAssignmentTypeSchema.optional(),
    title: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    scheduledDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    scheduledTime: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .optional(),
    estimatedDuration: z.number().min(15).max(480).optional(),
    status: jobAssignmentStatusSchema.optional(),
    internalNotes: z.string().optional(),
    metadata: jobAssignmentMetadataSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'At least one field must be provided for update');

export type UpdateJobAssignmentInput = z.infer<typeof updateJobAssignmentSchema>;

// ============================================================================
// JOB ASSIGNMENT FILTERS
// ============================================================================

export const jobAssignmentFiltersSchema = z.object({
  status: jobAssignmentStatusSchema.optional(),
  statuses: z.array(jobAssignmentStatusSchema).optional(),
  jobType: jobAssignmentTypeSchema.optional(),
  jobTypes: z.array(jobAssignmentTypeSchema).optional(),
  installerId: z.string().uuid().optional(),
  installerIds: z.array(z.string().uuid()).optional(),
  customerId: z.string().uuid().optional(),
  customerIds: z.array(z.string().uuid()).optional(),
  orderId: z.string().uuid().optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['scheduledDate', 'createdAt', 'updatedAt', 'jobNumber']).default('scheduledDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type JobAssignmentFilters = z.infer<typeof jobAssignmentFiltersSchema>;

// ============================================================================
// LIST JOB ASSIGNMENTS
// ============================================================================

export const listJobAssignmentsSchema = z.object({
  organizationId: z.string().uuid(),
  filters: jobAssignmentFiltersSchema.optional(),
});

export type ListJobAssignmentsInput = z.infer<typeof listJobAssignmentsSchema>;

// ============================================================================
// GET JOB ASSIGNMENT
// ============================================================================

export const getJobAssignmentSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
});

export type GetJobAssignmentInput = z.infer<typeof getJobAssignmentSchema>;

// ============================================================================
// DELETE JOB ASSIGNMENT
// ============================================================================

export const deleteJobAssignmentSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
});

export type DeleteJobAssignmentInput = z.infer<typeof deleteJobAssignmentSchema>;

// ============================================================================
// START/COMPLETE JOB
// ============================================================================

export const startJobAssignmentSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  startLocation: jobLocationSchema.optional(),
});

export type StartJobAssignmentInput = z.infer<typeof startJobAssignmentSchema>;

export const completeJobAssignmentSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  completeLocation: jobLocationSchema.optional(),
});

export type CompleteJobAssignmentInput = z.infer<typeof completeJobAssignmentSchema>;

// ============================================================================
// JOB PHOTO SCHEMAS
// ============================================================================

export const createJobPhotoSchema = z.object({
  organizationId: z.string().uuid(),
  jobAssignmentId: z.string().uuid(),
  type: jobPhotoTypeSchema,
  photoUrl: z.string().url(),
  caption: z.string().optional(),
  location: jobLocationSchema.optional(),
});

export type CreateJobPhotoInput = z.infer<typeof createJobPhotoSchema>;

export const listJobPhotosSchema = z.object({
  organizationId: z.string().uuid(),
  jobAssignmentId: z.string().uuid(),
});

export type ListJobPhotosInput = z.infer<typeof listJobPhotosSchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export const jobAssignmentResponseSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  orderId: z.string().uuid().nullable(),
  customerId: z.string().uuid(),
  customer: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }),
  installerId: z.string().uuid(),
  installer: z.object({
    id: z.string().uuid(),
    name: z.string().nullable(),
    email: z.string(),
  }),
  jobType: jobAssignmentTypeSchema,
  jobNumber: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  scheduledDate: z.coerce.date(),
  scheduledTime: z.string().nullable(),
  estimatedDuration: z.number().nullable(),
  status: jobAssignmentStatusSchema,
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  startLocation: jobLocationSchema.nullable(),
  completeLocation: jobLocationSchema.nullable(),
  signatureUrl: z.string().nullable(),
  signedByName: z.string().nullable(),
  confirmationStatus: z.string().nullable(),
  internalNotes: z.string().nullable(),
  metadata: jobAssignmentMetadataSchema,
  slaTrackingId: z.string().uuid().nullable(),
  version: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type JobAssignmentResponse = z.infer<typeof jobAssignmentResponseSchema>;

export const jobPhotoResponseSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  jobAssignmentId: z.string().uuid(),
  type: jobPhotoTypeSchema,
  photoUrl: z.string(),
  caption: z.string().nullable(),
  location: jobLocationSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type JobPhotoResponse = z.infer<typeof jobPhotoResponseSchema>;

export const listJobAssignmentsResponseSchema = z.object({
  jobs: z.array(jobAssignmentResponseSchema),
  total: z.number(),
  hasMore: z.boolean(),
  nextOffset: z.number().optional(),
});

export type ListJobAssignmentsResponse = z.infer<typeof listJobAssignmentsResponseSchema>;

export const createJobAssignmentResponseSchema = z.object({
  success: z.boolean(),
  job: jobAssignmentResponseSchema.optional(),
  error: z.string().optional(),
});

export type CreateJobAssignmentResponse = z.infer<typeof createJobAssignmentResponseSchema>;

export const updateJobAssignmentResponseSchema = z.object({
  success: z.boolean(),
  job: jobAssignmentResponseSchema.optional(),
  error: z.string().optional(),
});

export type UpdateJobAssignmentResponse = z.infer<typeof updateJobAssignmentResponseSchema>;

export const deleteJobAssignmentResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

export type DeleteJobAssignmentResponse = z.infer<typeof deleteJobAssignmentResponseSchema>;

export const createJobPhotoResponseSchema = z.object({
  success: z.boolean(),
  photo: jobPhotoResponseSchema.optional(),
  error: z.string().optional(),
});

export type CreateJobPhotoResponse = z.infer<typeof createJobPhotoResponseSchema>;

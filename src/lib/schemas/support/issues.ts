/**
 * Issue Validation Schemas
 *
 * Zod schemas for issue CRUD operations.
 *
 * @see drizzle/schema/support/issues.ts
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const issueTypeSchema = z.enum([
  'hardware_fault',
  'software_firmware',
  'installation_defect',
  'performance_degradation',
  'connectivity',
  'other',
]);
export type IssueType = z.infer<typeof issueTypeSchema>;

export const issuePrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type IssuePriority = z.infer<typeof issuePrioritySchema>;

export const issueStatusSchema = z.enum([
  'open',
  'in_progress',
  'pending',
  'on_hold',
  'escalated',
  'resolved',
  'closed',
]);
export type IssueStatus = z.infer<typeof issueStatusSchema>;

// ============================================================================
// METADATA SCHEMA
// ============================================================================

export const issueMetadataSchema = z
  .object({
    serialNumber: z.string().optional(),
    batteryModel: z.string().optional(),
    installedDate: z.string().optional(),
    sohReading: z.number().min(0).max(100).optional(), // State of Health percentage
    inverterErrorCode: z.string().optional(),
    inverterModel: z.string().optional(),
  })
  .passthrough(); // Allow additional properties

// ============================================================================
// CREATE ISSUE
// ============================================================================

export const createIssueSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).nullable().optional(),
  type: issueTypeSchema.default('other'),
  priority: issuePrioritySchema.default('medium'),
  customerId: z.string().uuid().nullable().optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
  slaConfigurationId: z.string().uuid().nullable().optional(),
  metadata: issueMetadataSchema.nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;

// ============================================================================
// UPDATE ISSUE
// ============================================================================

export const updateIssueSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).nullable().optional(),
  type: issueTypeSchema.optional(),
  priority: issuePrioritySchema.optional(),
  status: issueStatusSchema.optional(),
  customerId: z.string().uuid().nullable().optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
  holdReason: z.string().max(500).nullable().optional(),
  resolutionNotes: z.string().max(5000).nullable().optional(),
  metadata: issueMetadataSchema.nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
});

export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const getIssuesSchema = z.object({
  status: issueStatusSchema.optional(),
  priority: issuePrioritySchema.optional(),
  type: issueTypeSchema.optional(),
  customerId: z.string().uuid().optional(),
  assignedToUserId: z.string().uuid().optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export const getIssueByIdSchema = z.object({
  issueId: z.string().uuid(),
});

// ============================================================================
// BARREL EXPORT
// ============================================================================

export * from './sla';

/**
 * Issue Validation Schemas
 *
 * Zod schemas for issue CRUD operations.
 *
 * @see drizzle/schema/support/issues.ts
 */

import { z } from 'zod';
import { cursorPaginationSchema } from '@/lib/db/pagination';

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
  status: z.union([issueStatusSchema, z.array(issueStatusSchema)]).optional(),
  priority: z.union([issuePrioritySchema, z.array(issuePrioritySchema)]).optional(),
  type: issueTypeSchema.optional(),
  customerId: z.string().uuid().optional(),
  assignedToUserId: z.string().uuid().optional(),
  /** Resolved client-side: 'me' = current user, 'unassigned' = null assignee */
  assignedToFilter: z.enum(['me', 'unassigned']).optional(),
  search: z.string().optional(),
  slaStatus: z.enum(['breached', 'at_risk']).optional(),
  escalated: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export const getIssuesCursorSchema = cursorPaginationSchema.merge(
  z.object({
    status: z.union([issueStatusSchema, z.array(issueStatusSchema)]).optional(),
    priority: z.union([issuePrioritySchema, z.array(issuePrioritySchema)]).optional(),
    type: issueTypeSchema.optional(),
    customerId: z.string().uuid().optional(),
    assignedToUserId: z.string().uuid().optional(),
    assignedToFilter: z.enum(['me', 'unassigned']).optional(),
    search: z.string().optional(),
    slaStatus: z.enum(['breached', 'at_risk']).optional(),
    escalated: z.boolean().optional(),
  })
);

export type GetIssuesCursorInput = z.infer<typeof getIssuesCursorSchema>;

export const getIssueByIdSchema = z.object({
  issueId: z.string().uuid(),
});

// ============================================================================
// UI / COMPONENT TYPES (per SCHEMA-TRACE.md - types in schemas, not components)
// ============================================================================

/** SLA metrics returned by server for issue list/kanban views */
export interface IssueSlaMetrics {
  responseDueAt?: Date | string | null;
  resolutionDueAt?: Date | string | null;
  responseBreached?: boolean;
  resolutionBreached?: boolean;
  isResponseAtRisk?: boolean;
  isResolutionAtRisk?: boolean;
}

export interface IssueFiltersState extends Record<string, unknown> {
  search: string;
  status: IssueStatus[];
  priority: IssuePriority[];
  assignedTo: string | null;
  customerId: string | null;
}

export interface IssueDetail {
  id: string;
  issueNumber: string;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  type: IssueType;
  createdAt: Date | string;
  updatedAt: Date | string;
  resolvedAt?: Date | string | null;
  customer?: { id: string; name: string } | null;
  assignedTo?: { id: string; name: string } | null;
  slaMetrics?: {
    responseDueAt?: Date | string | null;
    resolutionDueAt?: Date | string | null;
    responseBreached?: boolean;
    resolutionBreached?: boolean;
    isResponseAtRisk?: boolean;
    isResolutionAtRisk?: boolean;
  } | null;
  escalatedAt?: Date | string | null;
  escalationReason?: string | null;
  warrantyId?: string | null;
}

export interface IssueListItem {
  id: string;
  issueNumber: string;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  type: IssueType;
  createdAt: Date | string;
  customer?: { name: string } | null;
  assignedTo?: { name: string } | null;
  slaMetrics?: {
    responseBreached?: boolean;
    resolutionBreached?: boolean;
    isResponseAtRisk?: boolean;
    isResolutionAtRisk?: boolean;
  } | null;
}

export interface IssueKanbanItem {
  id: string;
  issueNumber: string;
  title: string;
  priority: IssuePriority;
  status: IssueStatus;
  type: IssueType;
  customerId?: string | null;
  customer?: { name: string } | null;
  assignedTo?: { name: string | null; email: string } | null;
  createdAt: Date | string;
  /** SLA metrics from server (board may transform to flat slaStatus/slaResponseDue/slaResolutionDue) */
  slaMetrics?: IssueSlaMetrics | null;
  slaStatus?: 'on_track' | 'at_risk' | 'breached' | null;
  slaResponseDue?: Date | string | null;
  slaResolutionDue?: Date | string | null;
}

export type BulkAction =
  | 'assign'
  | 'change_priority'
  | 'change_status'
  | 'close'
  | 'delete';

export interface BulkActionEvent {
  action: BulkAction;
  issueIds: string[];
  value?: string;
}

export interface StatusChangeResult {
  confirmed: boolean;
  note: string;
  skipPromptForSession: boolean;
}

export type RelationType =
  | 'blocks'
  | 'blocked_by'
  | 'duplicates'
  | 'duplicated_by'
  | 'relates_to';

export interface RelatedIssue {
  id: string;
  issueNumber: string;
  title: string;
  status: string;
  priority: string;
  relationType: RelationType;
}

export interface PotentialDuplicate {
  id: string;
  issueNumber: string;
  title: string;
  status: string;
  createdAt: Date | string;
  similarity: number;
}

/** Kanban column config for issue board */
export interface KanbanColumn {
  id: IssueStatus;
  title: string;
  color: string;
}

/** Event when issue status changes via drag-drop */
export interface StatusChangeEvent {
  issueId: string;
  fromStatus: IssueStatus;
  toStatus: IssueStatus;
}

// ============================================================================
// BARREL EXPORT
// ============================================================================

export * from './sla';

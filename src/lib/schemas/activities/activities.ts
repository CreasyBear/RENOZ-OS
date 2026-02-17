/**
 * Activity Zod Schemas
 *
 * Validation schemas for audit trail operations.
 *
 * @see drizzle/schema/activities.ts for database schema
 * @see _Initiation/_prd/2-domains/activities/activities.prd.json for full spec
 */

import { z } from 'zod';
import { filterSchema, idParamSchema } from '../_shared/patterns';
import { cursorPaginationSchema } from '@/lib/db/pagination';
import type { UseInfiniteQueryResult, InfiniteData } from '@tanstack/react-query';
import type { CursorPaginatedResponse } from '@/lib/db/pagination';

// ============================================================================
// ENUMS (must match canonical-enums.json)
// ============================================================================

export const activityActionValues = [
  'created',
  'updated',
  'deleted',
  'viewed',
  'exported',
  'shared',
  'assigned',
  'commented',
  'email_sent',
  'email_opened',
  'email_clicked',
  'call_logged',
  'note_added',
] as const;

export const activityEntityTypeValues = [
  'customer',
  'contact',
  'order',
  'opportunity',
  'product',
  'inventory',
  'supplier',
  'warranty',
  'issue',
  'rma',
  'user',
  'email',
  'call',
  'project',
  'workstream',
  'task',
  'purchase_order',
  'shipment',
  'quote',
  // Jobs/Projects domain
  'site_visit',
  'job_assignment',
  'job_material',
  'job_photo',
  // Warranty domain
  'warranty_claim',
  'warranty_policy',
  'warranty_extension',
] as const;

// Activity source values for tracking how activities were created (COMMS-AUTO-002)
export const activitySourceValues = ['manual', 'email', 'webhook', 'system', 'import'] as const;

export const activityActionSchema = z.enum(activityActionValues);
export const activityEntityTypeSchema = z.enum(activityEntityTypeValues);
export const activitySourceSchema = z.enum(activitySourceValues);

export type ActivityAction = z.infer<typeof activityActionSchema>;
export type ActivityEntityType = z.infer<typeof activityEntityTypeSchema>;
export type ActivitySource = z.infer<typeof activitySourceSchema>;

// ============================================================================
// ACTIVITY LOGGING SCHEMAS
// ============================================================================

/**
 * Schema for logging a manual activity on any entity.
 * Used by the EntityActivityLogger component.
 * Entity types match activityEntityTypeValues from this file.
 */
export const logEntityActivitySchema = z.object({
  entityType: activityEntityTypeSchema,
  entityId: z.string().uuid(),
  activityType: z.enum(['call', 'email', 'meeting', 'note', 'follow_up']),
  description: z.string().min(1).max(2000),
  outcome: z.string().max(1000).optional(),
  scheduledAt: z.coerce.date().optional(),
  isFollowUp: z.boolean().default(false),
});

export type LogEntityActivityInput = z.infer<typeof logEntityActivitySchema>;

// ============================================================================
// ACTIVITY CHANGES
// ============================================================================

/**
 * JSON-serializable value type for activity changes.
 * Matches Drizzle schema: ActivityChanges interface
 */
const activityChangeValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.string()),
  z.array(z.number()),
]);

export const activityChangesSchema = z.object({
  before: z.record(z.string(), activityChangeValueSchema).optional(),
  after: z.record(z.string(), activityChangeValueSchema).optional(),
  fields: z.array(z.string()).optional(),
});

export type ActivityChanges = z.infer<typeof activityChangesSchema>;

// ============================================================================
// ACTIVITY METADATA
// ============================================================================

/**
 * Metadata schema - type-safe context data per action type.
 * Matches Drizzle schema: ActivityMetadata interface
 */
export const activityMetadataSchema = z.object({
  // General fields
  requestId: z.string().optional(),
  reason: z.string().optional(),
  assignedTo: z.string().optional(),
  format: z.string().optional(),
  recordCount: z.number().optional(),
  sharedWith: z.array(z.string()).optional(),
  permission: z.string().optional(),

  // Entity context fields
  customerId: z.string().uuid().optional(),
  customerName: z.string().optional(),
  orderId: z.string().uuid().optional(),
  orderNumber: z.string().optional(),
  opportunityId: z.string().uuid().optional(),
  opportunityTitle: z.string().optional(),

  // Email activity fields
  emailId: z.string().optional(),
  recipientEmail: z.string().optional(),
  recipientName: z.string().optional(),
  subject: z.string().optional(),
  eventType: z.string().optional(),
  clickedUrl: z.string().optional(),
  linkId: z.string().optional(),

  // Call activity fields
  callId: z.string().optional(),
  purpose: z.string().optional(),
  direction: z.enum(['inbound', 'outbound']).optional(),
  durationMinutes: z.number().optional(),
  notes: z.string().optional(),

  // Note activity fields
  noteId: z.string().optional(),
  contentPreview: z.string().optional(),

  // Communications fields
  logType: z.string().optional(),
  fullNotes: z.string().optional(),

  // Customer fields (merge operations)
  mergedCount: z.number().optional(),
  mergedIntoCustomerId: z.string().optional(),
  mergedCustomerIds: z.array(z.string()).optional(),
  mergeReason: z.string().optional(),

  // Inventory fields
  movementId: z.string().optional(),
  movementType: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  productId: z.string().optional(),
  quantity: z.number().optional(),

  // Order fields
  total: z.number().optional(),
  changedFields: z.array(z.string()).optional(),
  status: z.string().optional(),
  lineItemCount: z.number().optional(),

  // Pipeline/Opportunity fields
  value: z.number().optional(),
  stage: z.string().optional(),
  previousStage: z.string().optional(),
  newStage: z.string().optional(),
  probability: z.number().optional(),

  // Support fields
  escalationType: z.string().optional(),
  escalatedAt: z.string().optional(),

  // Jobs/Projects domain fields
  projectId: z.string().optional(),
  projectNumber: z.string().optional(),
  projectTitle: z.string().optional(),
  projectType: z.string().optional(),
  priority: z.string().optional(),
  taskId: z.string().optional(),
  taskTitle: z.string().optional(),
  siteVisitId: z.string().optional(),
  visitNumber: z.string().optional(),
  visitType: z.string().optional(),
  jobAssignmentId: z.string().optional(),
  jobNumber: z.string().optional(),
  jobTitle: z.string().optional(),
  installerId: z.string().optional(),
  installerName: z.string().optional(),
  scheduledDate: z.string().optional(),
  materialId: z.string().optional(),
  productName: z.string().optional(),
  previousStatus: z.string().optional(),
  newStatus: z.string().optional(),

  // Warranty domain fields
  warrantyId: z.string().optional(),
  warrantyNumber: z.string().optional(),
  warrantyPolicyId: z.string().optional(),
  policyName: z.string().optional(),
  policyType: z.string().optional(),
  claimId: z.string().optional(),
  claimNumber: z.string().optional(),
  claimType: z.string().optional(),
  claimStatus: z.string().optional(),
  extensionId: z.string().optional(),
  extensionType: z.string().optional(),
  extensionMonths: z.number().optional(),
  previousExpiryDate: z.string().optional(),
  newExpiryDate: z.string().optional(),
  resolutionType: z.string().optional(),
  denialReason: z.string().optional(),

  // Custom extension
  customFields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export type ActivityMetadata = z.infer<typeof activityMetadataSchema>;

// ============================================================================
// CREATE ACTIVITY
// ============================================================================

/**
 * Schema for creating a new activity record.
 * userId, ipAddress, and userAgent are separate columns (not in metadata).
 */
export const createActivitySchema = z.object({
  entityType: activityEntityTypeSchema,
  entityId: z.string().uuid(),
  action: activityActionSchema,
  userId: z.string().uuid().optional().nullable(), // Actor who performed action (null for system)
  changes: activityChangesSchema.optional(),
  metadata: activityMetadataSchema.optional(),
  ipAddress: z.string().optional().nullable(), // Request IP address (inet format)
  userAgent: z.string().max(500).optional().nullable(), // Request user agent
  description: z.string().max(1000).optional(),
  createdBy: z.string().uuid().optional().nullable(), // Usually same as userId
});

export type CreateActivity = z.infer<typeof createActivitySchema>;

// ============================================================================
// ACTIVITY (output)
// ============================================================================

export const activitySchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  entityType: activityEntityTypeSchema,
  entityId: z.string().uuid(),
  action: activityActionSchema,
  changes: activityChangesSchema.nullable(),
  metadata: activityMetadataSchema.nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  description: z.string().nullable(),
  source: activitySourceSchema.default('manual'), // COMMS-AUTO-002
  sourceRef: z.string().uuid().nullish(), // Reference to source record (optional)
  createdAt: z.coerce.date(),
  createdBy: z.string().uuid().nullable(),
});

export type Activity = z.infer<typeof activitySchema>;

/**
 * Activity with user details joined.
 */
export const activityWithUserSchema = activitySchema.extend({
  user: z
    .object({
      id: z.string().uuid(),
      name: z.string().nullable(),
      email: z.string(),
    })
    .nullable(),
  /** Entity name/label for display (e.g., customer name, order number, opportunity title) */
  entityName: z.string().nullable().optional(),
});

export type ActivityWithUser = z.infer<typeof activityWithUserSchema>;

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

/**
 * Return type for useActivityFeed hook.
 * Uses UseInfiniteQueryResult from TanStack Query with InfiniteData wrapper.
 */
export type ActivityFeedResult = UseInfiniteQueryResult<InfiniteData<CursorPaginatedResponse<ActivityWithUser>>>;

/**
 * Return type for useEntityActivities hook.
 * Uses UseInfiniteQueryResult from TanStack Query with InfiniteData wrapper.
 */
export type EntityActivitiesResult = UseInfiniteQueryResult<InfiniteData<CursorPaginatedResponse<ActivityWithUser>>>;

// ============================================================================
// ACTIVITY FILTERS
// ============================================================================

export const activityFilterSchema = filterSchema.extend({
  entityType: activityEntityTypeSchema.optional(),
  entityId: z.string().uuid().optional(),
  action: activityActionSchema.optional(),
  createdBy: z.string().uuid().optional(),
  source: activitySourceSchema.optional(), // COMMS-AUTO-002: Filter by source
});

export type ActivityFilter = z.infer<typeof activityFilterSchema>;

// ============================================================================
// ACTIVITY LIST QUERY (Cursor pagination - activities are always large)
// ============================================================================

export const activityListQuerySchema = cursorPaginationSchema.merge(activityFilterSchema);

export type ActivityListQuery = z.infer<typeof activityListQuerySchema>;

// ============================================================================
// ACTIVITY PARAMS
// ============================================================================

export const activityParamsSchema = idParamSchema;
export type ActivityParams = z.infer<typeof activityParamsSchema>;

// ============================================================================
// ENTITY ACTIVITIES QUERY
// ============================================================================

/**
 * Query activities for a specific entity.
 */
export const entityActivitiesQuerySchema = z.object({
  entityType: activityEntityTypeSchema,
  entityId: z.string().uuid(),
  /** When entityType is 'order', include customer activities for this customer (Quick Log, etc.) */
  relatedCustomerId: z.string().uuid().optional(),
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type EntityActivitiesQuery = z.infer<typeof entityActivitiesQuerySchema>;

/**
 * Hook options for useUnifiedActivities.
 * Extends entity activities query params with client-side enabled flag.
 */
export interface UseUnifiedActivitiesOptions
  extends Pick<EntityActivitiesQuery, 'entityType' | 'entityId' | 'relatedCustomerId' | 'pageSize'> {
  enabled?: boolean;
}

// ============================================================================
// USER ACTIVITIES QUERY
// ============================================================================

/**
 * Query activities by a specific user.
 */
export const userActivitiesQuerySchema = z.object({
  userId: z.string().uuid(),
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type UserActivitiesQuery = z.infer<typeof userActivitiesQuerySchema>;

// ============================================================================
// ACTIVITY FEED QUERY (with all filters)
// ============================================================================

/**
 * Activity feed query with all filtering options.
 */
export const activityFeedQuerySchema = cursorPaginationSchema.extend({
  entityType: activityEntityTypeSchema.optional(),
  entityId: z.string().uuid().optional(),
  action: activityActionSchema.optional(),
  userId: z.string().uuid().optional(),
  source: activitySourceSchema.optional(), // COMMS-AUTO-002: Filter by source
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export type ActivityFeedQuery = z.infer<typeof activityFeedQuerySchema>;

// ============================================================================
// ACTIVITY STATISTICS
// ============================================================================

/**
 * Schema for activity statistics query.
 */
export const activityStatsQuerySchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  groupBy: z
    .enum(['action', 'entityType', 'userId', 'source', 'day', 'hour']) // COMMS-AUTO-002: Added source grouping
    .default('action'),
});

export type ActivityStatsQuery = z.infer<typeof activityStatsQuerySchema>;

// ============================================================================
// ACTIVITY FEED GROUPING TYPES
// ============================================================================

/**
 * Entity group within a date group.
 * Groups activities by entity type within a single date.
 */
export interface ActivityEntityGroup {
  entityType: ActivityEntityType;
  label: string;
  activities: ActivityWithUser[];
}

/**
 * Date group containing entity groups.
 * Groups activities by date, with nested entity grouping.
 */
export interface ActivityDateGroup {
  date: Date;
  label: string;
  entities: ActivityEntityGroup[];
}

/**
 * Activity statistics result.
 */
export const activityStatsResultSchema = z.object({
  stats: z.array(
    z.object({
      key: z.string(),
      count: z.number(),
      percentage: z.number().optional(),
    })
  ),
  total: z.number(),
  dateRange: z.object({
    from: z.coerce.date().nullable(),
    to: z.coerce.date().nullable(),
  }),
});

export type ActivityStatsResult = z.infer<typeof activityStatsResultSchema>;

/**
 * Top users leaderboard item.
 */
export const activityLeaderboardItemSchema = z.object({
  userId: z.string().uuid(),
  userName: z.string().nullable(),
  userEmail: z.string(),
  activityCount: z.number(),
  rank: z.number(),
});

export type ActivityLeaderboardItem = z.infer<typeof activityLeaderboardItemSchema>;

/**
 * Leaderboard entry type (alias for ActivityLeaderboardItem for component usage).
 * This matches the structure returned by getActivityLeaderboard server function.
 */
export type LeaderboardEntry = ActivityLeaderboardItem;

// ============================================================================
// ACTIVITY EXPORT
// ============================================================================

/**
 * Export format options.
 */
export const exportFormatValues = ['csv', 'json', 'pdf'] as const;
export const exportFormatSchema = z.enum(exportFormatValues);
export type ExportFormat = z.infer<typeof exportFormatSchema>;

/**
 * Schema for activity export request.
 */
export const activityExportRequestSchema = z.object({
  format: exportFormatSchema,
  entityType: activityEntityTypeSchema.optional(),
  entityId: z.string().uuid().optional(),
  action: activityActionSchema.optional(),
  userId: z.string().uuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export type ActivityExportRequest = z.infer<typeof activityExportRequestSchema>;

/**
 * Export job response.
 */
export const activityExportResponseSchema = z.object({
  jobId: z.string().uuid(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  downloadUrl: z.string().url().optional(),
  expiresAt: z.coerce.date().optional(),
});

export type ActivityExportResponse = z.infer<typeof activityExportResponseSchema>;

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for ActivityAction enum values.
 * Use this instead of type assertions to ensure runtime safety.
 */
export function isActivityAction(value: unknown): value is ActivityAction {
  return activityActionSchema.safeParse(value).success;
}

/**
 * Type guard for ActivityEntityType enum values.
 * Use this instead of type assertions to ensure runtime safety.
 */
export function isActivityEntityType(value: unknown): value is ActivityEntityType {
  return activityEntityTypeSchema.safeParse(value).success;
}

/**
 * Type guard for ActivityMetadata.
 * Validates that the value matches the ActivityMetadata schema.
 */
export function isActivityMetadata(value: unknown): value is ActivityMetadata {
  return activityMetadataSchema.safeParse(value).success;
}

/**
 * Activity Zod Schemas
 *
 * Validation schemas for audit trail operations.
 *
 * @see drizzle/schema/activities.ts for database schema
 * @see _Initiation/_prd/2-domains/activities/activities.prd.json for full spec
 */

import { z } from "zod";
import { filterSchema, idParamSchema } from "./patterns";
import { cursorPaginationSchema } from "@/lib/db/pagination";

// ============================================================================
// ENUMS (must match canonical-enums.json)
// ============================================================================

export const activityActionValues = [
  "created",
  "updated",
  "deleted",
  "viewed",
  "exported",
  "shared",
  "assigned",
  "commented",
  "email_sent",
  "email_opened",
  "email_clicked",
  "call_logged",
  "note_added",
] as const;

export const activityEntityTypeValues = [
  "customer",
  "contact",
  "order",
  "opportunity",
  "product",
  "inventory",
  "supplier",
  "warranty",
  "issue",
  "user",
  "email",
  "call",
] as const;

// Activity source values for tracking how activities were created (COMMS-AUTO-002)
export const activitySourceValues = [
  "manual",
  "email",
  "webhook",
  "system",
  "import",
] as const;

export const activityActionSchema = z.enum(activityActionValues);
export const activityEntityTypeSchema = z.enum(activityEntityTypeValues);
export const activitySourceSchema = z.enum(activitySourceValues);

export type ActivityAction = z.infer<typeof activityActionSchema>;
export type ActivityEntityType = z.infer<typeof activityEntityTypeSchema>;
export type ActivitySource = z.infer<typeof activitySourceSchema>;

// ============================================================================
// ACTIVITY CHANGES
// ============================================================================

export const activityChangesSchema = z.object({
  before: z.record(z.string(), z.unknown()).optional(),
  after: z.record(z.string(), z.unknown()).optional(),
  fields: z.array(z.string()).optional(),
});

export type ActivityChanges = z.infer<typeof activityChangesSchema>;

// ============================================================================
// ACTIVITY METADATA
// ============================================================================

/**
 * Metadata schema - free-form context data per action type.
 * ipAddress and userAgent are now separate columns in the database.
 */
export const activityMetadataSchema = z
  .object({
    requestId: z.string().optional(),
    reason: z.string().optional(),
  })
  .passthrough();

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
  source: activitySourceSchema.default("manual"), // COMMS-AUTO-002
  sourceRef: z.string().uuid().nullable(), // Reference to source record
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
});

export type ActivityWithUser = z.infer<typeof activityWithUserSchema>;

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

export const activityListQuerySchema =
  cursorPaginationSchema.merge(activityFilterSchema);

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
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type EntityActivitiesQuery = z.infer<typeof entityActivitiesQuerySchema>;

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
    .enum(["action", "entityType", "userId", "source", "day", "hour"]) // COMMS-AUTO-002: Added source grouping
    .default("action"),
});

export type ActivityStatsQuery = z.infer<typeof activityStatsQuerySchema>;

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

export type ActivityLeaderboardItem = z.infer<
  typeof activityLeaderboardItemSchema
>;

// ============================================================================
// ACTIVITY EXPORT
// ============================================================================

/**
 * Export format options.
 */
export const exportFormatValues = ["csv", "json", "pdf"] as const;
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
  status: z.enum(["pending", "processing", "completed", "failed"]),
  downloadUrl: z.string().url().optional(),
  expiresAt: z.coerce.date().optional(),
});

export type ActivityExportResponse = z.infer<
  typeof activityExportResponseSchema
>;

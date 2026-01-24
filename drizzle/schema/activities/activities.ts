/**
 * Activities Schema
 *
 * Central audit trail for all entity changes.
 * Table category: appendOnly (per column-patterns.json)
 *
 * Uses polymorphic references (entityType + entityId) for flexible
 * audit tracking across all entity types.
 *
 * NOTE: PostgreSQL partitioning by createdAt (monthly) should be set up
 * at the database level via migration, as Drizzle doesn't support native
 * table partitioning syntax. See migration 0010_activities_rls.sql.
 *
 * @see _Initiation/_prd/1-foundation/patterns/canonical-enums.json for enum values
 * @see _Initiation/_prd/2-domains/activities/activities.prd.json for full spec
 */

import { pgTable, uuid, text, jsonb, index, inet, pgPolicy } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { activityActionEnum, activityEntityTypeEnum, activitySourceEnum } from "../_shared/enums";
import { timestampColumns } from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { users } from "../users/users";

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Change details stored in JSONB for audit trail.
 * Captures before/after values for updates.
 */
export interface ActivityChanges {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  fields?: string[]; // List of changed field names
}

/**
 * Additional metadata for the activity.
 * Free-form context data per action type.
 *
 * Examples:
 * - For 'assigned': { assignedTo: userId, reason: 'Reassigned due to vacation' }
 * - For 'exported': { format: 'csv', recordCount: 500 }
 * - For 'shared': { sharedWith: [userId1, userId2], permission: 'read' }
 */
export interface ActivityMetadata {
  /** Request ID for correlation/tracing */
  requestId?: string;
  /** Reason for the action (if applicable) */
  reason?: string;
  /** Any additional context fields */
  [key: string]: string | number | boolean | string[] | null | undefined;
}

// ============================================================================
// ACTIVITIES TABLE
// ============================================================================

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // User who performed the action (nullable for system actions)
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }), // References users.id - the actor

    // Polymorphic reference to the entity
    entityType: activityEntityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),

    // Action performed
    action: activityActionEnum("action").notNull(),

    // Change details: { fieldName: { old: previousValue, new: newValue } }
    changes: jsonb("changes").$type<ActivityChanges>(),

    // Additional metadata (free-form context per action type)
    metadata: jsonb("metadata").$type<ActivityMetadata>().default({}),

    // Request context for audit trail
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),

    // Human-readable description
    description: text("description"),

    // Source tracking: how the activity was created (COMMS-AUTO-002)
    source: activitySourceEnum("source").notNull().default("manual"),
    sourceRef: uuid("source_ref"), // Reference to source record (email_id, webhook_id, etc.)

    // Timestamp only (activities are append-only, no updates)
    createdAt: timestampColumns.createdAt,

    // Creator reference (same as userId in most cases, but kept for pattern consistency)
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }), // References users.id
  },
  (table) => ({
    // Primary query pattern: activities for a specific entity
    entityIdx: index("idx_activities_org_entity").on(
      table.organizationId,
      table.entityType,
      table.entityId
    ),

    // Activity feed chronological listing (org + createdAt DESC)
    orgCreatedIdx: index("idx_activities_org_created").on(
      table.organizationId,
      table.createdAt.desc()
    ),

    // User-specific activity history (userId + createdAt DESC)
    userIdx: index("idx_activities_user").on(
      table.userId,
      table.createdAt.desc()
    ),

    // Filter by action type (e.g., all 'deleted' actions)
    actionIdx: index("idx_activities_action").on(
      table.organizationId,
      table.action,
      table.createdAt.desc()
    ),

    // Filter by entity type (e.g., all 'customer' activities)
    entityTypeIdx: index("idx_activities_entity_type").on(
      table.organizationId,
      table.entityType,
      table.createdAt.desc()
    ),

    // Filter by source (e.g., all 'email' activities for analytics)
    sourceIdx: index("idx_activities_source").on(
      table.organizationId,
      table.source,
      table.createdAt.desc()
    ),

    // RLS Policies (append-only)
    selectPolicy: pgPolicy("activities_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
    insertPolicy: pgPolicy("activities_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;

// ============================================================================
// ACTIVITY HELPER TYPES
// ============================================================================

/**
 * Activity action values for type-safe usage.
 */
export const activityActions = [
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

export type ActivityAction = (typeof activityActions)[number];

/**
 * Activity entity type values for type-safe usage.
 */
export const activityEntityTypes = [
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

export type ActivityEntityType = (typeof activityEntityTypes)[number];

/**
 * Activity source values for type-safe usage.
 * Tracks how the activity was created.
 */
export const activitySources = [
  "manual",
  "email",
  "webhook",
  "system",
  "import",
] as const;

export type ActivitySource = (typeof activitySources)[number];

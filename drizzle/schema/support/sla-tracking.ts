/**
 * SLA Tracking Schema
 *
 * Tracks SLA state for individual entities (issues, warranty claims, jobs).
 * One row per tracked entity with timing, pause state, and breach status.
 *
 * @see _Initiation/_prd/_meta/remediation-sla-engine.md
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  bigint,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { timestampColumns } from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { slaDomainEnum, slaTrackingStatusEnum } from "../_shared/enums";
import { slaConfigurations } from "./sla-configurations";

// ============================================================================
// SLA TRACKING TABLE
// ============================================================================

export const slaTracking = pgTable(
  "sla_tracking",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // What we're tracking
    domain: slaDomainEnum("domain").notNull(),
    entityType: text("entity_type").notNull(), // 'issue', 'warranty_claim', 'job_assignment'
    entityId: uuid("entity_id").notNull(),

    // Which SLA config applies
    slaConfigurationId: uuid("sla_configuration_id").notNull(),

    // Timing - when SLA tracking started
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),

    // Response tracking
    responseDueAt: timestamp("response_due_at", { withTimezone: true }),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    responseBreached: boolean("response_breached").notNull().default(false),

    // Resolution tracking
    resolutionDueAt: timestamp("resolution_due_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionBreached: boolean("resolution_breached").notNull().default(false),

    // Elapsed time tracking (seconds, excluding pauses) - set on response/resolution
    responseTimeSeconds: bigint("response_time_seconds", { mode: "number" }),
    resolutionTimeSeconds: bigint("resolution_time_seconds", { mode: "number" }),

    // Pause/resume state
    isPaused: boolean("is_paused").notNull().default(false),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    pauseReason: text("pause_reason"),
    // Accumulated pause time in seconds (across multiple pause/resume cycles)
    totalPausedDurationSeconds: bigint("total_paused_duration_seconds", {
      mode: "number",
    })
      .notNull()
      .default(0),

    // Current status
    status: slaTrackingStatusEnum("status").notNull().default("active"),

    ...timestampColumns,
  },
  (table) => [
    // Unique tracking per entity
    uniqueIndex("idx_sla_tracking_entity").on(
      table.domain,
      table.entityType,
      table.entityId
    ),
    check(
      "sla_tracking_entity_type_check",
      sql`${table.entityType} IN ('issue','warranty_claim','job_assignment')`
    ),
    // Find active SLAs approaching due dates
    index("idx_sla_tracking_due_dates").on(
      table.organizationId,
      table.responseDueAt,
      table.resolutionDueAt
    ),
    // Filter by status
    index("idx_sla_tracking_status").on(table.organizationId, table.status),
    // By configuration
    index("idx_sla_tracking_config").on(table.slaConfigurationId),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const slaTrackingRelations = relations(slaTracking, ({ one }) => ({
  organization: one(organizations, {
    fields: [slaTracking.organizationId],
    references: [organizations.id],
  }),
  slaConfiguration: one(slaConfigurations, {
    fields: [slaTracking.slaConfigurationId],
    references: [slaConfigurations.id],
  }),
}));

// ============================================================================
// TYPES
// ============================================================================

export type SlaTracking = typeof slaTracking.$inferSelect;
export type NewSlaTracking = typeof slaTracking.$inferInsert;

/**
 * SLA Events Schema
 *
 * Audit log for SLA state changes (started, paused, resumed, breached).
 * Provides full traceability of SLA lifecycle.
 *
 * @see _Initiation/_prd/_meta/remediation-sla-engine.md
 */

import {
  pgTable,
  uuid,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "../settings/organizations";
import { users } from "../users";
import { slaEventTypeEnum } from "../_shared/enums";
import { slaTracking } from "./sla-tracking";

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Event data for different event types
 */
export interface SlaEventData {
  // For 'paused' events
  pauseReason?: string;

  // For warning events
  thresholdPercent?: number;
  timeRemainingSeconds?: number;

  // For breach events
  dueAt?: string; // ISO timestamp
  breachedAt?: string; // ISO timestamp
  overdueSeconds?: number;

  // For config_changed events
  previousConfigId?: string;
  newConfigId?: string;

  // For started events
  responseDueAt?: string | null;
  resolutionDueAt?: string | null;

  // For responded events
  responseTimeSeconds?: number;
  wasBreached?: boolean;

  // For resolved events
  resolutionTimeSeconds?: number;

  // For resumed events
  pauseDurationSeconds?: number;
  totalPausedDurationSeconds?: number;
}

// ============================================================================
// SLA EVENTS TABLE
// ============================================================================

export const slaEvents = pgTable(
  "sla_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Which SLA tracking record this event belongs to
    slaTrackingId: uuid("sla_tracking_id").notNull(),

    // Event type
    eventType: slaEventTypeEnum("event_type").notNull(),

    // Additional context (e.g., pause reason, warning threshold)
    eventData: jsonb("event_data").$type<SlaEventData>(),

    // Who triggered this event (NULL for system-triggered events)
    triggeredByUserId: uuid("triggered_by_user_id"),

    // When the event occurred
    triggeredAt: timestamp("triggered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Find events for a tracking record
    index("idx_sla_events_tracking").on(
      table.slaTrackingId,
      table.triggeredAt
    ),
    // Find events by org and type
    index("idx_sla_events_org_type").on(
      table.organizationId,
      table.eventType,
      table.triggeredAt
    ),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const slaEventsRelations = relations(slaEvents, ({ one }) => ({
  organization: one(organizations, {
    fields: [slaEvents.organizationId],
    references: [organizations.id],
  }),
  slaTracking: one(slaTracking, {
    fields: [slaEvents.slaTrackingId],
    references: [slaTracking.id],
  }),
  triggeredByUser: one(users, {
    fields: [slaEvents.triggeredByUserId],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPES
// ============================================================================

export type SlaEvent = typeof slaEvents.$inferSelect;
export type NewSlaEvent = typeof slaEvents.$inferInsert;

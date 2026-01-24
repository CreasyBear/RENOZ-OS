/**
 * Scheduled Calls Schema
 *
 * Table for storing calls scheduled for future follow-up.
 * Supports reminders, call purpose tracking, and outcome logging.
 *
 * @see DOM-COMMS-004a
 * @see _Initiation/_prd/1-foundation/patterns/canonical-enums.json for enum values
 */

import {
  pgTable,
  uuid,
  text,
  index,
  timestamp,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { scheduledCallStatusEnum } from "../_shared/enums";
import { timestampColumns } from "../_shared/patterns";
import { users } from "../users/users";
import { customers } from "../customers/customers";
import { organizations } from "../settings/organizations";

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Call purpose types for scheduled calls
 */
export type ScheduledCallPurpose =
  | "quote_follow_up"
  | "installation"
  | "technical_support"
  | "sales"
  | "general"
  | "other";

/**
 * Status type for scheduled calls
 */
export type ScheduledCallStatus = "pending" | "completed" | "cancelled" | "rescheduled";

// ============================================================================
// SCHEDULED CALLS TABLE
// ============================================================================

export const scheduledCalls = pgTable(
  "scheduled_calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Who the call is with
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),

    // Who is assigned to make the call
    assigneeId: uuid("assignee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Call scheduling
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    reminderAt: timestamp("reminder_at", { withTimezone: true }),

    // Call details
    purpose: text("purpose").$type<ScheduledCallPurpose>().notNull().default("general"),
    notes: text("notes"),

    // Status tracking
    status: scheduledCallStatusEnum("status").notNull().default("pending"),

    // Outcome tracking (filled when call is completed)
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    outcome: text("outcome"),
    outcomeNotes: text("outcome_notes"),

    // If rescheduled, track the new call
    rescheduledToId: uuid("rescheduled_to_id"),

    // Timestamps
    ...timestampColumns,
  },
  (table) => ({
    // Index for finding calls by assignee
    assigneeIdx: index("idx_scheduled_calls_assignee").on(table.assigneeId),
    // Index for finding upcoming calls
    scheduledAtIdx: index("idx_scheduled_calls_scheduled_at").on(table.scheduledAt),
    // Index for status filtering
    statusIdx: index("idx_scheduled_calls_status").on(table.status),
    // Composite index for assignee + status queries
    assigneeStatusIdx: index("idx_scheduled_calls_assignee_status").on(
      table.assigneeId,
      table.status
    ),
    // Index for customer lookup
    customerIdx: index("idx_scheduled_calls_customer").on(table.customerId),
    // Index for organization + status queries
    orgStatusIdx: index("idx_scheduled_calls_org_status").on(
      table.organizationId,
      table.status
    ),

    // RLS Policies
    selectPolicy: pgPolicy("scheduled_calls_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
    insertPolicy: pgPolicy("scheduled_calls_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
    updatePolicy: pgPolicy("scheduled_calls_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
      withCheck: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
    deletePolicy: pgPolicy("scheduled_calls_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const scheduledCallsRelations = relations(scheduledCalls, ({ one }) => ({
  customer: one(customers, {
    fields: [scheduledCalls.customerId],
    references: [customers.id],
  }),
  assignee: one(users, {
    fields: [scheduledCalls.assigneeId],
    references: [users.id],
  }),
  rescheduledTo: one(scheduledCalls, {
    fields: [scheduledCalls.rescheduledToId],
    references: [scheduledCalls.id],
  }),
}));

// ============================================================================
// TYPES
// ============================================================================

export type ScheduledCall = typeof scheduledCalls.$inferSelect;
export type NewScheduledCall = typeof scheduledCalls.$inferInsert;

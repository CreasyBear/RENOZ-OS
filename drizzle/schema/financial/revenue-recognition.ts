/**
 * Revenue Recognition Schema
 *
 * Tables for tracking revenue recognition and deferred revenue
 * for battery equipment sales. Supports milestone-based recognition
 * for commercial projects with Xero sync state tracking.
 *
 * Recognition types:
 * - on_delivery: Residential standard - recognize full amount on delivery
 * - milestone: Commercial with 50% deposit - recognize on milestones
 * - time_based: Spread recognition over time period
 *
 * Milestones for commercial projects:
 * - Battery delivery
 * - Installation complete
 * - System commissioned
 *
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json for DOM-FIN-008a
 */

import {
  pgTable,
  uuid,
  text,
  date,
  integer,
  index,
  timestamp,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  recognitionTypeEnum,
  recognitionStateEnum,
  deferredRevenueStatusEnum,
} from "../_shared/enums";
import {
  timestampColumns,
  currencyColumn,
} from "../_shared/patterns";
import { orders } from "../orders/orders";
import { organizations } from "../settings/organizations";

// ============================================================================
// REVENUE RECOGNITION TABLE
// ============================================================================

/**
 * Tracks individual revenue recognition events.
 *
 * For milestone-based recognition:
 * - Each milestone creates a separate recognition record
 * - State machine tracks Xero sync: PENDING -> RECOGNIZED -> SYNCING -> SYNCED
 * - After 5 sync failures, transitions to MANUAL_OVERRIDE
 *
 * For on_delivery recognition:
 * - Single record created when order is delivered
 * - Full order amount recognized at once
 */
export const revenueRecognition = pgTable(
  "revenue_recognition",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Order reference
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),

    // Recognition details
    recognitionType: recognitionTypeEnum("recognition_type").notNull(),
    milestoneName: text("milestone_name"), // e.g., "Battery delivery", "Installation complete"
    recognizedAmount: currencyColumn("recognized_amount"), // AUD cents
    recognitionDate: date("recognition_date").notNull(),

    // Xero sync state machine
    state: recognitionStateEnum("state").notNull().default("pending"),
    xeroSyncAttempts: integer("xero_sync_attempts").notNull().default(0),
    xeroSyncError: text("xero_sync_error"),
    lastXeroSyncAt: timestamp("last_xero_sync_at", { withTimezone: true }),

    // Xero references
    xeroJournalId: text("xero_journal_id"), // Xero manual journal ID after sync

    // Notes
    notes: text("notes"),

    // Tracking
    ...timestampColumns,
  },
  (table) => ({
    // Query by order
    orderIdx: index("idx_revenue_recognition_order").on(table.orderId),

    // Query by state for failed syncs and manual override
    stateIdx: index("idx_revenue_recognition_state").on(
      table.organizationId,
      table.state
    ),

    // Query by recognition date for reports
    dateIdx: index("idx_revenue_recognition_date").on(
      table.organizationId,
      table.recognitionDate
    ),

    // Query failed syncs for retry
    syncFailedIdx: index("idx_revenue_recognition_sync_failed").on(
      table.state,
      table.xeroSyncAttempts
    ),

    // Standard CRUD RLS policies for org isolation
    selectPolicy: pgPolicy("revenue_recognition_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("revenue_recognition_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("revenue_recognition_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("revenue_recognition_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// DEFERRED REVENUE TABLE
// ============================================================================

/**
 * Tracks deferred revenue for advance payments.
 *
 * Used for:
 * - 50% commercial deposits before delivery
 * - Prepaid service contracts
 * - Advance payments for scheduled installations
 *
 * Amounts are released as revenue recognition events occur.
 */
export const deferredRevenue = pgTable(
  "deferred_revenue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Order reference
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),

    // Deferred amount tracking
    originalAmount: currencyColumn("original_amount"), // Initial deferred amount (AUD cents)
    remainingAmount: currencyColumn("remaining_amount"), // Current deferred balance
    recognizedAmount: currencyColumn("recognized_amount"), // Amount recognized so far

    // Period tracking
    deferralDate: date("deferral_date").notNull(), // When payment was deferred
    expectedRecognitionDate: date("expected_recognition_date"), // When expected to recognize

    // Status
    status: deferredRevenueStatusEnum("status").notNull().default("deferred"),

    // Description
    reason: text("reason"), // e.g., "50% deposit for commercial installation"

    // Tracking
    ...timestampColumns,
  },
  (table) => ({
    // Query by order
    orderIdx: index("idx_deferred_revenue_order").on(table.orderId),

    // Query by status for reports
    statusIdx: index("idx_deferred_revenue_status").on(
      table.organizationId,
      table.status
    ),

    // Query by date range for period reports
    dateIdx: index("idx_deferred_revenue_date").on(
      table.organizationId,
      table.deferralDate
    ),

    // Standard CRUD RLS policies for org isolation
    selectPolicy: pgPolicy("deferred_revenue_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("deferred_revenue_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("deferred_revenue_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("deferred_revenue_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const revenueRecognitionRelations = relations(
  revenueRecognition,
  ({ one }) => ({
    order: one(orders, {
      fields: [revenueRecognition.orderId],
      references: [orders.id],
    }),
  })
);

export const deferredRevenueRelations = relations(
  deferredRevenue,
  ({ one }) => ({
    order: one(orders, {
      fields: [deferredRevenue.orderId],
      references: [orders.id],
    }),
  })
);

// ============================================================================
// TYPES
// ============================================================================

export type RevenueRecognition = typeof revenueRecognition.$inferSelect;
export type NewRevenueRecognition = typeof revenueRecognition.$inferInsert;

export type DeferredRevenue = typeof deferredRevenue.$inferSelect;
export type NewDeferredRevenue = typeof deferredRevenue.$inferInsert;

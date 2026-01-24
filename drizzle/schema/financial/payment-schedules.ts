/**
 * Payment Schedules Schema
 *
 * Payment plans and installment tracking for battery equipment orders.
 * Table category: financial (per Financial Domain PRD)
 *
 * Supports:
 * - 50/50 split (commercial standard for $50K+ orders): 50% deposit, 50% on completion
 * - Thirds split: 33/33/34
 * - Monthly payments: configurable schedule
 * - Custom: user-defined installments
 *
 * Default payment terms: 30 days from invoice date
 *
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json for story DOM-FIN-002a
 */

import {
  pgTable,
  uuid,
  text,
  date,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { paymentPlanTypeEnum, installmentStatusEnum } from "../_shared/enums";
import {
  timestampColumns,
  auditColumns,
  currencyColumn,
} from "../_shared/patterns";
import { orders } from "../orders/orders";
import { organizations } from "../settings/organizations";

// ============================================================================
// PAYMENT SCHEDULES TABLE
// ============================================================================

/**
 * Payment schedule installments for orders.
 *
 * Each row represents one installment in a payment plan.
 * Amount stored as numeric(12,2) in AUD (e.g., 25000.00 for $25,000 AUD).
 *
 * Example 50/50 commercial plan for $100,000 order:
 * - Installment 1: $50,000 due on order date (deposit)
 * - Installment 2: $50,000 due 30 days after completion
 *
 * Status workflow: pending -> due -> paid (or overdue if past due date)
 */
export const paymentSchedules = pgTable(
  "payment_schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Parent order reference
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),

    // Plan type
    planType: paymentPlanTypeEnum("plan_type").notNull().default("fifty_fifty"),

    // Installment details
    installmentNo: integer("installment_no").notNull(),
    description: text("description"), // e.g., "Deposit", "Final payment", "Installment 3 of 12"

    // Due date (default: 30 days from order date for first installment)
    dueDate: date("due_date").notNull(),

    // Amount for this installment in AUD (numeric 12,2)
    amount: currencyColumn("amount"),

    // Tax breakdown (10% GST)
    gstAmount: currencyColumn("gst_amount"),

    // Status tracking
    status: installmentStatusEnum("status").notNull().default("pending"),

    // Payment tracking
    paidAmount: currencyColumn("paid_amount"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    paymentReference: text("payment_reference"), // e.g., bank reference, Xero payment ID

    // Notes
    notes: text("notes"),

    // Tracking
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    // Multi-tenant queries
    orgOrderIdx: index("idx_payment_schedules_org_order").on(
      table.organizationId,
      table.orderId
    ),
    orgStatusIdx: index("idx_payment_schedules_org_status").on(
      table.organizationId,
      table.status
    ),
    orgDueDateIdx: index("idx_payment_schedules_org_due").on(
      table.organizationId,
      table.dueDate
    ),

    // Common queries
    orderIdx: index("idx_payment_schedules_order").on(table.orderId),
    statusDueDateIdx: index("idx_payment_schedules_status_due").on(
      table.status,
      table.dueDate
    ),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const paymentSchedulesRelations = relations(
  paymentSchedules,
  ({ one }) => ({
    order: one(orders, {
      fields: [paymentSchedules.orderId],
      references: [orders.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type PaymentSchedule = typeof paymentSchedules.$inferSelect;
export type NewPaymentSchedule = typeof paymentSchedules.$inferInsert;

/**
 * Order Payments Schema
 *
 * Records individual payment transactions against orders.
 * Supports partial payments, multiple payment methods, and refund tracking.
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json
 */

import {
  pgTable,
  uuid,
  text,
  date,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { paymentMethodEnum } from "../_shared/enums";
import {
  timestampColumns,
  auditColumns,
  softDeleteColumn,
  currencyColumn,
  standardRlsPolicies,
} from "../_shared/patterns";
import { orders } from "./orders";
import { users } from "../users/users";
import { organizations } from "../settings/organizations";

// ============================================================================
// ORDER PAYMENTS TABLE
// ============================================================================

/**
 * Individual payment transactions against orders.
 *
 * Each row represents one payment event (payment or refund).
 * Amount stored as numeric(12,2) in AUD.
 *
 * Status is derived from order.paymentStatus (pending, partial, paid, refunded, overdue)
 * This table stores the transaction history that feeds into those calculations.
 */
export const orderPayments = pgTable(
  "order_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Parent order reference
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),

    // Payment details
    amount: currencyColumn("amount"),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    paymentDate: date("payment_date").notNull(),

    // Reference information
    reference: text("reference"), // Bank reference, transaction ID, cheque number
    notes: text("notes"),

    // Refund tracking
    isRefund: boolean("is_refund").notNull().default(false),
    relatedPaymentId: uuid("related_payment_id"), // Self-reference for refunds

    // Recording user
    recordedBy: uuid("recorded_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    // Audit
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumn,
  },
  (table) => ({
    // Multi-tenant queries
    orgOrderIdx: index("idx_order_payments_org_order").on(
      table.organizationId,
      table.orderId
    ),
    orgDateIdx: index("idx_order_payments_org_date").on(
      table.organizationId,
      table.paymentDate
    ),
    orgMethodIdx: index("idx_order_payments_org_method").on(
      table.organizationId,
      table.paymentMethod
    ),

    // Common queries
    orderIdx: index("idx_order_payments_order").on(table.orderId),
    paymentDateIdx: index("idx_order_payments_date").on(table.paymentDate),

    // Standard CRUD RLS policies for org isolation
    ...standardRlsPolicies("order_payments"),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const orderPaymentsRelations = relations(orderPayments, ({ one }) => ({
  order: one(orders, {
    fields: [orderPayments.orderId],
    references: [orders.id],
  }),
  recordedByUser: one(users, {
    fields: [orderPayments.recordedBy],
    references: [users.id],
  }),
  relatedPayment: one(orderPayments, {
    fields: [orderPayments.relatedPaymentId],
    references: [orderPayments.id],
    relationName: "refundRelation",
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type OrderPayment = typeof orderPayments.$inferSelect;
export type NewOrderPayment = typeof orderPayments.$inferInsert;

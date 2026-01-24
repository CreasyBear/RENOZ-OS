/**
 * Credit Notes Schema
 *
 * Credit notes for battery equipment returns, adjustments, and refunds.
 * Table category: financial (per Financial Domain PRD)
 *
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json for story DOM-FIN-001a
 */

import {
  pgTable,
  uuid,
  text,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { creditNoteStatusEnum } from "../_shared/enums";
import {
  timestampColumns,
  auditColumns,
  softDeleteColumn,
  currencyColumn,
} from "../_shared/patterns";
import { orders } from "../orders/orders";
import { customers } from "../customers/customers";
import { organizations } from "../settings/organizations";

// ============================================================================
// CREDIT NOTES TABLE
// ============================================================================

/**
 * Credit notes for refunds and adjustments.
 *
 * Amount stored as numeric(12,2) in AUD (e.g., 1500.00 for $1,500 AUD).
 * Follows existing codebase pattern using currencyColumn helper.
 *
 * Reason examples:
 * - 'Battery equipment return'
 * - 'Commercial installation discount'
 * - 'Damaged unit credit'
 *
 * Status workflow: draft -> issued -> applied (or voided at any point)
 */
export const creditNotes = pgTable(
  "credit_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Credit note identification
    creditNoteNumber: text("credit_note_number").notNull(),

    // Related invoice/order (nullable - can be standalone credit)
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),

    // Customer reference
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),

    // Amount in AUD (numeric 12,2)
    amount: currencyColumn("amount"),

    // Tax breakdown (10% GST standard)
    gstAmount: currencyColumn("gst_amount"),

    // Reason for credit note
    reason: text("reason").notNull(),

    // Status tracking
    status: creditNoteStatusEnum("status").notNull().default("draft"),

    // Application tracking (when applied to invoice)
    appliedToOrderId: uuid("applied_to_order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    appliedAt: timestampColumns.createdAt,

    // Internal notes
    internalNotes: text("internal_notes"),

    // Tracking
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumn,
  },
  (table) => ({
    // Multi-tenant queries
    orgStatusIdx: index("idx_credit_notes_org_status").on(
      table.organizationId,
      table.status
    ),
    orgCustomerIdx: index("idx_credit_notes_org_customer").on(
      table.organizationId,
      table.customerId
    ),

    // Common queries
    customerIdx: index("idx_credit_notes_customer").on(table.customerId),
    orderIdx: index("idx_credit_notes_order").on(table.orderId),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const creditNotesRelations = relations(creditNotes, ({ one }) => ({
  order: one(orders, {
    fields: [creditNotes.orderId],
    references: [orders.id],
    relationName: "creditNoteSourceOrder",
  }),
  appliedToOrder: one(orders, {
    fields: [creditNotes.appliedToOrderId],
    references: [orders.id],
    relationName: "creditNoteAppliedOrder",
  }),
  customer: one(customers, {
    fields: [creditNotes.customerId],
    references: [customers.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreditNote = typeof creditNotes.$inferSelect;
export type NewCreditNote = typeof creditNotes.$inferInsert;

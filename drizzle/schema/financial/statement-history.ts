/**
 * Statement History Schema
 *
 * Tracks generated customer statements for battery equipment sales.
 * Table category: financial (per Financial Domain PRD)
 *
 * Each row represents a generated statement for a customer covering a date range.
 * Statements show:
 * - Opening balance
 * - Transactions (invoices, payments, credit notes)
 * - Closing balance
 * - GST breakdown
 * - Payment terms reminder (30 days)
 *
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json for story DOM-FIN-004a
 */

import {
  pgTable,
  uuid,
  text,
  date,
  timestamp,
  index,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  timestampColumns,
  auditColumns,
  softDeleteColumn,
  currencyColumn,
  standardRlsPolicies,
} from "../_shared/patterns";
import { customers } from "../customers/customers";
import { organizations } from "../settings/organizations";

// ============================================================================
// STATEMENT HISTORY TABLE
// ============================================================================

/**
 * Historical record of generated customer statements.
 *
 * Balance amounts stored as numeric(12,2) in AUD.
 *
 * Example statement:
 * - Customer: ABC Solar Pty Ltd
 * - Period: 2026-01-01 to 2026-01-31
 * - Opening Balance: $45,000.00 AUD
 * - Closing Balance: $67,500.00 AUD
 * - PDF: /statements/2026/01/abc-solar-january-2026.pdf
 */
export const statementHistory = pgTable(
  "statement_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Customer reference
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),

    // Statement period
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),

    // Balance summary (AUD numeric 12,2)
    openingBalance: currencyColumn("opening_balance"),
    closingBalance: currencyColumn("closing_balance"),

    // Transaction counts for quick reference
    invoiceCount: integer("invoice_count").notNull().default(0),
    paymentCount: integer("payment_count").notNull().default(0),
    creditNoteCount: integer("credit_note_count").notNull().default(0),

    // Total amounts for period
    totalInvoiced: currencyColumn("total_invoiced"),
    totalPayments: currencyColumn("total_payments"),
    totalCredits: currencyColumn("total_credits"),

    // GST summary
    totalGst: currencyColumn("total_gst"),

    // Generated PDF path (relative to storage root)
    pdfPath: text("pdf_path"),

    // Email tracking
    sentAt: timestamp("sent_at", { withTimezone: true }),
    sentToEmail: text("sent_to_email"),

    // Generation notes
    notes: text("notes"),

    // Tracking
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumn,
  },
  (table) => ({
    // Multi-tenant queries
    orgCustomerIdx: index("idx_statement_history_org_customer").on(
      table.organizationId,
      table.customerId
    ),
    orgDateIdx: index("idx_statement_history_org_date").on(
      table.organizationId,
      table.endDate
    ),
    orgCreatedIdx: index("idx_statement_history_org_created").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),

    // Common queries
    customerIdx: index("idx_statement_history_customer").on(table.customerId),
    customerDateIdx: index("idx_statement_history_customer_date").on(
      table.customerId,
      table.endDate
    ),

    // Standard CRUD RLS policies for org isolation
    ...standardRlsPolicies("statement_history"),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const statementHistoryRelations = relations(
  statementHistory,
  ({ one }) => ({
    customer: one(customers, {
      fields: [statementHistory.customerId],
      references: [customers.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type StatementHistory = typeof statementHistory.$inferSelect;
export type NewStatementHistory = typeof statementHistory.$inferInsert;

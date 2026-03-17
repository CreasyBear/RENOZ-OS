import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "../settings/organizations";
import { orders } from "../orders/orders";
import { timestampColumns, standardRlsPolicies } from "../_shared/patterns";

export const xeroPaymentEvents = pgTable(
  "xero_payment_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    dedupeKey: text("dedupe_key").notNull(),
    xeroInvoiceId: text("xero_invoice_id").notNull(),
    paymentId: text("payment_id"),
    amount: text("amount").notNull(),
    paymentDate: text("payment_date").notNull(),
    reference: text("reference"),
    resultState: text("result_state").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestampColumns,
  },
  (table) => ({
    orgDedupeUnique: uniqueIndex("idx_xero_payment_events_org_dedupe").on(
      table.organizationId,
      table.dedupeKey
    ),
    orgInvoiceIdx: index("idx_xero_payment_events_org_invoice").on(
      table.organizationId,
      table.xeroInvoiceId
    ),
    orgProcessedIdx: index("idx_xero_payment_events_org_processed").on(
      table.organizationId,
      table.processedAt
    ),
    ...standardRlsPolicies("xero_payment_events"),
  })
);

export const xeroPaymentEventsRelations = relations(xeroPaymentEvents, ({ one }) => ({
  organization: one(organizations, {
    fields: [xeroPaymentEvents.organizationId],
    references: [organizations.id],
  }),
  order: one(orders, {
    fields: [xeroPaymentEvents.orderId],
    references: [orders.id],
  }),
}));

export type XeroPaymentEvent = typeof xeroPaymentEvents.$inferSelect;
export type NewXeroPaymentEvent = typeof xeroPaymentEvents.$inferInsert;

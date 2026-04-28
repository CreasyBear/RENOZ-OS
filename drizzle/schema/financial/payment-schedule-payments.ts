/**
 * Links payment-plan installments to real order payment ledger rows.
 */

import { relations } from "drizzle-orm";
import { index, pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import {
  auditColumns,
  currencyColumn,
  softDeleteColumn,
  standardRlsPolicies,
  timestampColumns,
} from "../_shared/patterns";
import { orderPayments } from "../orders/order-payments";
import { organizations } from "../settings/organizations";
import { paymentSchedules } from "./payment-schedules";

export const paymentSchedulePayments = pgTable(
  "payment_schedule_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    paymentScheduleId: uuid("payment_schedule_id")
      .notNull()
      .references(() => paymentSchedules.id, { onDelete: "cascade" }),
    orderPaymentId: uuid("order_payment_id")
      .notNull()
      .references(() => orderPayments.id, { onDelete: "cascade" }),
    amount: currencyColumn("amount"),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumn,
  },
  (table) => ({
    orgScheduleIdx: index("idx_payment_schedule_payments_org_schedule").on(
      table.organizationId,
      table.paymentScheduleId
    ),
    orgPaymentIdx: index("idx_payment_schedule_payments_org_payment").on(
      table.organizationId,
      table.orderPaymentId
    ),
    schedulePaymentUnique: uniqueIndex(
      "idx_payment_schedule_payments_schedule_payment_unique"
    ).on(table.paymentScheduleId, table.orderPaymentId),
    ...standardRlsPolicies("payment_schedule_payments"),
  })
);

export const paymentSchedulePaymentsRelations = relations(
  paymentSchedulePayments,
  ({ one }) => ({
    paymentSchedule: one(paymentSchedules, {
      fields: [paymentSchedulePayments.paymentScheduleId],
      references: [paymentSchedules.id],
    }),
    orderPayment: one(orderPayments, {
      fields: [paymentSchedulePayments.orderPaymentId],
      references: [orderPayments.id],
    }),
  })
);

export type PaymentSchedulePayment = typeof paymentSchedulePayments.$inferSelect;
export type NewPaymentSchedulePayment = typeof paymentSchedulePayments.$inferInsert;

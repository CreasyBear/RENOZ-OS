/**
 * Targets Schema
 *
 * KPI targets for reporting and dashboard goals.
 */

import { pgTable, uuid, text, date, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { timestampColumns, numericCasted } from "../_shared/patterns";
import { organizations } from "../settings/organizations";

export const targets = pgTable(
  "targets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    metricKey: text("metric_key").notNull(),

    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),

    targetValue: numericCasted("target_value", { precision: 12, scale: 2 })
      .notNull()
      .default(0),

    ...timestampColumns,
  },
  (table) => ({
    orgMetricIdx: index("idx_targets_org_metric").on(
      table.organizationId,
      table.metricKey
    ),
    orgDateIdx: index("idx_targets_org_date").on(
      table.organizationId,
      table.startDate,
      table.endDate
    ),
  })
);

export const targetsRelations = relations(targets, () => ({}));

export type Target = typeof targets.$inferSelect;
export type NewTarget = typeof targets.$inferInsert;

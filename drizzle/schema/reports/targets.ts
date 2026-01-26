/**
 * Targets Schema
 *
 * KPI targets for reporting and dashboard goals.
 */

import { pgTable, pgPolicy, uuid, text, date, index } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
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
    // RLS Policies
    selectPolicy: pgPolicy("targets_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("targets_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("targets_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("targets_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

export const targetsRelations = relations(targets, () => ({}));

export type Target = typeof targets.$inferSelect;
export type NewTarget = typeof targets.$inferInsert;

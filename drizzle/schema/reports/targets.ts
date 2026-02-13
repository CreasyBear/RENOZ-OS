/**
 * Targets Schema
 *
 * KPI targets for reporting and dashboard goals.
 * Canonical owner: reports domain.
 */

import { pgTable, uuid, text, date, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  timestampColumns,
  auditColumns,
  numericCasted,
  standardRlsPolicies,
} from "../_shared/patterns";
import { targetMetricEnum, targetPeriodEnum } from "../_shared/enums";
import { organizations } from "../settings/organizations";
import { users } from "../users/users";

export const targets = pgTable(
  "targets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    metric: targetMetricEnum("metric").notNull(),
    period: targetPeriodEnum("period").notNull(),

    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),

    targetValue: numericCasted("target_value", { precision: 12, scale: 2 })
      .notNull()
      .default(0),

    description: text("description"),

    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    // Performance indexes
    orgMetricIdx: index("idx_targets_org_metric").on(
      table.organizationId,
      table.metric
    ),
    orgDateIdx: index("idx_targets_org_date").on(
      table.organizationId,
      table.startDate,
      table.endDate
    ),
    orgPeriodIdx: index("idx_targets_org_period").on(
      table.organizationId,
      table.period
    ),
    // Unique constraint: one target per metric/period/date range per org
    uniqueMetricPeriod: uniqueIndex("idx_targets_unique_metric_period").on(
      table.organizationId,
      table.metric,
      table.period,
      table.startDate
    ),
    // RLS Policies
    ...standardRlsPolicies("targets"),
  })
);

export const targetsRelations = relations(targets, ({ one }) => ({
  organization: one(organizations, {
    fields: [targets.organizationId],
    references: [organizations.id],
  }),
  createdByUser: one(users, {
    fields: [targets.createdBy],
    references: [users.id],
    relationName: "targetCreatedBy",
  }),
  updatedByUser: one(users, {
    fields: [targets.updatedBy],
    references: [users.id],
    relationName: "targetUpdatedBy",
  }),
}));

export type Target = typeof targets.$inferSelect;
export type NewTarget = typeof targets.$inferInsert;

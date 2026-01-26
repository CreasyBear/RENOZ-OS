/**
 * Scheduled Reports Schema
 *
 * Org-level scheduled reports with delivery configuration.
 */

import {
  pgTable,
  pgPolicy,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { timestampColumns, auditColumns } from "../_shared/patterns";
import { organizations } from "../settings/organizations";

export interface ReportRecipients {
  emails: string[];
  userIds?: string[];
}

export const scheduledReports = pgTable(
  "scheduled_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    description: text("description"),

    scheduleCron: text("schedule_cron").notNull(),
    format: text("format").notNull().default("csv"),
    isActive: boolean("is_active").notNull().default(true),

    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),

    recipients: jsonb("recipients")
      .$type<ReportRecipients>()
      .default({ emails: [] }),

    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    orgIdx: index("idx_scheduled_reports_org").on(table.organizationId),
    orgActiveIdx: index("idx_scheduled_reports_org_active").on(
      table.organizationId,
      table.isActive
    ),
    orgNextRunIdx: index("idx_scheduled_reports_org_next_run").on(
      table.organizationId,
      table.nextRunAt
    ),
    orgCreatedIdx: index("idx_scheduled_reports_org_created").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),
    // RLS Policies
    selectPolicy: pgPolicy("scheduled_reports_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("scheduled_reports_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("scheduled_reports_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("scheduled_reports_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

export const scheduledReportsRelations = relations(scheduledReports, () => ({}));

export type ScheduledReport = typeof scheduledReports.$inferSelect;
export type NewScheduledReport = typeof scheduledReports.$inferInsert;

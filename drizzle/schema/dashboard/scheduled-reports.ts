/**
 * Scheduled Reports Schema
 *
 * Org-level scheduled reports with delivery configuration.
 * Canonical owner: dashboard domain (per sprint-plan S9-T04)
 *
 * @see design-patterns.md Section 1 - Drizzle Schema Patterns
 */

import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { timestampColumns, auditColumns } from "../_shared/patterns";
import { reportFrequencyEnum, reportFormatEnum } from "../_shared/enums";
import { organizations } from "../settings/organizations";
import { users } from "../users/users";

/**
 * Report recipients configuration.
 * Typed without index signatures per design-patterns.md JSONB guidelines.
 */
export interface ReportRecipients {
  emails: string[];
  userIds: string[];
}

/**
 * Metrics to include in the report.
 * Typed without index signatures per design-patterns.md JSONB guidelines.
 */
export interface ReportMetrics {
  metrics: string[];
  includeCharts: boolean;
  includeTrends: boolean;
  comparisonPeriod: "previous_period" | "previous_year" | "none";
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

    frequency: reportFrequencyEnum("frequency").notNull(),
    format: reportFormatEnum("format").notNull().default("pdf"),

    scheduleCron: text("schedule_cron").notNull(),
    timezone: text("timezone").notNull().default("Australia/Sydney"),

    isActive: boolean("is_active").notNull().default(true),

    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
    lastError: text("last_error"),
    consecutiveFailures: text("consecutive_failures").default("0"),

    recipients: jsonb("recipients")
      .$type<ReportRecipients>()
      .notNull()
      .default({ emails: [], userIds: [] }),

    metrics: jsonb("metrics")
      .$type<ReportMetrics>()
      .notNull()
      .default({
        metrics: [],
        includeCharts: true,
        includeTrends: true,
        comparisonPeriod: "previous_period",
      }),

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
    orgFrequencyIdx: index("idx_scheduled_reports_org_frequency").on(
      table.organizationId,
      table.frequency
    ),
    orgCreatedIdx: index("idx_scheduled_reports_org_created").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),
  })
);

export const scheduledReportsRelations = relations(
  scheduledReports,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [scheduledReports.organizationId],
      references: [organizations.id],
    }),
    createdByUser: one(users, {
      fields: [scheduledReports.createdBy],
      references: [users.id],
      relationName: "reportCreatedBy",
    }),
    updatedByUser: one(users, {
      fields: [scheduledReports.updatedBy],
      references: [users.id],
      relationName: "reportUpdatedBy",
    }),
  })
);

export type ScheduledReport = typeof scheduledReports.$inferSelect;
export type NewScheduledReport = typeof scheduledReports.$inferInsert;

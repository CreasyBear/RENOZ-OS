/**
 * Custom Reports Schema
 *
 * User-defined reports with saved definitions.
 */

import { pgTable, uuid, text, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  timestampColumns,
  auditColumns,
  standardRlsPolicies,
} from "../_shared/patterns";
import { organizations } from "../settings/organizations";

export interface ReportDefinition {
  columns: string[];
  filters?: Record<string, string | number | boolean>;
  groupBy?: string[];
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}

export const customReports = pgTable(
  "custom_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    description: text("description"),
    isShared: boolean("is_shared").notNull().default(false),

    definition: jsonb("definition").$type<ReportDefinition>().notNull(),

    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    orgIdx: index("idx_custom_reports_org").on(table.organizationId),
    orgSharedIdx: index("idx_custom_reports_org_shared").on(
      table.organizationId,
      table.isShared
    ),
    // RLS Policies
    ...standardRlsPolicies("custom_reports"),
  })
);

export const customReportsRelations = relations(customReports, () => ({}));

export type CustomReport = typeof customReports.$inferSelect;
export type NewCustomReport = typeof customReports.$inferInsert;

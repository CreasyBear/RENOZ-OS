/**
 * Custom Reports Schema
 *
 * User-defined reports with saved definitions.
 */

import { pgTable, pgPolicy, uuid, text, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { timestampColumns, auditColumns } from "../_shared/patterns";
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
    selectPolicy: pgPolicy("custom_reports_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("custom_reports_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("custom_reports_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("custom_reports_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

export const customReportsRelations = relations(customReports, () => ({}));

export type CustomReport = typeof customReports.$inferSelect;
export type NewCustomReport = typeof customReports.$inferInsert;

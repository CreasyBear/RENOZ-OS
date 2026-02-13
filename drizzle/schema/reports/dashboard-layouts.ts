/**
 * Dashboard Layouts Schema
 *
 * Stores user-specific dashboard configurations.
 */

import { pgTable, uuid, text, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  timestampColumns,
  standardRlsPolicies,
} from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { users } from "../users/users";

export interface DashboardLayoutConfig {
  widgets: Array<{ id: string; type: string; position: string }>;
  filters?: Record<string, string | number | boolean>;
}

export const dashboardLayouts = pgTable(
  "dashboard_layouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    isDefault: boolean("is_default").notNull().default(false),

    layout: jsonb("layout").$type<DashboardLayoutConfig>().notNull(),

    ...timestampColumns,
  },
  (table) => ({
    orgUserIdx: index("idx_dashboard_layouts_org_user").on(
      table.organizationId,
      table.userId
    ),
    orgUserDefaultIdx: index("idx_dashboard_layouts_org_user_default").on(
      table.organizationId,
      table.userId,
      table.isDefault
    ),
    // RLS Policies
    ...standardRlsPolicies("dashboard_layouts"),
  })
);

export const dashboardLayoutsRelations = relations(dashboardLayouts, ({ one }) => ({
  user: one(users, {
    fields: [dashboardLayouts.userId],
    references: [users.id],
  }),
}));

export type DashboardLayout = typeof dashboardLayouts.$inferSelect;
export type NewDashboardLayout = typeof dashboardLayouts.$inferInsert;

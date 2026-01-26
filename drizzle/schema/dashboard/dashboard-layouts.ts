/**
 * Dashboard Layouts Schema
 *
 * Stores user-specific dashboard configurations.
 * Canonical owner: dashboard domain
 *
 * @see design-patterns.md Section 1 - Drizzle Schema Patterns
 */

import { pgTable, pgPolicy, uuid, text, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { timestampColumns } from "../_shared/patterns";
import { userRoleEnum } from "../_shared/enums";
import { organizations } from "../settings/organizations";
import { users } from "../users/users";

/**
 * Widget position in the dashboard grid.
 * Typed without index signatures per design-patterns.md JSONB guidelines.
 */
export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Widget configuration.
 * Typed without index signatures per design-patterns.md JSONB guidelines.
 */
export interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  position: WidgetPosition;
  settings: WidgetSettings;
}

/**
 * Widget-specific settings.
 * Typed without index signatures per design-patterns.md JSONB guidelines.
 */
export interface WidgetSettings {
  metric?: string;
  chartType?: "line" | "bar" | "pie" | "area";
  dateRange?: "7d" | "30d" | "90d" | "365d" | "custom";
  showTrend?: boolean;
  showTarget?: boolean;
  refreshInterval?: number;
}

/**
 * Dashboard layout configuration.
 * Typed without index signatures per design-patterns.md JSONB guidelines.
 */
export interface DashboardLayoutConfig {
  widgets: WidgetConfig[];
  gridColumns: number;
  theme: "light" | "dark" | "system";
  compactMode: boolean;
}

/**
 * Dashboard filter state.
 * Typed without index signatures per design-patterns.md JSONB guidelines.
 */
export interface DashboardFilters {
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  dateRangePreset: "7d" | "30d" | "90d" | "365d" | "custom" | null;
  comparisonEnabled: boolean;
  comparisonType: "previous_period" | "previous_year" | null;
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

    // Role-based default layout (null = user-created layout)
    roleDefault: userRoleEnum("role_default"),

    layout: jsonb("layout")
      .$type<DashboardLayoutConfig>()
      .notNull()
      .default({
        widgets: [],
        gridColumns: 12,
        theme: "system",
        compactMode: false,
      }),

    filters: jsonb("filters")
      .$type<DashboardFilters>()
      .notNull()
      .default({
        dateRangeStart: null,
        dateRangeEnd: null,
        dateRangePreset: "30d",
        comparisonEnabled: false,
        comparisonType: null,
      }),

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
    orgRoleDefaultIdx: index("idx_dashboard_layouts_org_role_default").on(
      table.organizationId,
      table.roleDefault
    ),
    // RLS Policies
    selectPolicy: pgPolicy("dashboard_layouts_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("dashboard_layouts_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("dashboard_layouts_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("dashboard_layouts_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

export const dashboardLayoutsRelations = relations(
  dashboardLayouts,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [dashboardLayouts.organizationId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [dashboardLayouts.userId],
      references: [users.id],
    }),
  })
);

export type DashboardLayout = typeof dashboardLayouts.$inferSelect;
export type NewDashboardLayout = typeof dashboardLayouts.$inferInsert;

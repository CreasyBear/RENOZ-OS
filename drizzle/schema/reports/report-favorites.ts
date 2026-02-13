/**
 * Report Favorites Schema
 *
 * User favorites for scheduled/custom reports.
 */

import { pgTable, uuid, text, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  timestampColumns,
  standardRlsPolicies,
} from "../_shared/patterns";
import { users } from "../users/users";
import { organizations } from "../settings/organizations";

export const reportFavorites = pgTable(
  "report_favorites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    reportType: text("report_type").notNull(), // scheduled | custom | dashboard
    reportId: uuid("report_id"),

    ...timestampColumns,
  },
  (table) => ({
    orgUserIdx: index("idx_report_favorites_org_user").on(
      table.organizationId,
      table.userId
    ),
    orgUserReportUnique: uniqueIndex("idx_report_favorites_org_user_report").on(
      table.organizationId,
      table.userId,
      table.reportType,
      table.reportId
    ),
    // RLS Policies
    ...standardRlsPolicies("report_favorites"),
  })
);

export const reportFavoritesRelations = relations(reportFavorites, ({ one }) => ({
  user: one(users, {
    fields: [reportFavorites.userId],
    references: [users.id],
  }),
}));

export type ReportFavorite = typeof reportFavorites.$inferSelect;
export type NewReportFavorite = typeof reportFavorites.$inferInsert;

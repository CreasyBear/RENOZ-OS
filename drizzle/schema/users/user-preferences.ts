/**
 * User Preferences Schema
 *
 * Separate table for user preferences with category/key/value pattern.
 * Allows flexible, typed preferences storage with efficient querying.
 * Table category: userScoped (per column-patterns.json)
 *
 * @see _Initiation/_prd/2-domains/users/users.prd.json for requirements
 */

import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  timestampColumns,
  auditColumns,
  organizationColumn,
  standardRlsPolicies,
} from "../_shared/patterns";
import { users } from "./users";

// ============================================================================
// USER PREFERENCES TABLE
// ============================================================================

export const userPreferences = pgTable(
  "user_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Organization scoping
    ...organizationColumn,

    // User reference
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Category/Key/Value pattern for flexible preferences
    category: varchar("category", { length: 50 }).notNull(), // e.g., "appearance", "notifications", "dashboard"
    key: varchar("key", { length: 100 }).notNull(), // e.g., "theme", "emailEnabled", "defaultView"
    value: jsonb("value").notNull(), // The actual preference value (can be any JSON type)

    // Optimistic locking
    version: integer("version").notNull().default(1),

    // Tracking
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    // Unique constraint: one preference per user/category/key combo
    uniquePreference: uniqueIndex("idx_user_preferences_unique").on(
      table.userId,
      table.category,
      table.key
    ),

    // Organization queries
    orgIdx: index("idx_user_preferences_org").on(table.organizationId),

    // User's preferences lookup
    userIdx: index("idx_user_preferences_user").on(table.userId),

    // Category-based queries
    userCategoryIdx: index("idx_user_preferences_user_category").on(
      table.userId,
      table.category
    ),

    // RLS Policies
    ...standardRlsPolicies("user_preferences"),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type UserPreference = typeof userPreferences.$inferSelect;
export type NewUserPreference = typeof userPreferences.$inferInsert;

// ============================================================================
// PREFERENCE CATEGORIES (for type safety)
// ============================================================================

export const PREFERENCE_CATEGORIES = {
  APPEARANCE: "appearance",
  NOTIFICATIONS: "notifications",
  DASHBOARD: "dashboard",
  DATA_DISPLAY: "data_display",
  SHORTCUTS: "shortcuts",
  ACCESSIBILITY: "accessibility",
  LOCALIZATION: "localization",
} as const;

export type PreferenceCategory = typeof PREFERENCE_CATEGORIES[keyof typeof PREFERENCE_CATEGORIES];

/**
 * Organization Holidays Schema
 *
 * Holiday calendar for excluding from SLA time calculations.
 * Supports both one-time and recurring annual holidays.
 *
 * @see _Initiation/_prd/_meta/remediation-sla-engine.md
 */

import {
  pgTable,
  uuid,
  text,
  date,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { timestampColumns } from "../_shared/patterns";
import { organizations } from "./organizations";

// ============================================================================
// ORGANIZATION HOLIDAYS TABLE
// ============================================================================

export const organizationHolidays = pgTable(
  "organization_holidays",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Holiday name (e.g., "Christmas Day", "Australia Day")
    name: text("name").notNull(),

    // The date of the holiday
    date: date("date").notNull(),

    // Optional: recurring annually (same month/day each year)
    isRecurring: boolean("is_recurring").notNull().default(false),

    // Description/notes
    description: text("description"),

    ...timestampColumns,
  },
  (table) => [
    // Unique holiday per date per org
    uniqueIndex("idx_holidays_org_date").on(table.organizationId, table.date),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const organizationHolidaysRelations = relations(
  organizationHolidays,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationHolidays.organizationId],
      references: [organizations.id],
    }),
  })
);

// ============================================================================
// TYPES
// ============================================================================

export type OrganizationHoliday = typeof organizationHolidays.$inferSelect;
export type NewOrganizationHoliday = typeof organizationHolidays.$inferInsert;

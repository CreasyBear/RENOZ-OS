/**
 * Business Hours Configuration Schema
 *
 * Organization-level business hours for SLA calculations.
 * Supports weekly schedules with timezone configuration.
 *
 * @see _Initiation/_prd/_meta/remediation-sla-engine.md
 */

import {
  pgTable,
  uuid,
  jsonb,
  text,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  timestampColumns,
  standardRlsPolicies,
} from "../_shared/patterns";
import { organizations } from "./organizations";

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Daily schedule configuration
 */
export interface DaySchedule {
  start: string; // "09:00" (24-hour format)
  end: string; // "17:00" (24-hour format)
}

/**
 * Weekly schedule configuration
 * Null/undefined days are considered non-working days
 */
export interface WeeklySchedule {
  monday?: DaySchedule | null;
  tuesday?: DaySchedule | null;
  wednesday?: DaySchedule | null;
  thursday?: DaySchedule | null;
  friday?: DaySchedule | null;
  saturday?: DaySchedule | null;
  sunday?: DaySchedule | null;
}

// ============================================================================
// BUSINESS HOURS CONFIG TABLE
// ============================================================================

export const businessHoursConfig = pgTable(
  "business_hours_config",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Schedule name (e.g., "Standard Hours", "Extended Support")
    name: text("name").notNull().default("Standard Hours"),

    // Weekly schedule (JSONB for flexibility)
    // Format: { "monday": { "start": "09:00", "end": "17:00" }, ... }
    weeklySchedule: jsonb("weekly_schedule").$type<WeeklySchedule>().notNull(),

    // Timezone for this org's business hours
    timezone: text("timezone").notNull().default("Australia/Sydney"),

    // Is this the default config for the org?
    isDefault: boolean("is_default").notNull().default(true),

    ...timestampColumns,
  },
  (table) => ({
    // Only one default per org
    orgDefaultIdx: uniqueIndex("idx_business_hours_org_default")
      .on(table.organizationId, table.isDefault)
      .where(sql`${table.isDefault} = true`),
    // RLS Policies
    ...standardRlsPolicies("business_hours_config"),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const businessHoursConfigRelations = relations(
  businessHoursConfig,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [businessHoursConfig.organizationId],
      references: [organizations.id],
    }),
  })
);

// ============================================================================
// TYPES
// ============================================================================

export type BusinessHoursConfig = typeof businessHoursConfig.$inferSelect;
export type NewBusinessHoursConfig = typeof businessHoursConfig.$inferInsert;

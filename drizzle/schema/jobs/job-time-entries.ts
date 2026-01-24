/**
 * Job Time Entries Schema
 *
 * Labor time tracking for job assignments.
 * Supports timer-based entries (startTime only until stopped)
 * and manual entries (both startTime and endTime).
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-003a
 */

import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  index,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  timestampColumns,
  auditColumns,
} from "../_shared/patterns";
import { jobTimeCategoryEnum } from "../_shared/enums";
import { organizations } from "../settings/organizations";
import { users } from "../users/users";
import { jobAssignments } from "./job-assignments";

// ============================================================================
// JOB TIME ENTRIES TABLE
// ============================================================================

/**
 * Job Time Entries Table
 *
 * Tracks labor time for job assignments.
 * Two modes of operation:
 * 1. Timer-based: startTime set when timer starts, endTime set when stopped
 * 2. Manual entry: both startTime and endTime set at creation
 *
 * Used for:
 * - Tracking technician hours on jobs
 * - Labor cost calculation
 * - Job profitability analysis
 */
export const jobTimeEntries = pgTable(
  "job_time_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Multi-tenant organization (with FK constraint)
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Link to job assignment
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobAssignments.id, { onDelete: "cascade" }),

    // User who performed the work (not just who created the entry)
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Time tracking
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }), // null while timer is running

    // Description of work performed
    description: text("description"),

    // Category of time entry
    category: jobTimeCategoryEnum("category").notNull().default("work"),

    // Billing flag
    isBillable: boolean("is_billable").notNull().default(true),

    // Optimistic locking
    version: integer("version").notNull().default(1),

    // Standard columns
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    // Organization + Job index (list entries for a job)
    orgJobIdx: index("idx_job_time_entries_org_job").on(
      table.organizationId,
      table.jobId
    ),

    // Organization + User index (list entries by user)
    orgUserIdx: index("idx_job_time_entries_org_user").on(
      table.organizationId,
      table.userId
    ),

    // Organization + Start Time index (chronological queries, reports)
    orgStartTimeIdx: index("idx_job_time_entries_org_start_time").on(
      table.organizationId,
      table.startTime.desc()
    ),

    // Organization + Category index (reporting)
    orgCategoryIdx: index("idx_job_time_entries_org_category").on(
      table.organizationId,
      table.category
    ),
  })
);

// ============================================================================
// TYPES
// ============================================================================

export type JobTimeEntry = typeof jobTimeEntries.$inferSelect;
export type NewJobTimeEntry = typeof jobTimeEntries.$inferInsert;

// ============================================================================
// RELATIONS
// ============================================================================

export const jobTimeEntriesRelations = relations(jobTimeEntries, ({ one }) => ({
  organization: one(organizations, {
    fields: [jobTimeEntries.organizationId],
    references: [organizations.id],
  }),
  job: one(jobAssignments, {
    fields: [jobTimeEntries.jobId],
    references: [jobAssignments.id],
  }),
  user: one(users, {
    fields: [jobTimeEntries.userId],
    references: [users.id],
    relationName: "timeEntryUser",
  }),
  createdByUser: one(users, {
    fields: [jobTimeEntries.createdBy],
    references: [users.id],
    relationName: "timeEntryCreatedBy",
  }),
  updatedByUser: one(users, {
    fields: [jobTimeEntries.updatedBy],
    references: [users.id],
    relationName: "timeEntryUpdatedBy",
  }),
}));

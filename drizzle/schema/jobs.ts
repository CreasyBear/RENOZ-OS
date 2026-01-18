/**
 * Jobs Schema
 *
 * Background job tracking for long-running operations.
 * Table category: userScoped (per column-patterns.json)
 *
 * @see _Initiation/_prd/1-foundation/patterns/canonical-enums.json for enum values
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  index,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { jobStatusEnum, jobTypeEnum } from "./enums";
import { timestampColumns } from "./patterns";
import { users } from "./users";
import { organizations } from "./organizations";

// ============================================================================
// INTERFACES
// ============================================================================

export type JobMetadata = {
  /** Total items to process */
  totalItems?: number;
  /** Items processed so far */
  processedItems?: number;
  /** Current step/phase description */
  currentStep?: string;
  /** Result data (on completion) */
  result?: object;
  /** Error details (on failure) */
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
  /** Additional context-specific data */
  extra?: object;
};

// ============================================================================
// JOBS TABLE
// ============================================================================

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Multi-tenant organization (with FK constraint)
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Job owner
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Job details
    type: jobTypeEnum("type").notNull(),
    name: text("name").notNull(),
    description: text("description"),

    // Status tracking
    status: jobStatusEnum("status").notNull().default("pending"),
    progress: integer("progress").notNull().default(0), // 0-100

    // Timing
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    // Metadata (JSONB for flexibility)
    metadata: jsonb("metadata").$type<JobMetadata>().default({}),

    // External reference (e.g., Trigger.dev job ID)
    externalId: text("external_id"),

    // Timestamps
    ...timestampColumns,
  },
  (table) => ({
    // User's jobs (most common query)
    userStatusIdx: index("idx_jobs_user_status").on(
      table.userId,
      table.status
    ),

    // Active jobs for a user
    userActiveIdx: index("idx_jobs_user_active").on(
      table.userId,
      table.status,
      table.createdAt
    ),

    // Multi-tenant query
    orgUserIdx: index("idx_jobs_org_user").on(
      table.organizationId,
      table.userId
    ),

    // External ID lookup
    externalIdIdx: index("idx_jobs_external_id").on(table.externalId),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const jobsRelations = relations(jobs, ({ one }) => ({
  user: one(users, {
    fields: [jobs.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [jobs.organizationId],
    references: [organizations.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type JobStatus = "pending" | "running" | "completed" | "failed";
export type JobType = "import" | "export" | "bulk_update" | "report_generation" | "data_sync" | "cleanup" | "other";

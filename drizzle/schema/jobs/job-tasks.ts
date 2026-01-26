/**
 * Job Tasks Schema
 *
 * Task management within job assignments for battery installation work.
 * Tasks include: Site assessment, Electrical prep, Battery mounting,
 * BMS configuration, Grid connection, Commissioning.
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-001a
 */

import {
  pgTable,
  uuid,
  text,
  varchar,
  date,
  integer,
  index,
  pgEnum,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  timestampColumns,
  auditColumns,
} from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { users } from "../users/users";
import { jobAssignments } from "./job-assignments";

// ============================================================================
// ENUMS
// ============================================================================

export const jobTaskStatusEnum = pgEnum("job_task_status", [
  "pending",
  "in_progress",
  "completed",
  "blocked",
]);

// ============================================================================
// JOB TASKS TABLE
// ============================================================================

/**
 * Job Tasks Table
 *
 * Tracks individual tasks within a job assignment.
 * Tasks can be reordered (position), assigned to specific technicians,
 * and have due dates for scheduling purposes.
 */
export const jobTasks = pgTable(
  "job_tasks",
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

    // Task details
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),

    // Status tracking
    status: jobTaskStatusEnum("status").notNull().default("pending"),

    // Assignment (optional - defaults to job assignee)
    assigneeId: uuid("assignee_id").references(() => users.id, {
      onDelete: "set null",
    }),

    // Scheduling
    dueDate: date("due_date"),

    // Priority level
    priority: text("priority", {
      enum: ["low", "normal", "high", "urgent"],
    }).notNull().default("normal"),

    // Time estimates (in minutes)
    estimatedHours: integer("estimated_hours"),

    // Time tracking (in minutes)
    actualHours: integer("actual_hours"),

    // Ordering for drag-drop reorder
    position: integer("position").notNull(),

    // Optimistic locking
    version: integer("version").notNull().default(1),

    // Standard columns
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    // Organization + Job index (most common query)
    orgJobIdx: index("idx_job_tasks_org_job").on(
      table.organizationId,
      table.jobId
    ),

    // Organization + Status index (for status filtering)
    orgStatusIdx: index("idx_job_tasks_org_status").on(
      table.organizationId,
      table.status
    ),

    // Organization + Created (for audit/timeline)
    orgCreatedIdx: index("idx_job_tasks_org_created").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),

    // Job + Position (for ordered queries within a job)
    jobPositionIdx: index("idx_job_tasks_job_position").on(
      table.jobId,
      table.position
    ),

    // Standard CRUD RLS policies for org isolation
    selectPolicy: pgPolicy("job_tasks_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("job_tasks_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("job_tasks_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("job_tasks_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const jobTasksRelations = relations(jobTasks, ({ one }) => ({
  organization: one(organizations, {
    fields: [jobTasks.organizationId],
    references: [organizations.id],
  }),
  jobAssignment: one(jobAssignments, {
    fields: [jobTasks.jobId],
    references: [jobAssignments.id],
  }),
  assignee: one(users, {
    fields: [jobTasks.assigneeId],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type JobTask = typeof jobTasks.$inferSelect;
export type NewJobTask = typeof jobTasks.$inferInsert;
export type JobTaskStatus = (typeof jobTaskStatusEnum.enumValues)[number];

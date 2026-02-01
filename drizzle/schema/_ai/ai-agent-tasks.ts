/**
 * AI Agent Tasks Schema
 *
 * Background task queue for autonomous agent workflows.
 * Processed by Trigger.dev jobs.
 * Table category: userScoped (per column-patterns.json)
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import {
  pgTable,
  uuid,
  text,
  jsonb,
  integer,
  timestamp,
  index,
  check,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { organizations } from "../settings/organizations";
import { users } from "../users";
import { aiAgentTaskStatusEnum, aiAgentNameEnum } from "./enums";
import { currencyColumnNullable } from "../_shared/patterns";

// ============================================================================
// INTERFACES
// ============================================================================

export interface TaskInput {
  /** Task-specific input data */
  [key: string]: unknown;
}

export interface TaskContext {
  /** Page/route when task was created */
  currentPage?: string;
  /** Related entity IDs */
  entityContext?: {
    customerId?: string;
    orderId?: string;
    quoteId?: string;
    jobId?: string;
  };
  /** User preferences */
  preferences?: Record<string, unknown>;
}

export interface TaskResult {
  success: boolean;
  data?: unknown;
  artifacts?: Array<{
    type: string;
    id: string;
    url?: string;
  }>;
  summary?: string;
}

export interface TaskError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
  retriable: boolean;
}

// ============================================================================
// AI AGENT TASKS TABLE
// ============================================================================

export const aiAgentTasks = pgTable(
  "ai_agent_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Multi-tenant scope
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Task definition
    taskType: text("task_type").notNull(), // e.g., "bulk_email", "report_generation"
    agent: aiAgentNameEnum("agent").notNull(),
    input: jsonb("input").$type<TaskInput>().notNull(),
    context: jsonb("context").$type<TaskContext>(),

    // Status and progress
    status: aiAgentTaskStatusEnum("status").notNull().default("queued"),
    progress: integer("progress").default(0), // 0-100
    currentStep: text("current_step"), // Human-readable current step

    // Results
    result: jsonb("result").$type<TaskResult>(),
    error: jsonb("error").$type<TaskError>(),

    // Cost tracking
    tokensUsed: integer("tokens_used").default(0),
    cost: currencyColumnNullable("cost").default(0),

    // Lifecycle timestamps
    queuedAt: timestamp("queued_at", { withTimezone: true }).defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    // Progress constraint
    progressCheck: check(
      "ai_agent_tasks_progress_check",
      sql`progress >= 0 AND progress <= 100`
    ),

    // Multi-tenant queries
    orgIdx: index("idx_ai_agent_tasks_org").on(table.organizationId),
    userIdx: index("idx_ai_agent_tasks_user").on(table.userId),

    // Status filter (most common: queued, running)
    statusIdx: index("idx_ai_agent_tasks_status").on(table.status),

    // Task type filter
    taskTypeIdx: index("idx_ai_agent_tasks_type").on(table.taskType),

    // Queue ordering
    queuedIdx: index("idx_ai_agent_tasks_queued").on(table.queuedAt),

    // Composite: user's tasks by status (dashboard)
    userStatusIdx: index("idx_ai_agent_tasks_user_status").on(
      table.userId,
      table.status
    ),

    // Composite: org's tasks by status (admin view)
    orgStatusIdx: index("idx_ai_agent_tasks_org_status").on(
      table.organizationId,
      table.status
    ),

    // Composite: pending tasks ordered by queue time (worker query)
    statusQueuedIdx: index("idx_ai_agent_tasks_status_queued").on(
      table.status,
      table.queuedAt
    ),

    // RLS Policies
    selectPolicy: pgPolicy("ai_agent_tasks_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("ai_agent_tasks_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("ai_agent_tasks_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("ai_agent_tasks_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const aiAgentTasksRelations = relations(aiAgentTasks, ({ one }) => ({
  user: one(users, {
    fields: [aiAgentTasks.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [aiAgentTasks.organizationId],
    references: [organizations.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type AiAgentTask = typeof aiAgentTasks.$inferSelect;
export type NewAiAgentTask = typeof aiAgentTasks.$inferInsert;

/**
 * AI Cost Tracking Schema
 *
 * Token usage and cost metrics per conversation/task.
 * Used for budget enforcement and usage analytics.
 * Table category: userScoped (per column-patterns.json)
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  index,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "../settings/organizations";
import { users } from "../users";
import { aiConversations } from "./ai-conversations";
import { aiAgentTasks } from "./ai-agent-tasks";
import {
  currencyColumn,
  organizationRlsUsing,
  organizationRlsWithCheck,
} from "../_shared/patterns";

// ============================================================================
// AI COST TRACKING TABLE
// ============================================================================

export const aiCostTracking = pgTable(
  "ai_cost_tracking",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Multi-tenant scope (organization required, user optional for system tasks)
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    // Optional links to source (one of these should be set)
    conversationId: uuid("conversation_id").references(
      () => aiConversations.id,
      { onDelete: "set null" }
    ),

    taskId: uuid("task_id").references(() => aiAgentTasks.id, {
      onDelete: "set null",
    }),

    // Model and feature tracking
    model: text("model").notNull(), // e.g., "claude-3-5-haiku-20241022"
    feature: text("feature"), // e.g., "chat", "triage", "report_generation"

    // Token counts
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    cacheReadTokens: integer("cache_read_tokens").default(0),
    cacheWriteTokens: integer("cache_write_tokens").default(0),

    // Cost in dollars (numeric(12,2) for precision)
    cost: currencyColumn("cost"),

    // Date for aggregation (without time)
    date: date("date").notNull(),

    // Timestamp for ordering
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    // Multi-tenant queries
    orgIdx: index("idx_ai_cost_org").on(table.organizationId),
    userIdx: index("idx_ai_cost_user").on(table.userId),

    // Date-based aggregation (most common)
    dateIdx: index("idx_ai_cost_date").on(table.date),

    // Model breakdown
    modelIdx: index("idx_ai_cost_model").on(table.model),

    // Feature breakdown
    featureIdx: index("idx_ai_cost_feature").on(table.feature),

    // Composite: org daily costs (budget check)
    orgDateIdx: index("idx_ai_cost_org_date").on(
      table.organizationId,
      table.date
    ),

    // Composite: user daily costs (per-user limits)
    userDateIdx: index("idx_ai_cost_user_date").on(table.userId, table.date),

    // Composite: org + model + date (detailed breakdown)
    orgModelDateIdx: index("idx_ai_cost_org_model_date").on(
      table.organizationId,
      table.model,
      table.date
    ),

    // Composite: org + feature + date (feature usage)
    orgFeatureDateIdx: index("idx_ai_cost_org_feature_date").on(
      table.organizationId,
      table.feature,
      table.date
    ),

    // RLS Policies - users see own org's costs, admins see all (append-only: select + insert + delete)
    selectPolicy: pgPolicy("ai_cost_tracking_select_policy", {
      for: "select",
      to: "authenticated",
      using: organizationRlsUsing(),
    }),
    insertPolicy: pgPolicy("ai_cost_tracking_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: organizationRlsWithCheck(),
    }),
    // Cost records are immutable - no update policy
    deletePolicy: pgPolicy("ai_cost_tracking_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: organizationRlsUsing(),
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const aiCostTrackingRelations = relations(aiCostTracking, ({ one }) => ({
  organization: one(organizations, {
    fields: [aiCostTracking.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [aiCostTracking.userId],
    references: [users.id],
  }),
  conversation: one(aiConversations, {
    fields: [aiCostTracking.conversationId],
    references: [aiConversations.id],
  }),
  task: one(aiAgentTasks, {
    fields: [aiCostTracking.taskId],
    references: [aiAgentTasks.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type AiCostTracking = typeof aiCostTracking.$inferSelect;
export type NewAiCostTracking = typeof aiCostTracking.$inferInsert;

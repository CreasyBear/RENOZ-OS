/**
 * AI Approvals Schema
 *
 * Human-in-the-loop approval queue for AI-drafted actions.
 * Implements draft-approve pattern with optimistic locking.
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
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { organizations } from "../settings/organizations";
import { users } from "../users";
import { aiApprovalStatusEnum, aiAgentNameEnum } from "./enums";
import { aiConversations } from "./ai-conversations";

// ============================================================================
// INTERFACES
// ============================================================================

export interface ApprovalActionData {
  /** The type of action (e.g., 'create_order', 'update_customer') */
  actionType: string;
  /** Draft data to be applied on approval */
  draft: Record<string, unknown>;
  /** Available actions user can take */
  availableActions: Array<"approve" | "edit" | "discard">;
  /** Optional diff showing what will change */
  diff?: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  };
}

export interface ExecutionResult {
  success: boolean;
  entityId?: string;
  entityType?: string;
  error?: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// AI APPROVALS TABLE
// ============================================================================

export const aiApprovals = pgTable(
  "ai_approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Optional link to conversation (can be null for autonomous tasks)
    conversationId: uuid("conversation_id").references(
      () => aiConversations.id,
      { onDelete: "set null" }
    ),

    // Multi-tenant scope
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Action details
    action: text("action").notNull(), // e.g., "create_order", "update_customer"
    agent: aiAgentNameEnum("agent").notNull(),
    actionData: jsonb("action_data").$type<ApprovalActionData>().notNull(),

    // Status with optimistic locking
    status: aiApprovalStatusEnum("status").notNull().default("pending"),
    version: integer("version").notNull().default(1), // For optimistic locking

    // Approval tracking
    approvedBy: uuid("approved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),

    // Execution tracking
    executedAt: timestamp("executed_at", { withTimezone: true }),
    executionResult: jsonb("execution_result").$type<ExecutionResult>(),

    // Expiration
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

    // Created timestamp
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // Retry tracking for failed execution attempts
    retryCount: integer("retry_count").notNull().default(0),
    lastError: text("last_error"),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  },
  (table) => ({
    // Multi-tenant queries
    orgIdx: index("idx_ai_approvals_org").on(table.organizationId),
    userIdx: index("idx_ai_approvals_user").on(table.userId),

    // Status filter (most common: pending)
    statusIdx: index("idx_ai_approvals_status").on(table.status),

    // Expiration cleanup
    expiresIdx: index("idx_ai_approvals_expires").on(table.expiresAt),

    // Composite: pending approvals by user (dashboard query)
    userStatusIdx: index("idx_ai_approvals_user_status").on(
      table.userId,
      table.status
    ),

    // Composite: pending approvals by org (admin view)
    orgStatusIdx: index("idx_ai_approvals_org_status").on(
      table.organizationId,
      table.status
    ),

    // Retry tracking: find stuck approvals with multiple failed attempts
    retryStatusIdx: index("idx_ai_approvals_retry_status").on(
      table.status,
      table.retryCount
    ),

    // RLS Policies
    selectPolicy: pgPolicy("ai_approvals_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("ai_approvals_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("ai_approvals_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("ai_approvals_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const aiApprovalsRelations = relations(aiApprovals, ({ one }) => ({
  conversation: one(aiConversations, {
    fields: [aiApprovals.conversationId],
    references: [aiConversations.id],
  }),
  user: one(users, {
    fields: [aiApprovals.userId],
    references: [users.id],
    relationName: "aiApprovalsToUser",
  }),
  approver: one(users, {
    fields: [aiApprovals.approvedBy],
    references: [users.id],
    relationName: "aiApprovalsToApprover",
  }),
  organization: one(organizations, {
    fields: [aiApprovals.organizationId],
    references: [organizations.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type AiApproval = typeof aiApprovals.$inferSelect;
export type NewAiApproval = typeof aiApprovals.$inferInsert;

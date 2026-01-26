/**
 * Escalation Rules Schema
 *
 * Defines escalation rules for automatic and manual escalation of issues.
 * Rules specify conditions and actions for escalating issues.
 *
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-002a
 */

import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  jsonb,
  index,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { timestampColumns } from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { users } from "../users";

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Condition for triggering an escalation rule
 */
export interface EscalationCondition {
  // Condition type
  type:
    | "sla_breach"
    | "sla_at_risk"
    | "priority"
    | "age_hours"
    | "reopen_count"
    | "customer_vip";

  // Condition parameters
  params?: {
    // For sla_breach/sla_at_risk: which target
    target?: "response" | "resolution" | "any";
    // For priority: minimum priority level
    minPriority?: "low" | "medium" | "high" | "critical";
    // For age_hours: hours since creation
    hours?: number;
    // For reopen_count: minimum reopens
    count?: number;
  };
}

/**
 * Action to take when escalation rule triggers
 */
export interface EscalationAction {
  // Action type
  type: "assign_user" | "notify_user" | "change_priority" | "add_tag";

  // Action parameters
  params?: {
    // For assign_user/notify_user: target user
    userId?: string;
    // For change_priority: new priority
    priority?: "low" | "medium" | "high" | "critical";
    // For add_tag: tag to add
    tag?: string;
    // Optional notification message
    message?: string;
  };
}

// ============================================================================
// ESCALATION RULES TABLE
// ============================================================================

export const escalationRules = pgTable(
  "escalation_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Rule identification
    name: text("name").notNull(),
    description: text("description"),

    // Trigger condition (JSON)
    condition: jsonb("condition").$type<EscalationCondition>().notNull(),

    // Action to take (JSON)
    action: jsonb("action").$type<EscalationAction>().notNull(),

    // Rule settings
    isActive: boolean("is_active").notNull().default(true),
    priority: integer("priority").notNull().default(0), // Lower = higher priority

    // Optional: specific escalation target user
    escalateToUserId: uuid("escalate_to_user_id"),

    ...timestampColumns,
  },
  (table) => [
    // Find active rules for organization
    index("idx_escalation_rules_org_active").on(
      table.organizationId,
      table.isActive,
      table.priority
    ),

    // Standard CRUD RLS policies for org isolation
    pgPolicy("escalation_rules_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    pgPolicy("escalation_rules_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    pgPolicy("escalation_rules_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    pgPolicy("escalation_rules_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  ]
);

// ============================================================================
// ESCALATION HISTORY TABLE
// ============================================================================

/**
 * Tracks escalation/de-escalation events for issues
 */
export const escalationHistory = pgTable(
  "escalation_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Which issue was escalated
    issueId: uuid("issue_id").notNull(),

    // Event type
    action: text("action", { enum: ["escalate", "de_escalate"] }).notNull(),

    // Who performed the action
    performedByUserId: uuid("performed_by_user_id").notNull(),

    // Reason for escalation/de-escalation
    reason: text("reason"),

    // Which rule triggered this (NULL for manual)
    escalationRuleId: uuid("escalation_rule_id"),

    // Who was assigned as a result
    escalatedToUserId: uuid("escalated_to_user_id"),

    // Previous assignee (for de-escalation reference)
    previousAssigneeId: uuid("previous_assignee_id"),

    ...timestampColumns,
  },
  (table) => [
    // Find escalation history for an issue
    index("idx_escalation_history_issue").on(
      table.issueId,
      table.createdAt
    ),
    // Find escalations by user
    index("idx_escalation_history_performed_by").on(
      table.performedByUserId,
      table.createdAt
    ),

    // Standard CRUD RLS policies for org isolation
    pgPolicy("escalation_history_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    pgPolicy("escalation_history_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    pgPolicy("escalation_history_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    pgPolicy("escalation_history_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const escalationRulesRelations = relations(
  escalationRules,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [escalationRules.organizationId],
      references: [organizations.id],
    }),
    escalateToUser: one(users, {
      fields: [escalationRules.escalateToUserId],
      references: [users.id],
    }),
  })
);

export const escalationHistoryRelations = relations(
  escalationHistory,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [escalationHistory.organizationId],
      references: [organizations.id],
    }),
    performedByUser: one(users, {
      fields: [escalationHistory.performedByUserId],
      references: [users.id],
      relationName: "performedBy",
    }),
    escalatedToUser: one(users, {
      fields: [escalationHistory.escalatedToUserId],
      references: [users.id],
      relationName: "escalatedTo",
    }),
    previousAssignee: one(users, {
      fields: [escalationHistory.previousAssigneeId],
      references: [users.id],
      relationName: "previousAssignee",
    }),
    escalationRule: one(escalationRules, {
      fields: [escalationHistory.escalationRuleId],
      references: [escalationRules.id],
    }),
  })
);

// ============================================================================
// TYPES
// ============================================================================

export type EscalationRule = typeof escalationRules.$inferSelect;
export type NewEscalationRule = typeof escalationRules.$inferInsert;
export type EscalationHistoryRecord = typeof escalationHistory.$inferSelect;
export type NewEscalationHistoryRecord = typeof escalationHistory.$inferInsert;

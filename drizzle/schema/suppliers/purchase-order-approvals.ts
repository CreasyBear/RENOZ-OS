/**
 * Purchase Order Approvals Schema
 *
 * Multi-level approval workflow for purchase orders with escalation.
 * Includes both individual approvals and configurable approval rules.
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/2-domains/suppliers/suppliers.prd.json for full specification
 */

import {
  pgTable,
  pgPolicy,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  check,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { approvalStatusEnum } from "../_shared/enums";
import {
  timestampColumns,
  auditColumns,
  currencyColumnNullable,
} from "../_shared/patterns";
import { purchaseOrders } from "./purchase-orders";
import { users } from "../users/users";
import { organizations } from "../settings/organizations";

// ============================================================================
// PURCHASE ORDER APPROVALS TABLE
// ============================================================================

export const purchaseOrderApprovals = pgTable(
  "purchase_order_approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Link to purchase order
    purchaseOrderId: uuid("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),

    // Approver
    approverId: uuid("approver_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    // Approval level (1 = first level, 2 = second level, etc.)
    level: integer("level").notNull().default(1),

    // Status
    status: approvalStatusEnum("status").notNull().default("pending"),

    // Decision details
    comments: text("comments"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),

    // Escalation tracking
    escalatedTo: uuid("escalated_to")
      .references(() => users.id, { onDelete: "set null" }),
    escalatedAt: timestamp("escalated_at", { withTimezone: true }),
    escalationReason: text("escalation_reason"),

    // Delegation (if approver delegated to someone)
    delegatedFrom: uuid("delegated_from")
      .references(() => users.id, { onDelete: "set null" }),

    // Due date for approval
    dueAt: timestamp("due_at", { withTimezone: true }),

    // Tracking
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    // One approval per PO per level (can have multiple levels)
    poLevelUnique: uniqueIndex("idx_purchase_order_approvals_po_level_unique").on(
      table.purchaseOrderId,
      table.level
    ),

    // Purchase order queries
    purchaseOrderIdx: index("idx_purchase_order_approvals_po").on(
      table.purchaseOrderId
    ),

    orgPurchaseOrderIdx: index("idx_purchase_order_approvals_org_po").on(
      table.organizationId,
      table.purchaseOrderId
    ),

    // Approver queries (find all pending approvals for a user)
    approverIdx: index("idx_purchase_order_approvals_approver").on(
      table.approverId
    ),

    approverStatusIdx: index("idx_purchase_order_approvals_approver_status").on(
      table.approverId,
      table.status
    ),

    // Status queries
    orgStatusIdx: index("idx_purchase_order_approvals_org_status").on(
      table.organizationId,
      table.status
    ),

    // Due date queries (for overdue alerts)
    dueAtIdx: index("idx_purchase_order_approvals_due_at").on(table.dueAt),
    orgDuePendingIdx: index("idx_purchase_order_approvals_org_due_pending").on(
      table.organizationId,
      table.status,
      table.dueAt
    ),

    // Cursor pagination
    orgCreatedIdIdx: index("idx_purchase_order_approvals_org_created_id").on(
      table.organizationId,
      table.createdAt,
      table.id
    ),

    // Level must be positive
    levelCheck: check(
      "purchase_order_approvals_level_positive",
      sql`${table.level} > 0`
    ),

    // Approval/rejection timestamps match status
    approvedStatusCheck: check(
      "purchase_order_approvals_approved_status",
      sql`(${table.status} = 'approved' AND ${table.approvedAt} IS NOT NULL) OR
          (${table.status} != 'approved' AND ${table.approvedAt} IS NULL)`
    ),

    rejectedStatusCheck: check(
      "purchase_order_approvals_rejected_status",
      sql`(${table.status} = 'rejected' AND ${table.rejectedAt} IS NOT NULL) OR
          (${table.status} != 'rejected' AND ${table.rejectedAt} IS NULL)`
    ),

    // Escalation consistency
    escalatedCheck: check(
      "purchase_order_approvals_escalated_consistency",
      sql`(${table.escalatedTo} IS NULL AND ${table.escalatedAt} IS NULL) OR
          (${table.escalatedTo} IS NOT NULL AND ${table.escalatedAt} IS NOT NULL)`
    ),

    // RLS Policies
    selectPolicy: pgPolicy("purchase_order_approvals_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("purchase_order_approvals_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("purchase_order_approvals_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("purchase_order_approvals_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// PURCHASE ORDER APPROVAL RULES TABLE
// ============================================================================

export const purchaseOrderApprovalRules = pgTable(
  "purchase_order_approval_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Rule identification
    name: text("name").notNull(),
    description: text("description"),

    // Amount thresholds
    minAmount: currencyColumnNullable("min_amount"),
    maxAmount: currencyColumnNullable("max_amount"),

    // Rule configuration
    requiresApproval: boolean("requires_approval").notNull().default(true),
    autoApproveUnder: currencyColumnNullable("auto_approve_under"),
    approverRoles: text("approver_roles").array().notNull().default(sql`'{}'::text[]`),

    // Escalation settings
    escalationHours: integer("escalation_hours").default(24),
    escalationApproverRoles: text("escalation_approver_roles").array().default(sql`'{}'::text[]`),

    // Priority (lower = higher priority, checked first)
    priority: integer("priority").notNull().default(0),

    // Status
    isActive: boolean("is_active").notNull().default(true),

    // Version for optimistic locking
    version: integer("version").notNull().default(1),

    // Tracking
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    // Organization queries
    orgIdx: index("idx_purchase_order_approval_rules_org").on(
      table.organizationId
    ),

    // Active rules queries
    orgActiveIdx: index("idx_purchase_order_approval_rules_org_active").on(
      table.organizationId,
      table.isActive
    ),

    // Priority ordering
    orgActivePriorityIdx: index("idx_purchase_order_approval_rules_org_active_priority").on(
      table.organizationId,
      table.isActive,
      table.priority
    ),

    // Amount range queries
    minAmountIdx: index("idx_purchase_order_approval_rules_min_amount").on(
      table.minAmount
    ),

    maxAmountIdx: index("idx_purchase_order_approval_rules_max_amount").on(
      table.maxAmount
    ),

    // Cursor pagination
    orgCreatedIdIdx: index("idx_purchase_order_approval_rules_org_created_id").on(
      table.organizationId,
      table.createdAt,
      table.id
    ),

    // Amount range validation
    amountRangeCheck: check(
      "purchase_order_approval_rules_amount_range",
      sql`${table.minAmount} IS NULL OR ${table.maxAmount} IS NULL OR ${table.maxAmount} >= ${table.minAmount}`
    ),

    // Escalation hours must be positive
    escalationHoursCheck: check(
      "purchase_order_approval_rules_escalation_hours_positive",
      sql`${table.escalationHours} IS NULL OR ${table.escalationHours} > 0`
    ),

    // Priority must be non-negative
    priorityCheck: check(
      "purchase_order_approval_rules_priority_non_negative",
      sql`${table.priority} >= 0`
    ),

    // RLS Policies
    selectPolicy: pgPolicy("purchase_order_approval_rules_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("purchase_order_approval_rules_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("purchase_order_approval_rules_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("purchase_order_approval_rules_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const purchaseOrderApprovalsRelations = relations(
  purchaseOrderApprovals,
  ({ one }) => ({
    purchaseOrder: one(purchaseOrders, {
      fields: [purchaseOrderApprovals.purchaseOrderId],
      references: [purchaseOrders.id],
    }),
    approver: one(users, {
      fields: [purchaseOrderApprovals.approverId],
      references: [users.id],
      relationName: "approvalApprover",
    }),
    escalatedToUser: one(users, {
      fields: [purchaseOrderApprovals.escalatedTo],
      references: [users.id],
      relationName: "approvalEscalatedTo",
    }),
    delegatedFromUser: one(users, {
      fields: [purchaseOrderApprovals.delegatedFrom],
      references: [users.id],
      relationName: "approvalDelegatedFrom",
    }),
  })
);

export const purchaseOrderApprovalRulesRelations = relations(
  purchaseOrderApprovalRules,
  () => ({
    // Rules are organization-level configuration, no direct relations
  })
);

// ============================================================================
// TYPES
// ============================================================================

export type PurchaseOrderApproval = typeof purchaseOrderApprovals.$inferSelect;
export type NewPurchaseOrderApproval = typeof purchaseOrderApprovals.$inferInsert;

export type PurchaseOrderApprovalRule = typeof purchaseOrderApprovalRules.$inferSelect;
export type NewPurchaseOrderApprovalRule = typeof purchaseOrderApprovalRules.$inferInsert;

/**
 * Customer Action Plans Schema
 *
 * Tracks actionable improvement plans for customer health scores.
 * Allows users to create, complete, and track health improvement actions.
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/2-domains/customers/customers.prd.json for requirements
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { timestampColumns, auditColumns, standardRlsPolicies } from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { users } from "../users/users";
import { customers } from "./customers";

// ============================================================================
// INTERFACES
// ============================================================================

export interface ActionPlanMetadata {
  /** Related health factor (recency, frequency, monetary, engagement) */
  healthFactor?: string;
  /** Related recommendation ID from health recommendations */
  recommendationId?: string;
  /** Additional context or notes */
  notes?: string;
}

// ============================================================================
// CUSTOMER ACTION PLANS TABLE
// ============================================================================

export const customerActionPlans = pgTable(
  "customer_action_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Organization scoping
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Customer reference
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),

    // Action plan details
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    priority: varchar("priority", { length: 20 }).notNull(), // 'high' | 'medium' | 'low'
    category: varchar("category", { length: 50 }).notNull(), // 'recency' | 'frequency' | 'monetary' | 'engagement' | 'general'

    // Status tracking
    isCompleted: boolean("is_completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedBy: uuid("completed_by").references(() => users.id, { onDelete: "set null" }),

    // Due date (optional)
    dueDate: timestamp("due_date", { withTimezone: true }),

    // Additional metadata
    metadata: jsonb("metadata").$type<ActionPlanMetadata>().default({}),

    // Audit columns
    ...auditColumns,

    // Timestamp columns
    ...timestampColumns,
  },
  (table) => ({
    // Organization queries
    orgIdx: index("idx_customer_action_plans_org").on(table.organizationId),

    // Customer action plans lookup
    customerIdx: index("idx_customer_action_plans_customer").on(table.customerId),

    // Active (incomplete) plans for customer
    customerActiveIdx: index("idx_customer_action_plans_customer_active").on(
      table.customerId,
      table.isCompleted
    ),

    // Priority-based queries
    priorityIdx: index("idx_customer_action_plans_priority").on(
      table.organizationId,
      table.priority,
      table.isCompleted
    ),

    // Due date queries
    dueDateIdx: index("idx_customer_action_plans_due_date").on(
      table.organizationId,
      table.dueDate,
      table.isCompleted
    ),

    // RLS Policies
    ...standardRlsPolicies("customer_action_plans"),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const customerActionPlansRelations = relations(customerActionPlans, ({ one }) => ({
  organization: one(organizations, {
    fields: [customerActionPlans.organizationId],
    references: [organizations.id],
  }),
  customer: one(customers, {
    fields: [customerActionPlans.customerId],
    references: [customers.id],
  }),
  completedByUser: one(users, {
    fields: [customerActionPlans.completedBy],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CustomerActionPlan = typeof customerActionPlans.$inferSelect;
export type NewCustomerActionPlan = typeof customerActionPlans.$inferInsert;

/**
 * User Delegations Schema
 *
 * Out-of-office delegation management.
 * Allows users to delegate their tasks/permissions to another user for a time period.
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/2-domains/users/users.prd.json for requirements
 */

import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  index,
  pgPolicy,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { timestampColumns, auditColumns, softDeleteColumn } from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { users } from "./users";

// ============================================================================
// USER DELEGATIONS TABLE
// ============================================================================

export const userDelegations = pgTable(
  "user_delegations",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Organization scoping
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Delegation parties
    delegatorId: uuid("delegator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }), // User who is delegating
    delegateId: uuid("delegate_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }), // User receiving delegation

    // Time period
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }).notNull(),

    // Optional reason/notes
    reason: text("reason"),

    // Status
    isActive: boolean("is_active").notNull().default(true),

    // Optimistic locking
    version: integer("version").notNull().default(1),

    // Tracking
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumn,
  },
  (table) => ({
    // Organization queries
    orgIdx: index("idx_user_delegations_org").on(table.organizationId),

    // Delegator's delegations
    delegatorIdx: index("idx_user_delegations_delegator").on(table.delegatorId),

    // Delegate's received delegations
    delegateIdx: index("idx_user_delegations_delegate").on(table.delegateId),

    // Active delegations with dates for time-based queries
    activeDatesIdx: index("idx_user_delegations_active_dates").on(
      table.isActive,
      table.startDate,
      table.endDate
    ),

    // Find active delegations for a specific delegator
    delegatorActiveIdx: index("idx_user_delegations_delegator_active").on(
      table.delegatorId,
      table.isActive
    ),

    // Check constraints
    validDateRange: check(
      "user_delegations_valid_dates",
      sql`start_date < end_date`
    ),
    differentUsers: check(
      "user_delegations_different_users",
      sql`delegator_id != delegate_id`
    ),

    // RLS Policies
    selectPolicy: pgPolicy("user_delegations_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("user_delegations_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("user_delegations_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("user_delegations_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const userDelegationsRelations = relations(userDelegations, ({ one }) => ({
  organization: one(organizations, {
    fields: [userDelegations.organizationId],
    references: [organizations.id],
  }),
  delegator: one(users, {
    fields: [userDelegations.delegatorId],
    references: [users.id],
    relationName: "delegatorDelegations",
  }),
  delegate: one(users, {
    fields: [userDelegations.delegateId],
    references: [users.id],
    relationName: "delegateAssignments",
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type UserDelegation = typeof userDelegations.$inferSelect;
export type NewUserDelegation = typeof userDelegations.$inferInsert;

/**
 * User Groups Schema
 *
 * Team and group organization for collaboration.
 * Supports groups with member roles (member, lead, manager).
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/2-domains/users/users.prd.json for requirements
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  index,
  uniqueIndex,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { timestampColumns, auditColumns, softDeleteColumn } from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { users } from "./users";

// ============================================================================
// GROUP ROLE ENUM (defined inline to avoid circular imports)
// ============================================================================

import { pgEnum } from "drizzle-orm/pg-core";

export const groupRoleEnum = pgEnum("group_role", ["member", "lead", "manager"]);

// ============================================================================
// USER GROUPS TABLE
// ============================================================================

export const userGroups = pgTable(
  "user_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Organization scoping
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Group identity
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    color: varchar("color", { length: 7 }), // Hex color e.g., "#3B82F6"

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
    // Unique group name per organization
    nameOrgUnique: uniqueIndex("idx_user_groups_name_org_unique").on(
      table.organizationId,
      table.name
    ),

    // Organization queries
    orgIdx: index("idx_user_groups_org").on(table.organizationId),

    // Active groups
    orgActiveIdx: index("idx_user_groups_org_active").on(
      table.organizationId,
      table.isActive
    ),

    // RLS Policies
    selectPolicy: pgPolicy("user_groups_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("user_groups_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("user_groups_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("user_groups_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// USER GROUP MEMBERS TABLE
// ============================================================================

export const userGroupMembers = pgTable(
  "user_group_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Organization scoping (denormalized for RLS efficiency)
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Group and user references
    groupId: uuid("group_id")
      .notNull()
      .references(() => userGroups.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Member role within the group
    role: groupRoleEnum("role").notNull().default("member"),

    // Membership timestamps
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // Who added this member
    addedBy: uuid("added_by")
      .notNull()
      .references(() => users.id),

    // Optimistic locking
    version: integer("version").notNull().default(1),

    // Audit columns
    ...auditColumns,
  },
  (table) => ({
    // Unique membership per group/user
    membershipUnique: uniqueIndex("idx_user_group_members_unique").on(
      table.groupId,
      table.userId
    ),

    // Organization queries
    orgIdx: index("idx_user_group_members_org").on(table.organizationId),

    // Group members lookup
    groupIdx: index("idx_user_group_members_group").on(table.groupId),

    // User's groups lookup
    userIdx: index("idx_user_group_members_user").on(table.userId),

    // Role-based queries
    groupRoleIdx: index("idx_user_group_members_group_role").on(
      table.groupId,
      table.role
    ),

    // RLS Policies
    selectPolicy: pgPolicy("user_group_members_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("user_group_members_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("user_group_members_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("user_group_members_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const userGroupsRelations = relations(userGroups, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [userGroups.organizationId],
    references: [organizations.id],
  }),
  members: many(userGroupMembers),
}));

export const userGroupMembersRelations = relations(userGroupMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [userGroupMembers.organizationId],
    references: [organizations.id],
  }),
  group: one(userGroups, {
    fields: [userGroupMembers.groupId],
    references: [userGroups.id],
  }),
  user: one(users, {
    fields: [userGroupMembers.userId],
    references: [users.id],
  }),
  addedByUser: one(users, {
    fields: [userGroupMembers.addedBy],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type UserGroup = typeof userGroups.$inferSelect;
export type NewUserGroup = typeof userGroups.$inferInsert;
export type UserGroupMember = typeof userGroupMembers.$inferSelect;
export type NewUserGroupMember = typeof userGroupMembers.$inferInsert;
export type GroupRole = "member" | "lead" | "manager";

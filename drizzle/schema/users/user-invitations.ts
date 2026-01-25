/**
 * User Invitations Schema
 *
 * User invitation tracking and management.
 * Supports inviting new users with role assignment and personal messages.
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/2-domains/users/users.prd.json for requirements
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
  pgPolicy,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { pgEnum } from "drizzle-orm/pg-core";
import { userRoleEnum } from "../_shared/enums";
import { auditColumns } from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { users } from "./users";

// ============================================================================
// INVITATION STATUS ENUM
// ============================================================================

export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "expired",
  "cancelled",
]);

// ============================================================================
// USER INVITATIONS TABLE
// ============================================================================

export const userInvitations = pgTable(
  "user_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Organization scoping
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Invitee info
    email: varchar("email", { length: 255 }).notNull(),
    role: userRoleEnum("role").notNull(), // Role to assign upon acceptance

    // Invitation sender - cascade delete if inviter is removed
    // Note: Changed from set null to cascade to match notNull constraint
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Timestamps
    invitedAt: timestamp("invited_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),

    // Optional personalization
    personalMessage: text("personal_message"),

    // Secure token for invitation link
    token: varchar("token", { length: 255 }).notNull(),

    // Status
    status: invitationStatusEnum("status").notNull().default("pending"),

    // Optimistic locking
    version: integer("version").notNull().default(1),

    // Audit columns
    ...auditColumns,
  },
  (table) => ({
    // Unique token
    tokenUnique: uniqueIndex("idx_user_invitations_token_unique").on(table.token),

    // Organization queries
    orgIdx: index("idx_user_invitations_org").on(table.organizationId),

    // Email lookup
    emailIdx: index("idx_user_invitations_email").on(table.email),

    // Pending invitations for an organization
    orgStatusIdx: index("idx_user_invitations_org_status").on(
      table.organizationId,
      table.status
    ),

    // Expiration tracking
    expiresIdx: index("idx_user_invitations_expires").on(table.expiresAt),

    // Invitations by sender
    invitedByIdx: index("idx_user_invitations_invited_by").on(table.invitedBy),

    // Check constraint: expiry must be after invitation
    validExpiry: check(
      "user_invitations_valid_expiry",
      sql`expires_at > invited_at`
    ),

    // RLS Policies
    selectPolicy: pgPolicy("user_invitations_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("user_invitations_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("user_invitations_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("user_invitations_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const userInvitationsRelations = relations(userInvitations, ({ one }) => ({
  organization: one(organizations, {
    fields: [userInvitations.organizationId],
    references: [organizations.id],
  }),
  inviter: one(users, {
    fields: [userInvitations.invitedBy],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type UserInvitation = typeof userInvitations.$inferSelect;
export type NewUserInvitation = typeof userInvitations.$inferInsert;
export type InvitationStatus = "pending" | "accepted" | "expired" | "cancelled";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default invitation expiration in days */
export const INVITATION_DEFAULT_EXPIRY_DAYS = 7;

/** Maximum personal message length */
export const INVITATION_MAX_MESSAGE_LENGTH = 500;

/**
 * Users Schema
 *
 * User profiles linked to Supabase Auth. Extends auth.users with application data.
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/1-foundation/patterns/canonical-enums.json for enum values
 */

import {
  pgTable,
  uuid,
  text,
  jsonb,
  integer,
  timestamp,
  index,
  uniqueIndex,
  pgPolicy,
  pgSchema,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { userRoleEnum, userStatusEnum, userTypeEnum } from "../_shared/enums";
import {
  timestampColumns,
  auditColumns,
  softDeleteColumn,
  standardRlsPolicies,
} from "../_shared/patterns";
import { organizations } from "../settings/organizations";

const authSchema = pgSchema("auth");
const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

// ============================================================================
// INTERFACES
// ============================================================================

export interface UserPreferences {
  theme?: "light" | "dark" | "system";
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
  };
  dashboard?: {
    layout?: string;
    widgets?: string[];
  };
  // Using Record-compatible index signature for Zod passthrough compatibility
  [key: string]: string | boolean | object | undefined;
}

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  avatarUrl?: string;
  bio?: string;
}

// ============================================================================
// USERS TABLE
// ============================================================================

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Link to Supabase Auth (auth.users.id)
    authId: uuid("auth_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),

    // Organization membership
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Identity
    email: text("email").notNull(),
    name: text("name"), // Display name

    // Profile (JSONB)
    profile: jsonb("profile").$type<UserProfile>().default({}),

    // Role and permissions
    role: userRoleEnum("role").notNull().default("viewer"),
    status: userStatusEnum("status").notNull().default("invited"),
    type: userTypeEnum("type"), // staff or installer

    // Preferences (JSONB)
    preferences: jsonb("preferences").$type<UserPreferences>().default({
      theme: "system",
      notifications: { email: true, push: true },
    }),

    // Tracking
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumn,
  },
  (table) => ({
    // Unique auth ID (one app user per Supabase user)
    authIdUnique: uniqueIndex("idx_users_auth_id_unique").on(table.authId),

    // Unique email per organization
    emailOrgUnique: uniqueIndex("idx_users_email_org_unique").on(
      table.organizationId,
      table.email
    ),

    // Multi-tenant queries
    orgRoleIdx: index("idx_users_org_role").on(
      table.organizationId,
      table.role
    ),
    orgStatusIdx: index("idx_users_org_status").on(
      table.organizationId,
      table.status
    ),

    // Email lookup
    emailIdx: index("idx_users_email").on(table.email),

    // RLS Policies - users can only see/edit within their organization
    ...standardRlsPolicies("users"),
  })
);

// ============================================================================
// USER SESSIONS TABLE (for tracking active sessions)
// Table category: userScoped (per column-patterns.json)
// ============================================================================

export const userSessions = pgTable(
  "user_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Session identification
    sessionToken: text("session_token").notNull(),

    // Client information
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"), // Using text to support IPv6

    // Session lifecycle
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    ...timestampColumns,
    ...auditColumns,
    version: integer("version").notNull().default(1),
  },
  (table) => ({
    // Unique session token
    sessionTokenUnique: uniqueIndex("idx_sessions_token_unique").on(
      table.sessionToken
    ),

    // User's sessions
    userIdx: index("idx_sessions_user").on(table.userId),

    // Active sessions query (not expired)
    userExpiresIdx: index("idx_sessions_user_expires").on(
      table.userId,
      table.expiresAt
    ),

    // Expiration cleanup queries
    expiresIdx: index("idx_sessions_expires").on(table.expiresAt),

    // RLS Policies - users can only access sessions for users in their org
    selectPolicy: pgPolicy("user_sessions_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`user_id IN (
        SELECT id FROM users
        WHERE organization_id = current_setting('app.organization_id', true)::uuid
      )`,
    }),
    deletePolicy: pgPolicy("user_sessions_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`user_id IN (
        SELECT id FROM users
        WHERE organization_id = current_setting('app.organization_id', true)::uuid
      )`,
    }),
    // Note: Insert/update handled by app logic, sessions created by auth system
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  sessions: many(userSessions),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;

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
  index,
  uniqueIndex,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { userRoleEnum, userStatusEnum, userTypeEnum } from "./enums";
import { timestampColumns, auditColumns, softDeleteColumn } from "./patterns";
import { organizations } from "./organizations";

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
  [key: string]: unknown;
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
    authId: uuid("auth_id").notNull(),

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
    selectPolicy: pgPolicy("users_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
    insertPolicy: pgPolicy("users_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
    updatePolicy: pgPolicy("users_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
      withCheck: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
    deletePolicy: pgPolicy("users_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
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

    // Session info
    sessionToken: text("session_token").notNull(),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),

    // Timestamps
    expiresAt: timestampColumns.createdAt, // Reusing timestamp pattern
    lastActiveAt: timestampColumns.updatedAt,
    createdAt: timestampColumns.createdAt,
  },
  (table) => ({
    // Unique session token
    sessionTokenUnique: uniqueIndex("idx_sessions_token_unique").on(
      table.sessionToken
    ),

    // User's sessions
    userIdx: index("idx_sessions_user").on(table.userId),
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

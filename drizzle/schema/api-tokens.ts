/**
 * API Tokens Schema
 *
 * Enables programmatic access to the API for third-party integrations.
 * Tokens are hashed for security; the plaintext token is only shown once on creation.
 * Table category: system (per column-patterns.json)
 *
 * @see _Initiation/_prd/1-foundation/auth/auth-foundation.prd.json FOUND-AUTH-007a
 */

import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { users } from "./users";
import { organizations } from "./organizations";

// ============================================================================
// TYPES
// ============================================================================

/**
 * API Token scope type derived from enum.
 */
export type ApiTokenScope = "read" | "write" | "admin";

/**
 * Scopes stored as JSONB array for flexibility.
 */
export interface ApiTokenScopes {
  scopes: ApiTokenScope[];
}

// ============================================================================
// API TOKENS TABLE
// ============================================================================

export const apiTokens = pgTable(
  "api_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // User-provided name for identification (e.g., "CI/CD Pipeline", "Zapier Integration")
    name: text("name").notNull(),

    // Hashed token (bcrypt or similar) - never store plaintext
    hashedToken: text("hashed_token").notNull(),

    // Token prefix for identification without revealing the token
    // Format: first 8 chars of token (e.g., "renoz_ab")
    tokenPrefix: text("token_prefix").notNull(),

    // Owner of the token
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Organization scope (multi-tenant isolation)
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Permitted scopes as JSONB array
    // Using JSONB for flexibility in scope combinations
    scopes: jsonb("scopes").$type<ApiTokenScope[]>().notNull().default(["read"]),

    // Expiration (null = never expires)
    expiresAt: timestamp("expires_at", { withTimezone: true }),

    // Usage tracking
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    lastUsedIp: text("last_used_ip"),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // Revocation (soft delete for audit trail)
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedBy: uuid("revoked_by").references(() => users.id),
    revokedReason: text("revoked_reason"),
  },
  (table) => [
    // Fast lookup by hashed token (most common query)
    index("api_tokens_hashed_token_idx").on(table.hashedToken),

    // List tokens by user
    index("api_tokens_user_id_idx").on(table.userId),

    // List tokens by organization
    index("api_tokens_organization_id_idx").on(table.organizationId),

    // Find active tokens (not revoked, not expired)
    index("api_tokens_active_idx").on(
      table.organizationId,
      table.revokedAt,
      table.expiresAt
    ),

    // Token prefix lookup (for display/identification)
    index("api_tokens_prefix_idx").on(table.tokenPrefix),

    // RLS: Users can only see/manage tokens in their organization
    pgPolicy("api_tokens_org_isolation", {
      as: "permissive",
      for: "all",
      to: "authenticated",
      using: sql`organization_id = (
        SELECT organization_id FROM users WHERE auth_id = auth.uid()
      )`,
      withCheck: sql`organization_id = (
        SELECT organization_id FROM users WHERE auth_id = auth.uid()
      )`,
    }),

    // RLS: Only token owner or admin can manage their tokens
    pgPolicy("api_tokens_owner_access", {
      as: "permissive",
      for: "all",
      to: "authenticated",
      using: sql`
        user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM users
          WHERE auth_id = auth.uid()
          AND role IN ('owner', 'admin')
          AND organization_id = api_tokens.organization_id
        )
      `,
    }),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const apiTokensRelations = relations(apiTokens, ({ one }) => ({
  user: one(users, {
    fields: [apiTokens.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [apiTokens.organizationId],
    references: [organizations.id],
  }),
  revokedByUser: one(users, {
    fields: [apiTokens.revokedBy],
    references: [users.id],
    relationName: "revokedByUser",
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ApiToken = typeof apiTokens.$inferSelect;
export type NewApiToken = typeof apiTokens.$inferInsert;

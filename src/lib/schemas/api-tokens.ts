/**
 * API Token Zod Schemas
 *
 * Validation schemas for API token operations.
 *
 * @see drizzle/schema/api-tokens.ts for database schema
 * @see src/lib/server/api-tokens.ts for server functions
 */

import { z } from "zod";

// ============================================================================
// SCOPE ENUM
// ============================================================================

/**
 * API token scope values.
 * @see canonical-enums.json#/enums/apiTokenScope
 */
export const API_TOKEN_SCOPES = ["read", "write", "admin"] as const;
export type ApiTokenScope = (typeof API_TOKEN_SCOPES)[number];

export const apiTokenScopeSchema = z.enum(API_TOKEN_SCOPES);

// ============================================================================
// CREATE TOKEN SCHEMAS
// ============================================================================

/**
 * Schema for creating a new API token.
 */
export const createApiTokenSchema = z.object({
  /** User-friendly name for the token (e.g., "CI/CD Pipeline", "Zapier Integration") */
  name: z
    .string()
    .min(1, "Token name is required")
    .max(100, "Token name must be 100 characters or less"),

  /** Permissions granted to this token */
  scopes: z
    .array(apiTokenScopeSchema)
    .min(1, "At least one scope is required")
    .default(["read"]),

  /** Optional expiration date. Null means never expires. */
  expiresAt: z.coerce.date().nullable().optional(),
});

export type CreateApiTokenInput = z.infer<typeof createApiTokenSchema>;

/**
 * Response when creating a token - includes plaintext token (shown only once).
 */
export const createApiTokenResponseSchema = z.object({
  /** Token ID for reference */
  id: z.string().uuid(),

  /** User-provided name */
  name: z.string(),

  /** The plaintext token - ONLY returned on creation, never stored */
  token: z.string(),

  /** Token prefix for identification */
  tokenPrefix: z.string(),

  /** Granted scopes */
  scopes: z.array(apiTokenScopeSchema),

  /** When the token expires (null = never) */
  expiresAt: z.date().nullable(),

  /** When the token was created */
  createdAt: z.date(),
});

export type CreateApiTokenResponse = z.infer<typeof createApiTokenResponseSchema>;

// ============================================================================
// LIST TOKENS SCHEMAS
// ============================================================================

/**
 * Token item as returned in list (masked - no plaintext token).
 */
export const apiTokenListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  tokenPrefix: z.string(),
  scopes: z.array(apiTokenScopeSchema),
  expiresAt: z.date().nullable(),
  lastUsedAt: z.date().nullable(),
  createdAt: z.date(),
  revokedAt: z.date().nullable(),
  isExpired: z.boolean(),
  isRevoked: z.boolean(),
});

export type ApiTokenListItem = z.infer<typeof apiTokenListItemSchema>;

// ============================================================================
// REVOKE TOKEN SCHEMAS
// ============================================================================

/**
 * Schema for revoking a token.
 */
export const revokeApiTokenSchema = z.object({
  /** Token ID to revoke */
  tokenId: z.string().uuid(),

  /** Optional reason for revocation */
  reason: z.string().max(500).optional(),
});

export type RevokeApiTokenInput = z.infer<typeof revokeApiTokenSchema>;

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for validating a token (used internally).
 */
export const validateApiTokenSchema = z.object({
  /** The plaintext token to validate (format: renoz_<base64>) */
  token: z.string().regex(/^renoz_[A-Za-z0-9+/=]+$/, "Invalid token format"),
});

export type ValidateApiTokenInput = z.infer<typeof validateApiTokenSchema>;

/**
 * Context returned when a token is validated.
 * Note: hasScope is a runtime function, not part of the Zod schema.
 */
export interface ApiTokenContext {
  /** Token ID */
  tokenId: string;
  /** User who owns the token */
  userId: string;
  /** Organization the token belongs to */
  organizationId: string;
  /** Scopes granted to this token */
  scopes: ApiTokenScope[];
  /** Whether the token has a specific scope */
  hasScope: (scope: ApiTokenScope) => boolean;
}

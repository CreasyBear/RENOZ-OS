/**
 * API Token Server Functions
 *
 * Server-side operations for API token management.
 * Tokens enable programmatic access for third-party integrations.
 *
 * Security considerations:
 * - Plaintext token is returned ONLY on creation (never stored)
 * - Tokens are hashed using bcrypt (cost factor 12) for secure storage
 * - Token prefix enables fast lookup before bcrypt verification
 * - Validation uses constant-time bcrypt.compare
 * - Last used timestamp tracked for auditing
 *
 * @see drizzle/schema/api-tokens.ts for database schema
 * @see src/lib/schemas/auth.ts for Zod schemas
 */

import bcrypt from "bcrypt";
import { createServerFn } from "@tanstack/react-start";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiTokens } from "../../../drizzle/schema";
import { withAuth } from "./protected";
import { AuthError, PermissionDeniedError, NotFoundError } from "./errors";
import {
  createApiTokenSchema,
  revokeApiTokenSchema,
  type CreateApiTokenResponse,
  type ApiTokenListItem,
  type ApiTokenScope,
} from "@/lib/schemas/auth";

/** bcrypt cost factor - 12 is recommended for 2024+ */
const BCRYPT_ROUNDS = 12;

// ============================================================================
// CRYPTO UTILITIES
// ============================================================================

/**
 * Generate a cryptographically secure random token.
 * Format: renoz_<32 bytes base64> (approx 48 chars total)
 */
function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const base64 = btoa(String.fromCharCode(...bytes));
  return `renoz_${base64}`;
}

/**
 * Extract the prefix from a token for identification.
 * Returns first 12 characters (e.g., "renoz_abc123")
 */
function getTokenPrefix(token: string): string {
  return token.slice(0, 12);
}

/**
 * Hash a token using bcrypt for secure storage.
 * bcrypt includes salt automatically and is designed for password/secret storage.
 */
async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, BCRYPT_ROUNDS);
}

/**
 * Verify a token against a bcrypt hash.
 * Uses constant-time comparison internally.
 */
async function verifyToken(token: string, hash: string): Promise<boolean> {
  return bcrypt.compare(token, hash);
}


// ============================================================================
// SERVER FUNCTIONS
// ============================================================================

/**
 * Create a new API token.
 * Returns the plaintext token ONCE - it cannot be retrieved later.
 *
 * Required permission: api_token.create (admin roles only)
 */
export const createApiToken = createServerFn({ method: "POST" })
  .inputValidator(createApiTokenSchema)
  .handler(async ({ data }): Promise<CreateApiTokenResponse> => {
    const ctx = await withAuth({ permission: "api_token.create" });

    // Generate and hash token
    const plainToken = generateToken();
    const hashedToken = await hashToken(plainToken);
    const tokenPrefix = getTokenPrefix(plainToken);

    // Insert into database
    const [newToken] = await db
      .insert(apiTokens)
      .values({
        name: data.name,
        hashedToken,
        tokenPrefix,
        userId: ctx.user.id,
        organizationId: ctx.organizationId,
        scopes: data.scopes,
        expiresAt: data.expiresAt ?? null,
      })
      .returning({
        id: apiTokens.id,
        name: apiTokens.name,
        tokenPrefix: apiTokens.tokenPrefix,
        scopes: apiTokens.scopes,
        expiresAt: apiTokens.expiresAt,
        createdAt: apiTokens.createdAt,
      });

    return {
      id: newToken.id,
      name: newToken.name,
      token: plainToken, // Only time this is returned
      tokenPrefix: newToken.tokenPrefix,
      scopes: newToken.scopes as ApiTokenScope[],
      expiresAt: newToken.expiresAt,
      createdAt: newToken.createdAt,
    };
  });

/**
 * List all API tokens for the current user.
 * Returns masked tokens (no plaintext).
 *
 * Admins can see all tokens in their organization.
 */
export const listApiTokens = createServerFn({ method: "GET" }).handler(
  async (): Promise<ApiTokenListItem[]> => {
    const ctx = await withAuth();

    // Build query based on role
    const isAdmin = ctx.role === "owner" || ctx.role === "admin";

    const tokens = await db
      .select({
        id: apiTokens.id,
        name: apiTokens.name,
        tokenPrefix: apiTokens.tokenPrefix,
        scopes: apiTokens.scopes,
        expiresAt: apiTokens.expiresAt,
        lastUsedAt: apiTokens.lastUsedAt,
        createdAt: apiTokens.createdAt,
        revokedAt: apiTokens.revokedAt,
      })
      .from(apiTokens)
      .where(
        and(
          eq(apiTokens.organizationId, ctx.organizationId),
          isAdmin ? undefined : eq(apiTokens.userId, ctx.user.id)
        )
      )
      .orderBy(apiTokens.createdAt);

    const now = new Date();

    return tokens.map((token) => ({
      id: token.id,
      name: token.name,
      tokenPrefix: token.tokenPrefix,
      scopes: token.scopes as ApiTokenScope[],
      expiresAt: token.expiresAt,
      lastUsedAt: token.lastUsedAt,
      createdAt: token.createdAt,
      revokedAt: token.revokedAt,
      isExpired: token.expiresAt ? token.expiresAt < now : false,
      isRevoked: token.revokedAt !== null,
    }));
  }
);

/**
 * Revoke an API token.
 * Sets revokedAt timestamp (soft delete for audit trail).
 *
 * Users can revoke their own tokens. Admins can revoke any token in org.
 */
export const revokeApiToken = createServerFn({ method: "POST" })
  .inputValidator(revokeApiTokenSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth();

    // Find the token
    const [token] = await db
      .select({
        id: apiTokens.id,
        userId: apiTokens.userId,
        organizationId: apiTokens.organizationId,
        revokedAt: apiTokens.revokedAt,
      })
      .from(apiTokens)
      .where(eq(apiTokens.id, data.tokenId))
      .limit(1);

    if (!token) {
      throw new NotFoundError("API token not found", "api_token");
    }

    // Check organization
    if (token.organizationId !== ctx.organizationId) {
      throw new NotFoundError("API token not found", "api_token");
    }

    // Check ownership or admin
    const isAdmin = ctx.role === "owner" || ctx.role === "admin";
    if (token.userId !== ctx.user.id && !isAdmin) {
      throw new PermissionDeniedError(
        "You can only revoke your own tokens",
        "api_token.revoke"
      );
    }

    // Already revoked?
    if (token.revokedAt) {
      return { success: true }; // Idempotent
    }

    // Revoke the token
    await db
      .update(apiTokens)
      .set({
        revokedAt: new Date(),
        revokedBy: ctx.user.id,
        revokedReason: data.reason,
      })
      .where(eq(apiTokens.id, data.tokenId));

    return { success: true };
  });

/**
 * Validate an API token and return its context.
 * Used internally by API middleware - not exposed as a public server function.
 *
 * Token validation uses a two-step process:
 * 1. Look up candidates by token prefix (fast database lookup)
 * 2. Verify the full token using bcrypt.compare (constant-time)
 *
 * @param token - The plaintext token to validate
 * @returns Token context with userId, organizationId, and scopes
 * @throws AuthError if token is invalid, expired, or revoked
 */
export async function validateApiToken(token: string): Promise<{
  tokenId: string;
  userId: string;
  organizationId: string;
  scopes: ApiTokenScope[];
  hasScope: (scope: ApiTokenScope) => boolean;
}> {
  // Validate format
  if (!token.startsWith("renoz_")) {
    throw new AuthError("Invalid API token format");
  }

  // Extract prefix for fast lookup
  const prefix = getTokenPrefix(token);

  // Find candidate tokens by prefix (usually 1 match, rarely more)
  const candidates = await db
    .select({
      id: apiTokens.id,
      hashedToken: apiTokens.hashedToken,
      userId: apiTokens.userId,
      organizationId: apiTokens.organizationId,
      scopes: apiTokens.scopes,
      expiresAt: apiTokens.expiresAt,
      revokedAt: apiTokens.revokedAt,
    })
    .from(apiTokens)
    .where(
      and(
        eq(apiTokens.tokenPrefix, prefix),
        isNull(apiTokens.revokedAt) // Only check non-revoked tokens
      )
    );

  // Verify against candidates using bcrypt (constant-time)
  let foundToken: (typeof candidates)[number] | null = null;
  for (const candidate of candidates) {
    const isValid = await verifyToken(token, candidate.hashedToken);
    if (isValid) {
      foundToken = candidate;
      break;
    }
  }

  if (!foundToken) {
    throw new AuthError("Invalid API token");
  }

  // Check if expired (revoked already filtered in query)
  if (foundToken.expiresAt && foundToken.expiresAt < new Date()) {
    throw new AuthError("API token has expired");
  }

  // Update last used timestamp (fire and forget)
  db.update(apiTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiTokens.id, foundToken.id))
    .catch(() => {}); // Ignore errors for this non-critical update

  const scopes = foundToken.scopes as ApiTokenScope[];

  return {
    tokenId: foundToken.id,
    userId: foundToken.userId,
    organizationId: foundToken.organizationId,
    scopes,
    hasScope: (scope: ApiTokenScope) => scopes.includes(scope),
  };
}

/**
 * Check if a scope grants a specific permission level.
 * Scope hierarchy: admin > write > read
 */
export function scopeIncludesPermission(
  scopes: ApiTokenScope[],
  required: ApiTokenScope
): boolean {
  if (scopes.includes("admin")) return true;
  if (required === "write" && scopes.includes("write")) return true;
  if (required === "read" && (scopes.includes("read") || scopes.includes("write")))
    return true;
  return scopes.includes(required);
}

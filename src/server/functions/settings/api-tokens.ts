'use server'

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
import { apiTokens, activities } from "../../../../drizzle/schema";
import { withAuth } from "@/lib/server/protected";
import { AuthError, PermissionDeniedError, NotFoundError } from "@/lib/server/errors";
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
 *
 * NOTE: Uses transaction to ensure token creation and audit log are atomic.
 * For security-sensitive operations, we use synchronous logging within the transaction.
 */
export const createApiToken = createServerFn({ method: "POST" })
  .inputValidator(createApiTokenSchema)
  .handler(async ({ data }): Promise<CreateApiTokenResponse> => {
    const ctx = await withAuth({ permission: "api_token.create" });

    // Generate and hash token (outside transaction - crypto operations)
    const plainToken = generateToken();
    const hashedToken = await hashToken(plainToken);
    const tokenPrefix = getTokenPrefix(plainToken);

    // Use transaction to ensure atomicity of token creation and audit log
    const newToken = await db.transaction(async (tx) => {
      // Insert token
      const [token] = await tx
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

      // Activity logging within transaction (security-sensitive operation)
      await tx.insert(activities).values({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        entityType: 'user',
        entityId: ctx.user.id,
        action: 'created',
        description: `Created API token: ${token.name}`,
        entityName: ctx.user.name ?? ctx.user.email,
        metadata: {
          tokenId: token.id,
          tokenName: token.name,
          tokenPrefix: token.tokenPrefix,
          scopes: token.scopes,
          expiresAt: token.expiresAt?.toISOString() ?? null,
        },
        createdBy: ctx.user.id,
      });

      return token;
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
 *
 * NOTE: Uses transaction to ensure revocation and audit log are atomic.
 * For security-sensitive operations, we use synchronous logging within the transaction.
 */
export const revokeApiToken = createServerFn({ method: "POST" })
  .inputValidator(revokeApiTokenSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth();

    // Find the token with all details needed for logging
    const [token] = await db
      .select({
        id: apiTokens.id,
        name: apiTokens.name,
        tokenPrefix: apiTokens.tokenPrefix,
        userId: apiTokens.userId,
        organizationId: apiTokens.organizationId,
        revokedAt: apiTokens.revokedAt,
      })
      .from(apiTokens)
      .where(eq(apiTokens.id, data.tokenId))
      .limit(1);

    if (!token) {
      throw new NotFoundError("Token not found");
    }

    // Check permissions
    const isAdmin = ctx.role === "owner" || ctx.role === "admin";
    const isOwner = token.userId === ctx.user.id;

    if (!isAdmin && !isOwner) {
      throw new PermissionDeniedError("You can only revoke your own tokens");
    }

    if (token.organizationId !== ctx.organizationId) {
      throw new AuthError("Invalid organization");
    }

    if (token.revokedAt) {
      return { success: true }; // Already revoked
    }

    // Use transaction to ensure atomicity of revocation and audit log
    await db.transaction(async (tx) => {
      // Revoke the token
      await tx
        .update(apiTokens)
        .set({ revokedAt: new Date() })
        .where(eq(apiTokens.id, data.tokenId));

      // Activity logging within transaction (security-sensitive operation)
      await tx.insert(activities).values({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        entityType: 'user',
        entityId: token.userId,
        action: 'updated',
        description: `Revoked API token: ${token.name}`,
        entityName: ctx.user.name ?? ctx.user.email,
        metadata: {
          tokenId: data.tokenId,
          tokenName: token.name,
          tokenPrefix: token.tokenPrefix,
          revokedBy: ctx.user.id,
          tokenOwnerId: token.userId,
          previousStatus: 'active',
          newStatus: 'revoked',
        },
        createdBy: ctx.user.id,
      });
    });

    return { success: true };
  });

// ============================================================================
// INTERNAL TOKEN VALIDATION
// ============================================================================

/**
 * Validate a token string and return the token record if valid.
 * Used for API authentication in middleware.
 *
 * @param token - The plaintext token from Authorization header
 * @returns Token record if valid, null if invalid
 */
export async function validateApiToken(token: string) {
  if (!token || !token.startsWith("renoz_")) {
    return null;
  }

  const tokenPrefix = getTokenPrefix(token);

  // Find token by prefix (fast lookup)
  const [tokenRecord] = await db
    .select()
    .from(apiTokens)
    .where(
      and(
        eq(apiTokens.tokenPrefix, tokenPrefix),
        isNull(apiTokens.revokedAt)
      )
    )
    .limit(1);

  if (!tokenRecord) {
    return null;
  }

  // Check expiration
  if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) {
    return null;
  }

  // Verify hash
  const isValid = await verifyToken(token, tokenRecord.hashedToken);
  if (!isValid) {
    return null;
  }

  // Update last used timestamp (fire and forget)
  db
    .update(apiTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiTokens.id, tokenRecord.id))
    .catch(console.error);

  return tokenRecord;
}

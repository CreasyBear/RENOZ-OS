/**
 * Inbox Email Accounts Server Functions
 *
 * Server functions for managing external email account connections via OAuth.
 * Wraps OAuth connection management with inbox-specific logic.
 *
 * @see src/server/functions/oauth/connections.ts - OAuth connection functions
 * @see src/lib/oauth/flow.ts - OAuth flow initiation
 */

import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { eq, and } from "drizzle-orm";
import { withAuth } from "@/lib/server/protected";
import { db } from "@/lib/db";
import { oauthConnections } from "drizzle/schema/oauth";
import { initiateOAuthFlow, handleOAuthCallback } from "@/lib/oauth/flow";
import { deleteOAuthConnection } from "@/server/functions/oauth/connections";
import { NotFoundError, ServerError } from "@/lib/server/errors";
import { LIMITS } from "@/lib/constants";
import { getAppUrl } from "@/lib/email/config";
import {
  connectInboxEmailAccountSchema,
  oauthCallbackSchema,
  syncInboxEmailAccountSchema,
} from "@/lib/schemas/communications/inbox-accounts";

// ============================================================================
// LIST EMAIL ACCOUNTS
// ============================================================================

/**
 * Lists all email account connections for the current organization.
 */
export const listInboxEmailAccounts = createServerFn({ method: "GET" })
  .handler(async () => {
    const ctx = await withAuth();
    const fullConnections = await db
      .select()
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.organizationId, ctx.organizationId),
          eq(oauthConnections.serviceType, "email"),
          eq(oauthConnections.isActive, true)
        )
      )
      .limit(50);

    // Transform OAuth connections to inbox email accounts
    const accounts = fullConnections.map((conn) => {
      // Determine status based on connection state
      let status: "connected" | "disconnected" | "error" = "connected";

      if (!conn.isActive) {
        status = "disconnected";
      } else if (conn.lastSyncedAt) {
        // Check if token expired (rough check - tokens expire after ~1 hour)
        const hoursSinceSync = (Date.now() - conn.lastSyncedAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceSync > 24) {
          status = "disconnected";
        }
      }

      // Extract email from externalAccountId (should be set during OAuth flow)
      const email = conn.externalAccountId || `account@${conn.provider === "google_workspace" ? "gmail.com" : "outlook.com"}`;

      return {
        id: conn.id,
        organizationId: conn.organizationId,
        userId: conn.userId,
        provider: conn.provider as "google_workspace" | "microsoft_365",
        email,
        externalAccountId: conn.externalAccountId || undefined,
        status,
        lastSyncedAt: conn.lastSyncedAt || null,
        createdAt: conn.createdAt,
        updatedAt: conn.updatedAt,
      };
    });

    return {
      accounts,
      total: accounts.length,
    };
  });

// ============================================================================
// CONNECT EMAIL ACCOUNT
// ============================================================================

/**
 * Initiates OAuth flow for connecting an external email account.
 * Returns authorization URL to redirect user to.
 */
export const connectInboxEmailAccount = createServerFn({ method: "POST" })
  .inputValidator(connectInboxEmailAccountSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const redirectUrl = data.redirectUrl || `${getAppUrl()}/communications/settings/inbox-accounts/callback`;

    const flowUrls = await initiateOAuthFlow({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      provider: data.provider,
      services: ["email"], // Only email service for inbox
      redirectUrl,
      db,
    });

    return {
      authorizationUrl: flowUrls.authorizationUrl,
      state: flowUrls.state,
    };
  });

// ============================================================================
// OAUTH CALLBACK
// ============================================================================

/**
 * Handles OAuth callback and creates email account connection.
 */
export const handleInboxEmailAccountCallback = createServerFn({ method: "POST" })
  .inputValidator(oauthCallbackSchema)
  .handler(async ({ data }) => {
    await withAuth();
    const result = await handleOAuthCallback({
      code: data.code,
      state: data.state,
      db,
    });

    if (!result.success) {
      throw new ServerError(result.errorDescription || "Failed to connect email account");
    }

    return {
      success: true,
      connectionIds: result.connectionIds,
      provider: result.provider,
    };
  });

// ============================================================================
// SYNC EMAIL ACCOUNT
// ============================================================================

/**
 * Triggers a manual sync of an email account.
 * Note: Actual sync logic would be implemented in a background job.
 */
export const syncInboxEmailAccount = createServerFn({ method: "POST" })
  .inputValidator(syncInboxEmailAccountSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const [connection] = await db
      .select()
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.id, data.connectionId),
          eq(oauthConnections.organizationId, ctx.organizationId),
          eq(oauthConnections.serviceType, "email")
        )
      )
      .limit(1);

    if (!connection) {
      throw new NotFoundError("Email account connection not found", "oauth_connection");
    }

    const { syncInboxEmailsTask } = await import("@/trigger/jobs/sync-inbox-emails");
    await syncInboxEmailsTask.trigger({
      connectionId: data.connectionId,
      organizationId: ctx.organizationId,
      manualSync: data.manualSync,
      maxEmails: LIMITS.EMAIL_SYNC_MAX_EMAILS,
    });

    return {
      success: true,
      connectionId: data.connectionId,
    };
  });

// ============================================================================
// DELETE EMAIL ACCOUNT
// ============================================================================

/**
 * Deletes an email account connection.
 */
const deleteInboxEmailAccountSchema = z.object({ connectionId: z.string().uuid() });

export const deleteInboxEmailAccount = createServerFn({ method: "POST" })
  .inputValidator(deleteInboxEmailAccountSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const result = await deleteOAuthConnection(db, {
      connectionId: data.connectionId,
      organizationId: ctx.organizationId,
    });

    if (!result.success) {
      throw new ServerError(result.error);
    }

    return {
      success: true,
    };
  });

/**
 * Sync Inbox Emails Job (Trigger.dev v3)
 *
 * Background job for syncing emails from connected external email accounts (Gmail/Outlook).
 * Runs on-demand (manual sync) or scheduled (automatic sync).
 *
 * Features:
 * - Fetches emails from Gmail/Outlook APIs
 * - Handles token refresh automatically
 * - Stores synced emails in email_history table
 * - Updates connection lastSyncedAt timestamp
 * - Extracts user email address from provider
 *
 * @see src/lib/email-providers/gmail.ts
 * @see src/lib/email-providers/outlook.ts
 * @see src/lib/oauth/token-refresh.ts
 */

"use server";

import { task, logger } from "@trigger.dev/sdk/v3";
import { eq, and, sql, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { oauthConnections } from "drizzle/schema/oauth";
import { emailHistory } from "drizzle/schema/communications/email-history";
import { fetchGmailEmails, getGmailUserEmail, type GmailEmail } from "@/lib/email-providers/gmail";
import {
  fetchOutlookEmails,
  getOutlookUserEmail,
  type OutlookEmail,
} from "@/lib/email-providers/outlook";
import { refreshOAuthTokens } from "@/lib/oauth/token-refresh";
import {
  EmailAuthError,
  EmailSyncError,
  isEmailAuthError,
  isEmailSyncError,
} from "@/lib/email-providers/errors";

// ============================================================================
// TYPES
// ============================================================================

export interface SyncInboxEmailsPayload {
  connectionId: string;
  organizationId: string;
  manualSync?: boolean;
  maxEmails?: number; // Limit number of emails to sync per run
}

export interface SyncInboxEmailsResult {
  success: boolean;
  connectionId: string;
  emailsSynced: number;
  emailsSkipped: number;
  errors: string[];
  userEmail?: string;
}

// ============================================================================
// TASK DEFINITION
// ============================================================================

export const syncInboxEmailsTask = task({
  id: "sync-inbox-emails",
  retry: {
    maxAttempts: 3,
    factor: 2,
  },
  run: async (payload: SyncInboxEmailsPayload) => {
    logger.info("Starting inbox email sync", { connectionId: payload.connectionId });

    const result: SyncInboxEmailsResult = {
      success: false,
      connectionId: payload.connectionId,
      emailsSynced: 0,
      emailsSkipped: 0,
      errors: [],
    };

    try {
      // Wrap sync operation in transaction to hold lock for entire operation
      // This prevents concurrent syncs and ensures atomicity
      const syncResult = await db.transaction(async (tx) => {
        // Get connection with row-level lock to prevent concurrent syncs
        const [connection] = await tx
          .select()
          .from(oauthConnections)
          .where(
            and(
              eq(oauthConnections.id, payload.connectionId),
              eq(oauthConnections.organizationId, payload.organizationId),
              eq(oauthConnections.serviceType, "email"),
              eq(oauthConnections.isActive, true)
            )
          )
          .limit(1)
          .for("update"); // Row-level lock held for transaction duration

        if (!connection) {
          throw new Error("Email connection not found or inactive");
        }

        // Check if sync is already in progress (within last 5 minutes)
        if (connection.lastSyncedAt) {
          const minutesSinceSync = (Date.now() - connection.lastSyncedAt.getTime()) / (1000 * 60);
          if (minutesSinceSync < 5 && !payload.manualSync) {
            logger.info("Sync already in progress, skipping", {
              connectionId: payload.connectionId,
              minutesSinceSync,
            });
            return {
              ...result,
              success: true,
              emailsSynced: 0,
              emailsSkipped: 0,
              errors: ["Sync already in progress"],
            };
          }
        }

        // Refresh token if needed - with error handling
        if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
          logger.info("Refreshing expired token", { connectionId: payload.connectionId });
          const refreshResult = await refreshOAuthTokens(
            db, // refreshOAuthTokens uses its own transaction, so we pass db
            payload.connectionId,
            payload.organizationId
          );

          if (!refreshResult.success) {
            // Token refresh failed - mark connection as inactive (use tx for atomicity)
            logger.error("Token refresh failed, marking connection inactive", {
              connectionId: payload.connectionId,
              error: refreshResult.errorMessage,
            });

            await tx
              .update(oauthConnections)
              .set({
                isActive: false,
                updatedAt: new Date(),
              })
              .where(eq(oauthConnections.id, payload.connectionId));

            throw new EmailAuthError({
              code: "refresh_token_expired",
              provider: connection.provider as "google_workspace" | "microsoft_365",
              message: refreshResult.errorMessage || "Token refresh failed",
              requiresReauth: true,
            });
          }

          // Re-fetch connection after refresh to get updated tokens (use tx for consistency)
          const [refreshedConnection] = await tx
            .select()
            .from(oauthConnections)
            .where(eq(oauthConnections.id, payload.connectionId))
            .limit(1);

          if (refreshedConnection) {
            Object.assign(connection, refreshedConnection);
          }
        }

        // Get user email address from provider (for externalAccountId)
        // Fail fast if we can't determine user email - don't proceed with "unknown@example.com"
        let userEmail: string;
        try {
          if (connection.provider === "google_workspace") {
            userEmail = await getGmailUserEmail(db, payload.connectionId, payload.organizationId);
          } else {
            userEmail = await getOutlookUserEmail(db, payload.connectionId, payload.organizationId);
          }

          if (!userEmail || userEmail === "unknown@example.com") {
            throw new Error("Unable to determine user email address");
          }

          result.userEmail = userEmail;

          // Update connection with user email if not set (use tx for consistency)
          if (!connection.externalAccountId && userEmail) {
            await tx
              .update(oauthConnections)
              .set({ externalAccountId: userEmail })
              .where(eq(oauthConnections.id, payload.connectionId));
          }
        } catch (error) {
          logger.error("Failed to get user email - aborting sync", {
            error,
            connectionId: payload.connectionId,
          });
          throw new EmailSyncError({
            code: "fetch_failed",
            provider: connection.provider as "google_workspace" | "microsoft_365",
            message: `Failed to get user email: ${error instanceof Error ? error.message : "Unknown error"}`,
            cause: error instanceof Error ? error : undefined,
          });
        }

        // Fetch emails based on provider - with rate limit handling
        let emails: Array<GmailEmail | OutlookEmail>;
        try {
          if (connection.provider === "google_workspace") {
            const gmailResult = await fetchGmailEmails(db, {
              connectionId: payload.connectionId,
              organizationId: payload.organizationId,
              maxResults: payload.maxEmails || 50,
              query: payload.manualSync ? undefined : "is:unread", // Only unread for auto-sync
            });
            emails = gmailResult.emails;
          } else {
            const outlookResult = await fetchOutlookEmails(db, {
              connectionId: payload.connectionId,
              organizationId: payload.organizationId,
              top: payload.maxEmails || 50,
              filter: payload.manualSync ? undefined : "isRead eq false", // Only unread for auto-sync
            });
            emails = outlookResult.emails;
          }
        } catch (error) {
          // Check for rate limiting errors
          if (error instanceof Error && error.message.includes("429")) {
            const retryAfter = extractRetryAfter(error.message);
            throw new EmailSyncError({
              code: "rate_limited",
              provider: connection.provider as "google_workspace" | "microsoft_365",
              message: "API rate limit exceeded",
              retryAfter,
              cause: error,
            });
          }

          // Check for auth errors
          if (error instanceof Error && (error.message.includes("401") || error.message.includes("403"))) {
            throw new EmailAuthError({
              code: "unauthorized",
              provider: connection.provider as "google_workspace" | "microsoft_365",
              message: error.message,
              requiresReauth: true,
              cause: error,
            });
          }

          throw error;
        }

        logger.info("Fetched emails from provider", {
          connectionId: payload.connectionId,
          count: emails.length,
        });

        // Store emails in email_history with improved duplicate detection
        for (const email of emails) {
          try {
            // Check if email already exists (by provider message ID in metadata)
            // Improved: Add null check and use proper JSONB query
            const existingEmails = await tx
              .select()
              .from(emailHistory)
              .where(
                and(
                  eq(emailHistory.organizationId, payload.organizationId),
                  isNotNull(emailHistory.metadata), // Ensure metadata exists
                  sql`${emailHistory.metadata}->>'providerMessageId' = ${email.id}`,
                  sql`${emailHistory.metadata}->>'provider' = ${connection.provider}`
                )
              )
              .limit(1);

            if (existingEmails.length > 0) {
              result.emailsSkipped++;
              continue;
            }

            // Insert email into email_history (use tx for atomicity)
            await tx.insert(emailHistory).values({
              organizationId: payload.organizationId,
              fromAddress: email.from,
              toAddress: email.to[0] || userEmail, // Use first recipient or user's own email
              subject: email.subject,
              bodyHtml: email.bodyHtml || null,
              bodyText: email.bodyText || null,
              status: "delivered", // Synced emails are considered delivered
              sentAt: email.sentAt,
              deliveredAt: email.receivedAt,
              metadata: {
                fromName: email.fromName,
                providerMessageId: email.id,
                provider: connection.provider,
                source: "synced",
                cc: email.cc,
                bcc: email.bcc,
                attachments: email.attachments?.map((att) => ({
                  name: att.filename,
                  size: att.size,
                  type: ("mimeType" in att ? att.mimeType : att.contentType) || "application/octet-stream",
                })),
              },
            });

          result.emailsSynced++;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          logger.error("Failed to store email", {
            error: errorMsg,
            emailId: email.id,
            connectionId: payload.connectionId,
          });
          result.errors.push(`Failed to store email ${email.id}: ${errorMsg}`);
        }
      }

        // Update connection lastSyncedAt (use tx for atomicity)
        await tx
          .update(oauthConnections)
          .set({ lastSyncedAt: new Date() })
          .where(eq(oauthConnections.id, payload.connectionId));

        result.success = true;

        logger.info("Completed inbox email sync", {
          connectionId: payload.connectionId,
          emailsSynced: result.emailsSynced,
          emailsSkipped: result.emailsSkipped,
        });

        return result;
      });

      // Transaction completed successfully
      return syncResult;
    } catch (error) {
      // Handle structured auth errors - mark connection inactive
      if (isEmailAuthError(error)) {
        logger.error("Inbox sync failed - authentication error", {
          connectionId: payload.connectionId,
          errorCode: error.code,
          errorMessage: error.message,
          requiresReauth: error.requiresReauth,
          provider: error.provider,
        });

        if (error.requiresReauth) {
          // Mark as inactive - user needs to re-authenticate
          try {
            await db
              .update(oauthConnections)
              .set({
                isActive: false,
                updatedAt: new Date(),
              })
              .where(eq(oauthConnections.id, payload.connectionId));

            logger.error("Connection marked as inactive - requires reauth", {
              connectionId: payload.connectionId,
              errorCode: error.code,
              provider: error.provider,
            });
          } catch (updateError) {
            logger.error("Failed to mark connection inactive", {
              connectionId: payload.connectionId,
              error: updateError,
            });
          }
        }

        result.errors.push(`Authentication failed (${error.code}): ${error.message}`);
        result.success = false;
        return result;
      }

      // Handle structured sync errors - retryable errors
      if (isEmailSyncError(error)) {
        logger.warn("Inbox sync failed - sync error", {
          connectionId: payload.connectionId,
          errorCode: error.code,
          errorMessage: error.message,
          isRetryable: error.isRetryable(),
          retryAfter: error.retryAfter,
          provider: error.provider,
        });

        // Sync errors are typically transient - don't change connection status
        // Let the job retry mechanism handle it
        result.errors.push(`Sync error (${error.code}): ${error.message}`);
        result.success = false;
        return result;
      }

      // Handle unknown errors (fallback)
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      logger.error("Inbox email sync failed - unknown error", {
        error: errorMsg,
        connectionId: payload.connectionId,
      });

      result.errors.push(errorMsg);
      result.success = false;

      return result;
    }
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extracts retry-after value from error message or headers.
 * Returns seconds to wait before retry.
 */
function extractRetryAfter(errorMessage: string): number | undefined {
  // Try to extract from error message (e.g., "Retry-After: 60")
  const retryAfterMatch = errorMessage.match(/retry[_-]after[:\s]+(\d+)/i);
  if (retryAfterMatch) {
    return parseInt(retryAfterMatch[1], 10);
  }
  return undefined;
}

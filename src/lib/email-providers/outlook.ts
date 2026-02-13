/**
 * Outlook Provider Utilities
 *
 * Utilities for fetching emails from Microsoft Graph API.
 * Handles authentication, token refresh, and email extraction.
 *
 * @see src/lib/oauth/token-refresh.ts - Token refresh logic
 */

import { Client } from "@microsoft/microsoft-graph-client";
import { decryptOAuthToken } from "@/lib/oauth/token-encryption";
import { refreshOAuthTokens } from "@/lib/oauth/token-refresh";
import type { OAuthDatabase } from "@/lib/oauth/db-types";
import { oauthConnections } from "drizzle/schema/oauth";
import { eq, and } from "drizzle-orm";
import { EmailAuthError, EmailSyncError } from "./errors";
import type {
  OutlookEmailRecipient,
  OutlookMessageAttachment,
} from "@/lib/schemas/integrations/email";

// ============================================================================
// TYPES
// ============================================================================

export interface OutlookEmail {
  id: string;
  conversationId: string;
  subject: string;
  from: string;
  fromName: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  bodyText: string;
  bodyHtml: string;
  receivedAt: Date;
  sentAt: Date;
  attachments?: Array<{
    id: string;
    filename: string;
    contentType: string;
    size: number;
  }>;
}

export interface FetchOutlookEmailsOptions {
  connectionId: string;
  organizationId: string;
  top?: number;
  skip?: number;
  filter?: string; // OData filter (e.g., "isRead eq false", "receivedDateTime ge 2024-01-01T00:00:00Z")
}

// ============================================================================
// OUTLOOK CLIENT
// ============================================================================

/**
 * Gets authenticated Microsoft Graph client for a connection.
 * Handles token refresh automatically.
 */
export async function getOutlookClient(
  db: OAuthDatabase,
  connectionId: string,
  organizationId: string
): Promise<Client> {
  // Get connection with tokens
  const [connection] = await db
    .select()
    .from(oauthConnections)
    .where(
      and(
        eq(oauthConnections.id, connectionId),
        eq(oauthConnections.organizationId, organizationId),
        eq(oauthConnections.provider, "microsoft_365"),
        eq(oauthConnections.serviceType, "email")
      )
    )
    .limit(1);

  if (!connection) {
    throw new EmailAuthError({
      code: "token_invalid",
      provider: "microsoft_365",
      message: "Outlook connection not found",
      requiresReauth: true,
    });
  }

  if (!connection.isActive) {
    throw new EmailAuthError({
      code: "token_invalid",
      provider: "microsoft_365",
      message: "Outlook connection is not active",
      requiresReauth: true,
    });
  }

  // Check if token needs refresh
  if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
    const refreshResult = await refreshOAuthTokens(db, connectionId, organizationId);
    
    if (!refreshResult.success) {
      throw new EmailAuthError({
        code: "refresh_token_expired",
        provider: "microsoft_365",
        message: refreshResult.errorMessage || "Token refresh failed",
        requiresReauth: true,
      });
    }

    // Re-fetch connection after refresh
    const [refreshed] = await db
      .select()
      .from(oauthConnections)
      .where(eq(oauthConnections.id, connectionId))
      .limit(1);
    if (!refreshed) {
      throw new EmailAuthError({
        code: "token_invalid",
        provider: "microsoft_365",
        message: "Failed to refresh connection",
        requiresReauth: true,
      });
    }
    connection.accessToken = refreshed.accessToken;
    connection.tokenExpiresAt = refreshed.tokenExpiresAt;
  }

  // Decrypt access token
  const accessToken = decryptOAuthToken(connection.accessToken, organizationId);

  // Create Graph client with auth provider
  const client = Client.init({
    authProvider: (done: (err: Error | null, accessToken: string | null) => void) => {
      done(null, accessToken ?? null);
    },
  });

  return client;
}

// ============================================================================
// EMAIL FETCHING
// ============================================================================

/**
 * Fetches emails from Microsoft Graph API.
 */
export async function fetchOutlookEmails(
  db: OAuthDatabase,
  options: FetchOutlookEmailsOptions
): Promise<{
  emails: OutlookEmail[];
  hasMore: boolean;
  skipToken?: string;
}> {
  const client = await getOutlookClient(db, options.connectionId, options.organizationId);

  // Build query parameters
  const queryParams: Record<string, string> = {
    $top: String(options.top || 50),
    $select: "id,conversationId,subject,sender,toRecipients,ccRecipients,bccRecipients,body,bodyPreview,receivedDateTime,createdDateTime,hasAttachments,attachments",
  };

  if (options.skip) {
    queryParams.$skip = String(options.skip);
  }

  if (options.filter) {
    queryParams.$filter = options.filter;
  }

  const queryString = new URLSearchParams(queryParams).toString();
  
  // Fetch with rate limit handling
  let response;
  try {
    response = await client.api(`/me/messages?${queryString}`).get();
  } catch (error: unknown) {
    const err = error as { statusCode?: number; headers?: Record<string, string>; message?: string };
    // Handle rate limiting (429)
    if (err?.statusCode === 429) {
      const retryAfter = err?.headers?.["retry-after"]
        ? parseInt(err.headers["retry-after"], 10)
        : undefined;
      throw new EmailSyncError({
        code: "rate_limited",
        provider: "microsoft_365",
        message: "Microsoft Graph API rate limit exceeded",
        retryAfter,
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }

    // Handle auth errors
    if (err?.statusCode === 401 || err?.statusCode === 403) {
      throw new EmailAuthError({
        code: err?.statusCode === 401 ? "unauthorized" : "forbidden",
        provider: "microsoft_365",
        message: err?.message || "Microsoft Graph API authentication failed",
        requiresReauth: true,
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }

    throw error;
  }

  const messages = response.value || [];
  const emails: OutlookEmail[] = [];

  for (const message of messages) {
    // Fetch full message with body if needed
    let fullMessage = message;
    if (!message.body) {
      fullMessage = await client.api(`/me/messages/${message.id}`).get();
    }

    // Fetch attachments if needed
    let attachments: Array<{ id: string; filename: string; contentType: string; size: number }> =
      [];
    if (message.hasAttachments) {
      const attachmentsResponse = await client
        .api(`/me/messages/${message.id}/attachments`)
        .get();
      attachments = (attachmentsResponse.value || []).map((att: OutlookMessageAttachment) => ({
        id: att.id,
        filename: att.name || "attachment",
        contentType: att.contentType || "application/octet-stream",
        size: att.size || 0,
      }));
    }

    emails.push({
      id: message.id,
      conversationId: message.conversationId || "",
      subject: message.subject || "(No subject)",
      from: message.sender?.emailAddress?.address || "",
      fromName: message.sender?.emailAddress?.name || message.sender?.emailAddress?.address || "",
      to: (message.toRecipients || []).map(
        (r: OutlookEmailRecipient) => r.emailAddress?.address || ""
      ),
      cc:
        message.ccRecipients && message.ccRecipients.length > 0
          ? message.ccRecipients.map((r: OutlookEmailRecipient) => r.emailAddress?.address || "")
          : undefined,
      bcc:
        message.bccRecipients && message.bccRecipients.length > 0
          ? message.bccRecipients.map((r: OutlookEmailRecipient) => r.emailAddress?.address || "")
          : undefined,
      bodyText: fullMessage.body?.contentType === "text" ? fullMessage.body.content : fullMessage.bodyPreview || "",
      bodyHtml: fullMessage.body?.contentType === "html" ? fullMessage.body.content : "",
      receivedAt: new Date(message.receivedDateTime || message.createdDateTime),
      sentAt: new Date(message.createdDateTime),
      attachments: attachments.length > 0 ? attachments : undefined,
    });
  }

  return {
    emails,
    hasMore: response["@odata.nextLink"] ? true : false,
    skipToken: response["@odata.nextLink"]?.split("$skipToken=")[1],
  };
}

/**
 * Gets user email address from Microsoft Graph API.
 */
export async function getOutlookUserEmail(
  db: OAuthDatabase,
  connectionId: string,
  organizationId: string
): Promise<string> {
  const client = await getOutlookClient(db, connectionId, organizationId);

  const profile = await client.api("/me").get();

  return profile.mail || profile.userPrincipalName || "";
}

/**
 * Gmail Provider Utilities
 *
 * Utilities for fetching emails from Gmail API.
 * Handles authentication, token refresh, and email extraction.
 *
 * @see src/lib/oauth/token-refresh.ts - Token refresh logic
 */

import { google } from "googleapis";
import { decryptOAuthToken } from "@/lib/oauth/token-encryption";
import { refreshOAuthTokens } from "@/lib/oauth/token-refresh";
import type { OAuthDatabase } from "@/lib/oauth/db-types";
import { oauthConnections } from "drizzle/schema/oauth";
import { eq, and } from "drizzle-orm";
import { EmailAuthError, EmailSyncError } from "./errors";
import { logger } from "@/lib/logger";
import type {
  GmailMessagePart,
  GmailMessagePayload,
} from "@/lib/schemas/integrations/email";

// ============================================================================
// TYPES
// ============================================================================

export interface GmailEmail {
  id: string;
  threadId: string;
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
    mimeType: string;
    size: number;
  }>;
}

export interface FetchGmailEmailsOptions {
  connectionId: string;
  organizationId: string;
  maxResults?: number;
  pageToken?: string;
  query?: string; // Gmail search query (e.g., "is:unread", "from:example@gmail.com")
}

// ============================================================================
// GMAIL CLIENT
// ============================================================================

/**
 * Gets authenticated Gmail client for a connection.
 * Handles token refresh automatically.
 */
export async function getGmailClient(
  db: OAuthDatabase,
  connectionId: string,
  organizationId: string
) {
  // Get connection with tokens
  const [connection] = await db
    .select()
    .from(oauthConnections)
    .where(
      and(
        eq(oauthConnections.id, connectionId),
        eq(oauthConnections.organizationId, organizationId),
        eq(oauthConnections.provider, "google_workspace"),
        eq(oauthConnections.serviceType, "email")
      )
    )
    .limit(1);

  if (!connection) {
    throw new EmailAuthError({
      code: "token_invalid",
      provider: "google_workspace",
      message: "Gmail connection not found",
      requiresReauth: true,
    });
  }

  if (!connection.isActive) {
    throw new EmailAuthError({
      code: "token_invalid",
      provider: "google_workspace",
      message: "Gmail connection is not active",
      requiresReauth: true,
    });
  }

  // Check if token needs refresh
  if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
    const refreshResult = await refreshOAuthTokens(db, connectionId, organizationId);
    
    if (!refreshResult.success) {
      throw new EmailAuthError({
        code: "refresh_token_expired",
        provider: "google_workspace",
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
        provider: "google_workspace",
        message: "Failed to refresh connection",
        requiresReauth: true,
      });
    }
    connection.accessToken = refreshed.accessToken;
    connection.refreshToken = refreshed.refreshToken;
    connection.tokenExpiresAt = refreshed.tokenExpiresAt;
  }

  // Decrypt tokens
  const accessToken = decryptOAuthToken(connection.accessToken, organizationId);
  const refreshToken = connection.refreshToken
    ? decryptOAuthToken(connection.refreshToken, organizationId)
    : undefined;

  // Create OAuth2 client
  // Use GOOGLE_WORKSPACE_* env vars to match flow.ts
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_WORKSPACE_CLIENT_ID,
    process.env.GOOGLE_WORKSPACE_CLIENT_SECRET,
    process.env.GOOGLE_WORKSPACE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  // Create Gmail client
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  return gmail;
}

// ============================================================================
// EMAIL FETCHING
// ============================================================================

/**
 * Fetches emails from Gmail API.
 */
export async function fetchGmailEmails(
  db: OAuthDatabase,
  options: FetchGmailEmailsOptions
): Promise<{
  emails: GmailEmail[];
  hasMore: boolean;
  nextPageToken?: string;
}> {
  const gmail = await getGmailClient(db, options.connectionId, options.organizationId);

  // List messages with rate limit handling
  let listResponse;
  try {
    listResponse = await gmail.users.messages.list({
      userId: "me",
      maxResults: options.maxResults || 50,
      pageToken: options.pageToken,
      q: options.query, // Gmail search query
    });
  } catch (error: unknown) {
    const err = error as { code?: number; response?: { status?: number; headers?: Record<string, string> }; message?: string };
    // Handle rate limiting (429) and quota errors
    if (err?.code === 429 || err?.response?.status === 429) {
      const retryAfter = err?.response?.headers?.["retry-after"]
        ? parseInt(err.response.headers["retry-after"], 10)
        : undefined;
      throw new EmailSyncError({
        code: "rate_limited",
        provider: "google_workspace",
        message: "Gmail API rate limit exceeded",
        retryAfter,
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }

    // Handle auth errors
    if (err?.code === 401 || err?.response?.status === 401) {
      throw new EmailAuthError({
        code: "unauthorized",
        provider: "google_workspace",
        message: "Gmail API authentication failed",
        requiresReauth: true,
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }

    // Handle quota exceeded
    if (err?.code === 403 && err?.message?.includes("quota")) {
      throw new EmailSyncError({
        code: "quota_exceeded",
        provider: "google_workspace",
        message: "Gmail API quota exceeded",
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }

    throw error;
  }

  const messages = listResponse.data.messages || [];
  const emails: GmailEmail[] = [];

  // Fetch full message details
  for (const message of messages) {
    if (!message.id) continue;

    try {
      const messageResponse = await gmail.users.messages.get({
        userId: "me",
        id: message.id,
        format: "full",
      });

      const msg = messageResponse.data;
      const payload = msg.payload;

      if (!payload) continue;

      // Extract headers
      const headers = payload.headers || [];
      const getHeader = (name: string) =>
        headers.find((h) => (h.name ?? "").toLowerCase() === name.toLowerCase())?.value ?? "";

      const subject = getHeader("subject") || "(No subject)";
      const from = getHeader("from") || "";
      const fromName = from.match(/^(.+?)\s*<(.+)>$/) ? from.match(/^(.+?)\s*<(.+)>$/)?.[1] || "" : "";
      const fromEmail = from.match(/<(.+)>$/) ? from.match(/<(.+)>$/)?.[1] || from : from;
      const toHeader = getHeader("to") || "";
      const to = toHeader.split(",").map((email: string) => email.trim());
      const ccHeader = getHeader("cc");
      const cc = ccHeader ? ccHeader.split(",").map((email: string) => email.trim()) : undefined;
      const bccHeader = getHeader("bcc");
      const bcc = bccHeader ? bccHeader.split(",").map((email: string) => email.trim()) : undefined;

      // Extract body and attachments using shared helpers (cast: Schema$MessagePart compatible)
      const payloadTyped = payload as GmailMessagePayload["payload"];
      const { text: bodyText, html: bodyHtml } = extractGmailBody(payloadTyped);
      const attachments = extractGmailAttachments(payloadTyped);

      // Parse dates
      const internalDate = msg.internalDate ? parseInt(msg.internalDate, 10) : Date.now();
      const receivedAt = new Date(internalDate);
      const sentAt = new Date(internalDate); // Gmail doesn't separate sent/received dates in list

      emails.push({
        id: msg.id || "",
        threadId: msg.threadId || "",
        subject,
        from: fromEmail,
        fromName: fromName || fromEmail,
        to,
        cc,
        bcc,
        bodyText,
        bodyHtml,
        receivedAt,
        sentAt,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
    } catch (error) {
      logger.error(`Failed to fetch Gmail message ${message.id}`, error);
      // Continue with other messages
    }
  }

  return {
    emails,
    hasMore: !!listResponse.data.nextPageToken,
    nextPageToken: listResponse.data.nextPageToken || undefined,
  };
}

/**
 * Parses a Gmail message into our internal format.
 * Helper function for extracting email data from Gmail API response.
 */
export function parseGmailMessage(
  msg: import("@/lib/schemas/integrations/email").GmailMessagePayload
): GmailEmail | null {
  const payload = msg.payload;
  if (!payload) return null;

  const headers = payload.headers || [];
  const getHeader = (name: string) =>
    headers.find((h: { name?: string | null; value?: string | null }) =>
      (h.name ?? "").toLowerCase() === name.toLowerCase()
    )?.value ?? "";

  const subject = getHeader("subject") || "(No subject)";
  const from = getHeader("from") || "";
  const fromMatch = from.match(/^(.+?)\s*<(.+)>$/) || [null, "", from];
  const fromName = fromMatch[1]?.trim() || "";
  const fromEmail = fromMatch[2] || from;

  const toHeader = getHeader("to") || "";
  const to = toHeader.split(",").map((email: string) => email.trim());
  const ccHeader = getHeader("cc");
  const cc = ccHeader ? ccHeader.split(",").map((email: string) => email.trim()) : undefined;
  const bccHeader = getHeader("bcc");
  const bcc = bccHeader ? bccHeader.split(",").map((email: string) => email.trim()) : undefined;

  // Extract body and attachments using shared helpers (cast: Schema$MessagePart compatible)
  const payloadTyped = payload as GmailMessagePayload["payload"];
  const { text: bodyText, html: bodyHtml } = extractGmailBody(payloadTyped);
  const attachments = extractGmailAttachments(payloadTyped);

  const internalDate = msg.internalDate ? parseInt(msg.internalDate, 10) : Date.now();
  const receivedAt = new Date(internalDate);
  const sentAt = new Date(internalDate);

  return {
    id: msg.id || "",
    threadId: msg.threadId || "",
    subject,
    from: fromEmail,
    fromName: fromName || fromEmail,
    to,
    cc,
    bcc,
    bodyText,
    bodyHtml,
    receivedAt,
    sentAt,
    attachments: attachments.length > 0 ? attachments : undefined,
  };
}

/**
 * Extracts HTML body from Gmail message payload.
 */
export function extractGmailBody(
  payload: import("@/lib/schemas/integrations/email").GmailMessagePayload["payload"]
): { text: string; html: string } {
  let text = "";
  let html = "";
  if (!payload) return { text, html };

  if (payload.body?.data) {
    const decoded = Buffer.from(payload.body.data, "base64").toString("utf-8");
    if (payload.mimeType === "text/html") {
      html = decoded;
      text = decoded.replace(/<[^>]*>/g, "");
    } else {
      text = decoded;
    }
  } else if (payload.parts) {
    const extractBody = (parts: GmailMessagePart[]): { text: string; html: string } => {
      let t = "";
      let h = "";

      for (const part of parts) {
        if (part.mimeType === "text/plain" && part.body?.data) {
          t = Buffer.from(part.body.data, "base64").toString("utf-8");
        } else if (part.mimeType === "text/html" && part.body?.data) {
          h = Buffer.from(part.body.data, "base64").toString("utf-8");
        } else if (part.parts) {
          const nested = extractBody(part.parts);
          if (nested.text) t = nested.text;
          if (nested.html) h = nested.html;
        }
      }

      return { text: t, html: h };
    };

    const extracted = extractBody(payload.parts);
    text = extracted.text;
    html = extracted.html;
  }

  return { text, html };
}

/**
 * Extracts attachments from Gmail message payload.
 */
export function extractGmailAttachments(
  payload: import("@/lib/schemas/integrations/email").GmailMessagePayload["payload"]
): Array<{
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}> {
  if (!payload?.parts) return [];
  const attachments: Array<{
    id: string;
    filename: string;
    mimeType: string;
    size: number;
  }> = [];

  const extractAttachments = (parts: GmailMessagePart[]) => {
    for (const part of parts) {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          id: part.body.attachmentId,
          filename: part.filename,
          mimeType: part.mimeType || "application/octet-stream",
          size: part.body.size || 0,
        });
      }
      if (part.parts) {
        extractAttachments(part.parts);
      }
    }
  };

  if (payload.parts) {
    extractAttachments(payload.parts);
  }

  return attachments;
}

/**
 * Gets user email address from Gmail API.
 */
export async function getGmailUserEmail(
  db: OAuthDatabase,
  connectionId: string,
  organizationId: string
): Promise<string> {
  const gmail = await getGmailClient(db, connectionId, organizationId);

  const profile = await gmail.users.getProfile({
    userId: "me",
  });

  return profile.data.emailAddress || "";
}

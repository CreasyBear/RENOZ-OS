/**
 * Email Integration Types
 *
 * Raw API response shapes for Gmail and Microsoft Graph.
 * Only consumed fields are typed; APIs may return additional fields.
 */

// ============================================================================
// Gmail API
// ============================================================================

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailMessagePart {
  mimeType?: string | null;
  filename?: string;
  body?: { data?: string; attachmentId?: string; size?: number };
  parts?: GmailMessagePart[];
  headers?: GmailHeader[];
}

export interface GmailMessagePayload {
  id?: string;
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: {
    mimeType?: string | null;
    headers?: GmailHeader[];
    body?: { data?: string };
    parts?: GmailMessagePart[];
  };
}

// ============================================================================
// Microsoft Graph API
// ============================================================================

export interface OutlookEmailRecipient {
  emailAddress?: { address?: string; name?: string };
}

export interface OutlookMessageAttachment {
  id?: string;
  name?: string;
  contentType?: string;
  size?: number;
  isInline?: boolean;
}

export interface OutlookMessagePayload {
  id?: string;
  conversationId?: string;
  subject?: string;
  from?: OutlookEmailRecipient;
  toRecipients?: OutlookEmailRecipient[];
  ccRecipients?: OutlookEmailRecipient[];
  bccRecipients?: OutlookEmailRecipient[];
  body?: { contentType?: string; content?: string };
  bodyPreview?: string;
  attachments?: OutlookMessageAttachment[];
  categories?: string[];
  isRead?: boolean;
  flag?: { flagStatus?: string };
  importance?: string;
  sentDateTime?: string;
  receivedDateTime?: string;
  createdDateTime?: string;
  internetMessageId?: string;
}

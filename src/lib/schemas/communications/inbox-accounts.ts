/**
 * Inbox Email Accounts Schemas
 *
 * Schemas for managing external email account connections via OAuth.
 * Wraps OAuth connections with inbox-specific types and validation.
 *
 * @see drizzle/schema/oauth/oauth-connections.ts - Underlying OAuth schema
 */

import { z } from "zod";

// ============================================================================
// PROVIDER TYPES
// ============================================================================

export const inboxEmailProviderSchema = z.enum(["google_workspace", "microsoft_365"]);
export type InboxEmailProvider = z.infer<typeof inboxEmailProviderSchema>;

// ============================================================================
// CONNECTION STATUS
// ============================================================================

export const inboxEmailAccountStatusSchema = z.enum(["connected", "disconnected", "error"]);
export type InboxEmailAccountStatus = z.infer<typeof inboxEmailAccountStatusSchema>;

// ============================================================================
// INBOX EMAIL ACCOUNT
// ============================================================================

export const inboxEmailAccountSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  provider: inboxEmailProviderSchema,
  email: z.string().email(),
  externalAccountId: z.string().optional(),
  status: inboxEmailAccountStatusSchema,
  lastSyncedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type InboxEmailAccount = z.infer<typeof inboxEmailAccountSchema>;

// ============================================================================
// LIST RESPONSE
// ============================================================================

export const inboxEmailAccountsListSchema = z.object({
  accounts: z.array(inboxEmailAccountSchema),
  total: z.number(),
});

export type InboxEmailAccountsList = z.infer<typeof inboxEmailAccountsListSchema>;

// ============================================================================
// CONNECT REQUEST
// ============================================================================

export const connectInboxEmailAccountSchema = z.object({
  provider: inboxEmailProviderSchema,
  redirectUrl: z.string().url().optional(),
});

export type ConnectInboxEmailAccountRequest = z.infer<typeof connectInboxEmailAccountSchema>;

// ============================================================================
// OAUTH CALLBACK
// ============================================================================

export const oauthCallbackSchema = z.object({
  code: z.string(),
  state: z.string(),
});

export type OAuthCallbackRequest = z.infer<typeof oauthCallbackSchema>;

// ============================================================================
// SYNC REQUEST
// ============================================================================

export const syncInboxEmailAccountSchema = z.object({
  connectionId: z.string().uuid(),
  manualSync: z.boolean().default(false),
});

export type SyncInboxEmailAccountRequest = z.infer<typeof syncInboxEmailAccountSchema>;

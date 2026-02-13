/**
 * OAuth Connection Types
 *
 * Minimal shapes for OAuth connection objects used across OAuth and calendar sync.
 * Full connection records come from drizzle schema; these types cover the fields
 * consumed by sync engines and API boundaries.
 */

/** Minimal connection shape for sync engine (id, org, provider only) */
export interface ConnectionForSyncEngine {
  id: string;
  organizationId: string;
  provider: string;
}

/** Minimal OAuth connection shape for calendar/email sync (tokens + identifiers) */
export interface OAuthConnectionForSync {
  id: string;
  organizationId: string;
  userId: string | null;
  provider: 'google_workspace' | 'microsoft_365';
  externalAccountId: string | null;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  scopes: string[] | null;
  isActive: boolean;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

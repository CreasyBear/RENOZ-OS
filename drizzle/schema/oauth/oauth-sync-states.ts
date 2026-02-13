/**
 * OAuth Sync State Tracking
 *
 * Stores provider sync tokens for incremental sync.
 */

import { pgTable, uuid, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { organizations } from '../settings/organizations';
import { oauthConnections } from './oauth-connections';
import {
  timestampColumns,
  standardRlsPolicies,
} from '../_shared/patterns';

export const oauthSyncStates = pgTable(
  'oauth_sync_states',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    connectionId: uuid('connection_id')
      .notNull()
      .references(() => oauthConnections.id, { onDelete: 'cascade' }),
    provider: text('provider', {
      enum: ['google_workspace', 'microsoft_365'],
    }).notNull(),
    serviceType: text('service_type', {
      enum: ['calendar', 'email', 'contacts'],
    }).notNull(),
    syncToken: text('sync_token'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }).notNull(),
    ...timestampColumns,
  },
  (table) => ({
    orgConnIdx: index('idx_oauth_sync_states_org_conn').on(
      table.organizationId,
      table.connectionId
    ),
    connServiceUnique: uniqueIndex('idx_oauth_sync_states_conn_service_unique').on(
      table.connectionId,
      table.serviceType
    ),
    // RLS Policies
    ...standardRlsPolicies("oauth_sync_states"),
  })
);

export type OAuthSyncState = typeof oauthSyncStates.$inferSelect;
export type NewOAuthSyncState = typeof oauthSyncStates.$inferInsert;

/**
 * OAuth Email Messages
 *
 * Stores raw email messages fetched via OAuth providers.
 */

import { pgTable, uuid, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { organizations } from '../settings/organizations';
import { oauthConnections } from './oauth-connections';
import {
  timestampColumns,
  standardRlsPolicies,
} from '../_shared/patterns';

export const oauthEmailMessages = pgTable(
  'oauth_email_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    connectionId: uuid('connection_id')
      .notNull()
      .references(() => oauthConnections.id, { onDelete: 'cascade' }),

    externalId: text('external_id').notNull(),
    threadId: text('thread_id'),
    subject: text('subject'),
    from: jsonb('from').$type<{ email: string; name?: string } | null>(),
    to: jsonb('to').$type<Array<{ email: string; name?: string }>>().default([]),
    receivedAt: timestamp('received_at', { withTimezone: true }),

    raw: jsonb('raw').$type<Record<string, any>>().default({}),

    ...timestampColumns,
  },
  (table) => ({
    orgConnIdx: index('idx_oauth_email_messages_org_conn').on(
      table.organizationId,
      table.connectionId
    ),
    externalIdx: index('idx_oauth_email_messages_external').on(
      table.connectionId,
      table.externalId
    ),
    // RLS Policies
    ...standardRlsPolicies("oauth_email_messages"),
  })
);

export type OAuthEmailMessage = typeof oauthEmailMessages.$inferSelect;
export type NewOAuthEmailMessage = typeof oauthEmailMessages.$inferInsert;

/**
 * OAuth Email Messages
 *
 * Stores raw email messages fetched via OAuth providers.
 */

import { pgTable, pgPolicy, uuid, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from '../settings/organizations';
import { oauthConnections } from './oauth-connections';
import { timestampColumns } from '../_shared/patterns';

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
    selectPolicy: pgPolicy("oauth_email_messages_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("oauth_email_messages_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("oauth_email_messages_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("oauth_email_messages_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

export type OAuthEmailMessage = typeof oauthEmailMessages.$inferSelect;
export type NewOAuthEmailMessage = typeof oauthEmailMessages.$inferInsert;

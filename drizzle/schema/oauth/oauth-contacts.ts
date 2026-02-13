/**
 * OAuth Contact Records
 *
 * Stores contact records fetched via OAuth providers.
 */

import { pgTable, uuid, text, jsonb, index } from 'drizzle-orm/pg-core';
import { organizations } from '../settings/organizations';
import { oauthConnections } from './oauth-connections';
import {
  timestampColumns,
  standardRlsPolicies,
} from '../_shared/patterns';

export const oauthContacts = pgTable(
  'oauth_contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    connectionId: uuid('connection_id')
      .notNull()
      .references(() => oauthConnections.id, { onDelete: 'cascade' }),

    externalId: text('external_id').notNull(),
    fullName: text('full_name'),
    emails: jsonb('emails').$type<string[]>().default([]),
    phones: jsonb('phones').$type<string[]>().default([]),
    raw: jsonb('raw').$type<Record<string, any>>().default({}),

    ...timestampColumns,
  },
  (table) => ({
    orgConnIdx: index('idx_oauth_contacts_org_conn').on(
      table.organizationId,
      table.connectionId
    ),
    externalIdx: index('idx_oauth_contacts_external').on(
      table.connectionId,
      table.externalId
    ),
    // RLS Policies
    ...standardRlsPolicies("oauth_contacts"),
  })
);

export type OAuthContact = typeof oauthContacts.$inferSelect;
export type NewOAuthContact = typeof oauthContacts.$inferInsert;

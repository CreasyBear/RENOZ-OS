/**
 * OAuth Contact Records
 *
 * Stores contact records fetched via OAuth providers.
 */

import { pgTable, pgPolicy, uuid, text, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from '../settings/organizations';
import { oauthConnections } from './oauth-connections';
import { timestampColumns } from '../_shared/patterns';

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
    selectPolicy: pgPolicy("oauth_contacts_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("oauth_contacts_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("oauth_contacts_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("oauth_contacts_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

export type OAuthContact = typeof oauthContacts.$inferSelect;
export type NewOAuthContact = typeof oauthContacts.$inferInsert;

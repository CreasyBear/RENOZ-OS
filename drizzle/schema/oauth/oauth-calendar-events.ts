/**
 * OAuth Calendar Events
 *
 * Stores external calendar events synced via OAuth providers.
 */

import { pgTable, pgPolicy, uuid, text, jsonb, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from '../settings/organizations';
import { oauthConnections } from './oauth-connections';
import { timestampColumns } from '../_shared/patterns';

export const oauthCalendarEvents = pgTable(
  'oauth_calendar_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    connectionId: uuid('connection_id')
      .notNull()
      .references(() => oauthConnections.id, { onDelete: 'cascade' }),

    externalId: text('external_id').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }).notNull(),
    timezone: text('timezone').notNull(),
    location: text('location'),
    status: text('status').notNull(),
    isAllDay: boolean('is_all_day').notNull().default(false),

    raw: jsonb('raw').$type<Record<string, any>>().default({}),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }).notNull(),

    ...timestampColumns,
  },
  (table) => ({
    orgConnIdx: index('idx_oauth_calendar_events_org_conn').on(
      table.organizationId,
      table.connectionId
    ),
    externalIdx: index('idx_oauth_calendar_events_external').on(
      table.connectionId,
      table.externalId
    ),
    // RLS Policies
    selectPolicy: pgPolicy("oauth_calendar_events_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("oauth_calendar_events_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("oauth_calendar_events_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("oauth_calendar_events_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

export type OAuthCalendarEvent = typeof oauthCalendarEvents.$inferSelect;
export type NewOAuthCalendarEvent = typeof oauthCalendarEvents.$inferInsert;

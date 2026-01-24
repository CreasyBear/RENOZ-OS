/**
 * OAuth Calendar Events
 *
 * Stores external calendar events synced via OAuth providers.
 */

import { pgTable, uuid, text, jsonb, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { organizations } from 'drizzle/schema/settings/organizations';
import { oauthConnections } from 'drizzle/schema/oauth/oauth-connections';
import { timestampColumns } from 'drizzle/schema/_shared/patterns';

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
  })
);

export type OAuthCalendarEvent = typeof oauthCalendarEvents.$inferSelect;
export type NewOAuthCalendarEvent = typeof oauthCalendarEvents.$inferInsert;

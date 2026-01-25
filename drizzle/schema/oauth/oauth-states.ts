/**
 * OAuth State Tracking Schema
 *
 * Stores short-lived OAuth state and PKCE verifier values for secure callbacks.
 * Used to validate state, enforce expiration, and prevent replay attacks.
 */

import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { organizations } from '../settings/organizations';
import { users } from '../users/users';
import { timestampColumns } from '../_shared/patterns';

export const oauthStates = pgTable(
  'oauth_states',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    provider: text('provider', {
      enum: ['google_workspace', 'microsoft_365'],
    }).notNull(),
    services: jsonb('services').$type<('calendar' | 'email' | 'contacts')[]>().notNull(),

    redirectUrl: text('redirect_url').notNull(),
    state: text('state').notNull(),

    pkceVerifier: text('pkce_verifier'),
    pkceChallenge: text('pkce_challenge'),
    pkceMethod: text('pkce_method').notNull().default('S256'),

    status: text('status').notNull().default('pending'),
    isConsumed: boolean('is_consumed').notNull().default(false),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),

    metadata: jsonb('metadata').$type<Record<string, any>>().default({}),

    ...timestampColumns,
  },
  (table) => ({
    orgProviderIdx: index('idx_oauth_states_org_provider').on(
      table.organizationId,
      table.provider
    ),
    stateIdx: index('idx_oauth_states_state').on(table.state),
    expiresIdx: index('idx_oauth_states_expires').on(table.expiresAt),
  })
);

export type OAuthState = typeof oauthStates.$inferSelect;
export type NewOAuthState = typeof oauthStates.$inferInsert;

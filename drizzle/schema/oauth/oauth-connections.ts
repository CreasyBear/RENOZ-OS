/**
 * OAuth Connections Schema
 *
 * Stores OAuth tokens and connection metadata for multi-service support.
 * Supports Google Workspace and Microsoft 365 providers with granular service permissions.
 *
 * Table category: integration (per column-patterns.json)
 */

import {
  pgTable,
  uuid,
  text,
  boolean,
  jsonb,
  timestamp,
  index,
  integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { timestampColumns } from 'drizzle/schema/_shared/patterns';
import { organizations } from 'drizzle/schema/settings/organizations';
import { users } from 'drizzle/schema/users/users';

// ============================================================================
// OAUTH CONNECTIONS TABLE
// ============================================================================

export const oauthConnections = pgTable(
  'oauth_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Multi-tenant organization (with FK constraint)
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    // User who created the connection
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // OAuth provider and account details
    provider: text('provider', {
      enum: ['google_workspace', 'microsoft_365'],
    }).notNull(),
    serviceType: text('service_type', {
      enum: ['calendar', 'email', 'contacts'],
    }).notNull(),
    externalAccountId: text('external_account_id'), // Provider's account ID

    // Token storage (encrypted)
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),

    // OAuth scopes and permissions
    scopes: jsonb('scopes').$type<string[]>().notNull().default([]),

    isActive: boolean('is_active').notNull().default(true),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),

    // Optimistic version for connection updates
    version: integer('version').notNull().default(1),

    // Standard columns
    ...timestampColumns,
  },
  (table) => ({
    // Multi-tenant queries with service filtering
    orgUserProviderServiceIdx: index('idx_oauth_connections_org_user_provider_service').on(
      table.organizationId,
      table.userId,
      table.provider,
      table.serviceType
    ),
    // Performance indexes for sync operations
    lastSyncedIdx: index('idx_oauth_connections_last_synced').on(table.lastSyncedAt),
  })
);

// ============================================================================
// OAUTH SYNC LOGS TABLE
// ============================================================================

export const oauthSyncLogs = pgTable(
  'oauth_sync_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Multi-tenant organization (with FK constraint)
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    // Related connection
    connectionId: uuid('connection_id')
      .notNull()
      .references(() => oauthConnections.id, { onDelete: 'cascade' }),

    // Sync operation details
    serviceType: text('service_type', {
      enum: ['calendar', 'email', 'contacts'],
    }).notNull(),
    operation: text('operation').notNull(),
    status: text('status').notNull(),

    // Operation metrics
    recordCount: integer('record_count'),
    errorMessage: text('error_message'),

    // Timing
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    // Additional metadata
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}),

    // Standard columns (no audit columns for logs)
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Query optimization for sync dashboards
    orgConnectionServiceIdx: index('idx_oauth_sync_logs_org_connection_service').on(
      table.organizationId,
      table.connectionId,
      table.serviceType
    ),
    orgStartedIdx: index('idx_oauth_sync_logs_org_started').on(
      table.organizationId,
      table.startedAt
    ),
    // Status filtering for monitoring
    statusIdx: index('idx_oauth_sync_logs_status').on(table.status),
  })
);

// ============================================================================
// OAUTH SERVICE PERMISSIONS TABLE
// ============================================================================

export const oauthServicePermissions = pgTable(
  'oauth_service_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Multi-tenant organization (with FK constraint)
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    // Related connection
    connectionId: uuid('connection_id')
      .notNull()
      .references(() => oauthConnections.id, { onDelete: 'cascade' }),

    // Permission details
    serviceType: text('service_type', {
      enum: ['calendar', 'email', 'contacts'],
    }).notNull(),
    scope: text('scope').notNull(), // OAuth scope value

    // Permission status
    isGranted: boolean('is_granted').notNull().default(false),
    grantedAt: timestamp('granted_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),

    // Standard columns
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Permission lookup optimization
    orgConnectionServiceIdx: index('idx_oauth_service_permissions_org_connection_service').on(
      table.organizationId,
      table.connectionId,
      table.serviceType
    ),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const oauthConnectionsRelations = relations(oauthConnections, ({ many, one }) => ({
  organization: one(organizations, {
    fields: [oauthConnections.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [oauthConnections.userId],
    references: [users.id],
  }),
  syncLogs: many(oauthSyncLogs),
  servicePermissions: many(oauthServicePermissions),
}));

export const oauthSyncLogsRelations = relations(oauthSyncLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [oauthSyncLogs.organizationId],
    references: [organizations.id],
  }),
  connection: one(oauthConnections, {
    fields: [oauthSyncLogs.connectionId],
    references: [oauthConnections.id],
  }),
}));

export const oauthServicePermissionsRelations = relations(oauthServicePermissions, ({ one }) => ({
  organization: one(organizations, {
    fields: [oauthServicePermissions.organizationId],
    references: [organizations.id],
  }),
  connection: one(oauthConnections, {
    fields: [oauthServicePermissions.connectionId],
    references: [oauthConnections.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type OAuthConnection = typeof oauthConnections.$inferSelect;
export type NewOAuthConnection = typeof oauthConnections.$inferInsert;

export type OAuthSyncLog = typeof oauthSyncLogs.$inferSelect;
export type NewOAuthSyncLog = typeof oauthSyncLogs.$inferInsert;

export type OAuthServicePermission = typeof oauthServicePermissions.$inferSelect;
export type NewOAuthServicePermission = typeof oauthServicePermissions.$inferInsert;

/**
 * OAuth Connection Utilities
 *
 * Shared helpers for creating and updating OAuth connection records.
 */

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { and, eq, sql } from 'drizzle-orm';
import { oauthConnections, oauthServicePermissions, oauthSyncLogs } from 'drizzle/schema/oauth';
import { encryptOAuthToken } from './token-encryption';

export interface OAuthConnectionTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scopes: string[];
}

export async function createOAuthConnections(
  db: PostgresJsDatabase<any>,
  params: {
    organizationId: string;
    userId: string;
    provider: 'google_workspace' | 'microsoft_365';
    services: ('calendar' | 'email' | 'contacts')[];
    tokens: OAuthConnectionTokens;
    externalAccountId?: string;
  }
): Promise<string[]> {
  const { organizationId, userId, provider, services, tokens, externalAccountId } = params;

  const encryptedAccessToken = encryptOAuthToken(tokens.accessToken, organizationId);
  const encryptedRefreshToken = tokens.refreshToken
    ? encryptOAuthToken(tokens.refreshToken, organizationId)
    : null;

  const connectionIds: string[] = [];

  for (const service of services) {
    const [connection] = await db
      .insert(oauthConnections)
      .values({
        organizationId,
        userId,
        provider,
        serviceType: service,
        externalAccountId,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: tokens.expiresAt,
        scopes: tokens.scopes,
        isActive: true,
        lastSyncedAt: null,
        version: 1,
      })
      .returning({ id: oauthConnections.id });

    connectionIds.push(connection.id);

    for (const scope of getScopesForService(service, tokens.scopes)) {
      await db.insert(oauthServicePermissions).values({
        organizationId,
        connectionId: connection.id,
        serviceType: service,
        scope,
        isGranted: true,
        grantedAt: new Date(),
      });
    }

    await db.insert(oauthSyncLogs).values({
      organizationId,
      connectionId: connection.id,
      serviceType: service,
      operation: 'connection_create',
      status: 'completed',
      recordCount: 1,
      metadata: {
        provider,
        scopes: tokens.scopes,
        externalAccountId,
      },
      startedAt: new Date(),
      completedAt: new Date(),
    });
  }

  return connectionIds;
}

export async function updateOAuthConnectionTokens(
  db: PostgresJsDatabase<any>,
  params: {
    organizationId: string;
    connectionId: string;
    tokens: OAuthConnectionTokens;
  }
): Promise<void> {
  const encryptedAccessToken = encryptOAuthToken(params.tokens.accessToken, params.organizationId);
  const encryptedRefreshToken = params.tokens.refreshToken
    ? encryptOAuthToken(params.tokens.refreshToken, params.organizationId)
    : null;

  await db
    .update(oauthConnections)
    .set({
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenExpiresAt: params.tokens.expiresAt,
      scopes: params.tokens.scopes,
      isActive: true,
      updatedAt: new Date(),
      version: sql`${oauthConnections.version} + 1`,
    })
    .where(
      and(
        eq(oauthConnections.id, params.connectionId),
        eq(oauthConnections.organizationId, params.organizationId)
      )
    );
}

function getScopesForService(
  service: 'calendar' | 'email' | 'contacts',
  scopes: string[]
): string[] {
  const include = (pattern: string) => scopes.filter((scope) => scope.includes(pattern));

  switch (service) {
    case 'calendar':
      return include('calendar').concat(include('Calendars'));
    case 'email':
      return include('gmail').concat(include('Mail'));
    case 'contacts':
      return include('contacts').concat(include('Contacts'));
    default:
      return [];
  }
}

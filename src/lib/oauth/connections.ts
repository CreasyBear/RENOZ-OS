/**
 * OAuth Connection Utilities
 *
 * Shared helpers for creating and updating OAuth connection records.
 */

import type { OAuthDatabase } from '@/lib/oauth/db-types';
import { and, eq, sql } from 'drizzle-orm';
import { oauthConnections, oauthServicePermissions, oauthSyncLogs } from 'drizzle/schema/oauth';
import { encryptOAuthToken } from './token-encryption';
import type { OAuthProvider, OAuthServiceType } from './constants';

export interface OAuthConnectionTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scopes: string[];
}

async function assertActiveXeroTenantAvailable(
  db: OAuthDatabase,
  params: {
    organizationId: string
    externalAccountId?: string
  }
) {
  if (!params.externalAccountId) {
    return
  }

  const existing = await db
    .select({
      id: oauthConnections.id,
      organizationId: oauthConnections.organizationId,
    })
    .from(oauthConnections)
    .where(
      and(
        eq(oauthConnections.provider, 'xero'),
        eq(oauthConnections.serviceType, 'accounting'),
        eq(oauthConnections.externalAccountId, params.externalAccountId),
        eq(oauthConnections.isActive, true)
      )
    )
    .limit(1)

  if (existing[0] && existing[0].organizationId !== params.organizationId) {
    throw new Error(
      'This Xero tenant is already connected to another organization and cannot be activated here'
    )
  }
}

export async function createOAuthConnections(
  db: OAuthDatabase,
  params: {
    organizationId: string;
    userId: string;
    provider: OAuthProvider;
    services: OAuthServiceType[];
    tokens: OAuthConnectionTokens;
    externalAccountId?: string;
  }
): Promise<string[]> {
  const { organizationId, userId, provider, services, tokens, externalAccountId } = params;

  const encryptedAccessToken = encryptOAuthToken(tokens.accessToken, organizationId);
  const encryptedRefreshToken = tokens.refreshToken
    ? encryptOAuthToken(tokens.refreshToken, organizationId)
    : null;

  return db.transaction(async (tx) => {
    const connectionIds: string[] = [];

    for (const service of services) {
      if (provider === 'xero' && service === 'accounting') {
        await assertActiveXeroTenantAvailable(tx, { organizationId, externalAccountId })

        await tx
          .update(oauthConnections)
          .set({
            isActive: false,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(oauthConnections.organizationId, organizationId),
              eq(oauthConnections.provider, provider),
              eq(oauthConnections.serviceType, service),
              eq(oauthConnections.isActive, true)
            )
          );
      }

      const [connection] = await tx
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
        await tx.insert(oauthServicePermissions).values({
          organizationId,
          connectionId: connection.id,
          serviceType: service,
          scope,
          isGranted: true,
          grantedAt: new Date(),
        });
      }

      await tx.insert(oauthSyncLogs).values({
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
  });
}

export async function updateOAuthConnectionTokens(
  db: OAuthDatabase,
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

  await db.transaction(async (tx) => {
    const [connection] = await tx
      .select({
        provider: oauthConnections.provider,
        serviceType: oauthConnections.serviceType,
      })
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.id, params.connectionId),
          eq(oauthConnections.organizationId, params.organizationId)
        )
      )
      .limit(1);

    if (connection?.provider === 'xero' && connection.serviceType === 'accounting') {
      await tx
        .update(oauthConnections)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(oauthConnections.organizationId, params.organizationId),
            eq(oauthConnections.provider, 'xero'),
            eq(oauthConnections.serviceType, 'accounting'),
            eq(oauthConnections.isActive, true)
          )
        );
    }

    await tx
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
  });
}

function getScopesForService(
  service: OAuthServiceType,
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
    case 'accounting':
      return scopes.filter((scope) => scope.includes('accounting'));
    default:
      return [];
  }
}

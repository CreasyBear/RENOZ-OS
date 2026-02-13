/**
 * OAuth Token Refresh Automation
 *
 * Handles automatic token refresh for OAuth connections.
 * Based on midday's token refresh patterns with exponential backoff.
 */

import type { OAuthDatabase } from '@/lib/oauth/db-types';
import { eq, and, lt, gte, sql, inArray } from 'drizzle-orm';
import { oauthConnections, oauthSyncLogs } from 'drizzle/schema/oauth';
import { encryptOAuthToken, decryptOAuthToken } from './token-encryption';

// ============================================================================
// REFRESH CONFIGURATION
// ============================================================================

export interface TokenRefreshConfig {
  /** Refresh tokens this many minutes before expiry */
  refreshBufferMinutes: number;

  /** Maximum number of refresh attempts per token */
  maxRefreshAttempts: number;

  /** Base delay for exponential backoff (in minutes) */
  baseBackoffMinutes: number;

  /** Maximum backoff delay (in minutes) */
  maxBackoffMinutes: number;

  /** Whether to enable automatic background refresh */
  enableBackgroundRefresh: boolean;
}

export const DEFAULT_REFRESH_CONFIG: TokenRefreshConfig = {
  refreshBufferMinutes: 30, // Refresh 30 minutes before expiry
  maxRefreshAttempts: 3,
  baseBackoffMinutes: 5, // 5 minutes base delay
  maxBackoffMinutes: 1440, // 24 hours max delay
  enableBackgroundRefresh: true,
};

// ============================================================================
// REFRESH SCHEDULING
// ============================================================================

export interface RefreshCandidate {
  connectionId: string;
  organizationId: string;
  provider: 'google_workspace' | 'microsoft_365';
  services: string[];
  tokenExpiresAt: Date;
  refreshToken: string;
  lastRefreshAttempt?: Date;
  refreshAttempts: number;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Finds OAuth connections that need token refresh.
 * Returns connections expiring within the refresh buffer window.
 */
export async function getConnectionsNeedingRefresh(
  db: OAuthDatabase,
  config: TokenRefreshConfig = DEFAULT_REFRESH_CONFIG
): Promise<RefreshCandidate[]> {
  const refreshThreshold = new Date(Date.now() + config.refreshBufferMinutes * 60 * 1000);

  const connections = await db
    .select({
      id: oauthConnections.id,
      organizationId: oauthConnections.organizationId,
      provider: oauthConnections.provider,
      serviceType: oauthConnections.serviceType,
      accessToken: oauthConnections.accessToken,
      refreshToken: oauthConnections.refreshToken,
      tokenExpiresAt: oauthConnections.tokenExpiresAt,
    })
    .from(oauthConnections)
    .where(
      and(
        eq(oauthConnections.isActive, true),
        lt(oauthConnections.tokenExpiresAt, refreshThreshold),
        sql`${oauthConnections.refreshToken} IS NOT NULL`,
        sql`${oauthConnections.tokenExpiresAt} IS NOT NULL`
      )
    )
    .orderBy(oauthConnections.tokenExpiresAt); // Refresh soonest-expiring first

  if (connections.length === 0) {
    return [];
  }

  const connectionIds = connections.map((conn) => conn.id);
  const refreshStats = await db
    .select({
      connectionId: oauthSyncLogs.connectionId,
      lastAttemptAt: sql<Date>`max(${oauthSyncLogs.createdAt})`,
      lastStatus: sql<string>`(array_agg(${oauthSyncLogs.status} order by ${oauthSyncLogs.createdAt} desc))[1]`,
      failedAttempts: sql<number>`count(*) filter (where ${oauthSyncLogs.status} = 'failed' and ${oauthSyncLogs.createdAt} > now() - interval '24 hours')`,
    })
    .from(oauthSyncLogs)
    .where(
      and(
        eq(oauthSyncLogs.operation, 'token_refresh'),
        inArray(oauthSyncLogs.connectionId, connectionIds)
      )
    )
    .groupBy(oauthSyncLogs.connectionId);

  const statsByConnection = new Map(
    refreshStats.map((stat) => [stat.connectionId, stat])
  );

  return connections
    .filter((conn) => conn.tokenExpiresAt)
    .filter((conn) => {
      const stat = statsByConnection.get(conn.id);
      if (!stat?.lastAttemptAt || stat.lastStatus !== 'failed') {
        return true;
      }

      const attempts = stat.failedAttempts ?? 0;
      if (attempts >= config.maxRefreshAttempts) {
        return false;
      }

      const backoffMinutes = Math.min(
        config.maxBackoffMinutes,
        config.baseBackoffMinutes * 2 ** Math.max(attempts - 1, 0)
      );
      const nextAttemptAt = new Date(stat.lastAttemptAt.getTime() + backoffMinutes * 60 * 1000);
      return nextAttemptAt <= new Date();
    })
    .map((conn) => {
      const stat = statsByConnection.get(conn.id);
      const attempts = stat?.failedAttempts ?? 0;
      const lastAttemptAt = stat?.lastAttemptAt ?? undefined;

      return {
        connectionId: conn.id,
        organizationId: conn.organizationId,
        provider: conn.provider as 'google_workspace' | 'microsoft_365',
        services: [conn.serviceType],
        tokenExpiresAt: new Date(conn.tokenExpiresAt as Date),
        refreshToken: conn.refreshToken!,
        lastRefreshAttempt: lastAttemptAt,
        refreshAttempts: attempts,
        priority: calculateRefreshPriority(conn.tokenExpiresAt as Date),
      };
    });
}

/**
 * Calculates refresh priority based on time until expiry.
 */
function calculateRefreshPriority(expiresAt: Date | string): 'high' | 'medium' | 'low' {
  const expiresDate = new Date(expiresAt);
  const now = new Date();
  const minutesUntilExpiry = (expiresDate.getTime() - now.getTime()) / (1000 * 60);

  if (minutesUntilExpiry <= 15) return 'high'; // Expires within 15 minutes
  if (minutesUntilExpiry <= 60) return 'medium'; // Expires within 1 hour
  return 'low'; // Expires later
}

// ============================================================================
// TOKEN REFRESH EXECUTION
// ============================================================================

export interface RefreshResult {
  success: boolean;
  connectionId: string;
  newExpiryDate?: Date;
  errorMessage?: string;
  attempts: number;
}

/**
 * Refreshes OAuth tokens for a specific connection.
 * Handles provider-specific refresh logic with error handling.
 */
export async function refreshOAuthTokens(
  db: OAuthDatabase,
  connectionId: string,
  organizationId: string,
  config: TokenRefreshConfig = DEFAULT_REFRESH_CONFIG
): Promise<RefreshResult> {
  let connection:
    | {
        id: string;
        organizationId: string;
        provider: string;
        serviceType: string;
        refreshToken: string | null;
      }
    | undefined;

  try {
    // Get connection details
    const [selected] = await db
      .select({
        id: oauthConnections.id,
        organizationId: oauthConnections.organizationId,
        provider: oauthConnections.provider,
        serviceType: oauthConnections.serviceType,
        refreshToken: oauthConnections.refreshToken,
      })
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.id, connectionId),
          eq(oauthConnections.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!selected) {
      throw new Error('Connection not found');
    }

    connection = selected;

    if (!connection.refreshToken) {
      throw new Error('No refresh token available');
    }

    // Decrypt refresh token
    let decryptedRefreshToken: string;
    try {
      decryptedRefreshToken = decryptOAuthToken(connection.refreshToken, connection.organizationId);
    } catch {
      throw new Error('Failed to decrypt refresh token');
    }

    // Perform provider-specific refresh
    let newTokens: {
      accessToken: string;
      refreshToken?: string;
      expiresIn: number;
    };

    switch (connection.provider) {
      case 'google_workspace':
        newTokens = await refreshGoogleWorkspaceTokens(decryptedRefreshToken);
        break;
      case 'microsoft_365':
        newTokens = await refreshMicrosoft365Tokens(decryptedRefreshToken);
        break;
      default:
        throw new Error(`Unsupported provider: ${connection.provider}`);
    }

    // Calculate new expiry date
    const newExpiryDate = new Date(Date.now() + newTokens.expiresIn * 1000);

    // Encrypt new tokens
    const encryptedAccessToken = encryptOAuthToken(
      newTokens.accessToken,
      connection.organizationId
    );
    const encryptedRefreshToken = newTokens.refreshToken
      ? encryptOAuthToken(newTokens.refreshToken, connection.organizationId)
      : connection.refreshToken;

    // Update connection with new tokens
    await db
      .update(oauthConnections)
      .set({
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: newExpiryDate,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(oauthConnections.id, connectionId));

    // Log successful refresh
    await db.insert(oauthSyncLogs).values({
      organizationId: connection.organizationId,
      connectionId,
      serviceType: connection.serviceType as 'calendar' | 'email' | 'contacts',
      operation: 'token_refresh',
      status: 'completed',
      recordCount: 1,
      metadata: {
        connectionId,
        newExpiryDate: newExpiryDate.toISOString(),
        tokenRotated: !!newTokens.refreshToken,
      },
      startedAt: new Date(),
      completedAt: new Date(),
    });

    return {
      success: true,
      connectionId,
      newExpiryDate,
      attempts: 1,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update connection with failure metadata
    if (connection) {
      await db
        .update(oauthConnections)
        .set({
          updatedAt: new Date(),
        })
        .where(eq(oauthConnections.id, connectionId));

      // Log failed refresh
      await db.insert(oauthSyncLogs).values({
        organizationId: connection.organizationId,
        connectionId,
        serviceType: connection.serviceType as 'calendar' | 'email' | 'contacts',
        operation: 'token_refresh',
        status: 'failed',
        errorMessage,
        metadata: {
          connectionId,
          maxAttempts: config.maxRefreshAttempts,
        },
        startedAt: new Date(),
        completedAt: new Date(),
      });
    }

    return {
      success: false,
      connectionId,
      errorMessage,
      attempts: 1,
    };
  }
}

// ============================================================================
// PROVIDER-SPECIFIC REFRESH LOGIC
// ============================================================================

/**
 * Refreshes Google Workspace OAuth tokens.
 */
async function refreshGoogleWorkspaceTokens(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}> {
  const clientId = process.env.GOOGLE_WORKSPACE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_WORKSPACE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google Workspace OAuth credentials not configured');
  }

  const tokenUrl = 'https://oauth2.googleapis.com/token';

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    if (errorData.error === 'invalid_grant') {
      throw new Error('Refresh token is invalid or expired - re-authentication required');
    }

    throw new Error(
      `Google token refresh failed: ${errorData.error_description || response.statusText}`
    );
  }

  const tokenData = await response.json();

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token, // May be omitted if same as original
    expiresIn: tokenData.expires_in,
  };
}

/**
 * Refreshes Microsoft 365 OAuth tokens.
 */
async function refreshMicrosoft365Tokens(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}> {
  const clientId = process.env.MICROSOFT365_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT365_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT365_TENANT_ID || 'common';

  if (!clientId || !clientSecret) {
    throw new Error('Microsoft 365 OAuth credentials not configured');
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope:
        'openid email profile https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Contacts.Read',
    }).toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    if (errorData.error === 'invalid_grant') {
      throw new Error('Refresh token is invalid or expired - re-authentication required');
    }

    throw new Error(
      `Microsoft token refresh failed: ${errorData.error_description || response.statusText}`
    );
  }

  const tokenData = await response.json();

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresIn: tokenData.expires_in,
  };
}

// ============================================================================
// BULK REFRESH OPERATIONS
// ============================================================================

export interface BulkRefreshResult {
  totalProcessed: number;
  successfulRefreshes: number;
  failedRefreshes: number;
  results: RefreshResult[];
}

/**
 * Performs bulk token refresh for multiple connections.
 * Processes connections in priority order with concurrency control.
 */
export async function bulkRefreshTokens(
  db: OAuthDatabase,
  options: {
    organizationId?: string;
    provider?: 'google_workspace' | 'microsoft_365';
    maxConcurrency?: number;
    config?: TokenRefreshConfig;
  } = {}
): Promise<BulkRefreshResult> {
  const { organizationId, provider, maxConcurrency = 3, config = DEFAULT_REFRESH_CONFIG } = options;

  try {
    // Get candidates needing refresh
    const candidates = await getConnectionsNeedingRefresh(db, config);

    // Filter by organization/provider if specified
    let filteredCandidates = candidates;
    if (organizationId) {
      filteredCandidates = filteredCandidates.filter((c) => c.organizationId === organizationId);
    }
    if (provider) {
      filteredCandidates = filteredCandidates.filter((c) => c.provider === provider);
    }

    // Sort by priority (high -> medium -> low) and then by expiry time
    filteredCandidates.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.tokenExpiresAt.getTime() - b.tokenExpiresAt.getTime();
    });

    const results: RefreshResult[] = [];
    let successfulRefreshes = 0;
    let failedRefreshes = 0;

    // Process in batches for concurrency control
    for (let i = 0; i < filteredCandidates.length; i += maxConcurrency) {
      const batch = filteredCandidates.slice(i, i + maxConcurrency);

      const batchPromises = batch.map(async (candidate) => {
        const result = await refreshOAuthTokens(
          db,
          candidate.connectionId,
          candidate.organizationId,
          config
        );

        if (result.success) {
          successfulRefreshes++;
        } else {
          failedRefreshes++;
        }

        return result;
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return {
      totalProcessed: filteredCandidates.length,
      successfulRefreshes,
      failedRefreshes,
      results,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    throw new Error(`Bulk token refresh failed: ${errorMessage}`);
  }
}

// ============================================================================
// MONITORING AND STATISTICS
// ============================================================================

/**
 * Gets token refresh statistics for monitoring.
 */
export async function getTokenRefreshStats(
  db: OAuthDatabase,
  organizationId?: string
): Promise<{
  totalConnections: number;
  connectionsNeedingRefresh: number;
  successfulRefreshes: number;
  failedRefreshes: number;
  averageRefreshInterval: number;
}> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const whereConditions = [];
  if (organizationId) {
    whereConditions.push(eq(oauthSyncLogs.organizationId, organizationId));
  }

  // Get refresh operation stats
  const [statsResult] = await db
    .select({
      totalConnections: sql<number>`count(distinct ${oauthConnections.id})`,
      connectionsNeedingRefresh: sql<number>`count(case when ${oauthConnections.tokenExpiresAt} < now() + interval '30 minutes' and ${oauthConnections.refreshToken} is not null then 1 end)`,
      successfulRefreshes: sql<number>`count(case when ${oauthSyncLogs.operation} = 'token_refresh' and ${oauthSyncLogs.status} = 'completed' then 1 end)`,
      failedRefreshes: sql<number>`count(case when ${oauthSyncLogs.operation} = 'token_refresh' and ${oauthSyncLogs.status} = 'failed' then 1 end)`,
      avgRefreshInterval: sql<number>`avg(extract(epoch from (${oauthSyncLogs.createdAt} - lag(${oauthSyncLogs.createdAt}) over (partition by ${oauthSyncLogs.organizationId} order by ${oauthSyncLogs.createdAt}))))`,
    })
    .from(oauthSyncLogs)
    .leftJoin(oauthConnections, eq(oauthSyncLogs.organizationId, oauthConnections.organizationId))
    .where(
      and(
        eq(oauthSyncLogs.operation, 'token_refresh'),
        gte(oauthSyncLogs.createdAt, twentyFourHoursAgo),
        ...whereConditions
      )
    );

  return {
    totalConnections: statsResult?.totalConnections ?? 0,
    connectionsNeedingRefresh: statsResult?.connectionsNeedingRefresh ?? 0,
    successfulRefreshes: statsResult?.successfulRefreshes ?? 0,
    failedRefreshes: statsResult?.failedRefreshes ?? 0,
    averageRefreshInterval: statsResult?.avgRefreshInterval ?? 0,
  };
}

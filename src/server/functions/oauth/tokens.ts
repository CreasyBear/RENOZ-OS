/**
 * OAuth Token Management Server Functions
 *
 * Server functions for token refresh operations and automated token management.
 */

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { z } from 'zod';
import {
  refreshOAuthTokens,
  bulkRefreshTokens,
  getTokenRefreshStats,
  getConnectionsNeedingRefresh,
  type RefreshResult,
  type BulkRefreshResult,
} from '@/lib/oauth/token-refresh';

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

export const RefreshTokensRequestSchema = z.object({
  connectionId: z.string().uuid(),
  organizationId: z.string().uuid(),
});

export const BulkRefreshTokensRequestSchema = z.object({
  organizationId: z.string().uuid().optional(),
  provider: z.enum(['google_workspace', 'microsoft_365']).optional(),
  maxConcurrency: z.number().min(1).max(10).default(3),
});

export const RefreshTokensResponseSchema = z.object({
  success: z.boolean(),
  result: z
    .object({
      connectionId: z.string(),
      newExpiryDate: z.date().optional(),
      attempts: z.number(),
      errorMessage: z.string().optional(),
    })
    .optional(),
  error: z.string().optional(),
});

export const BulkRefreshTokensResponseSchema = z.object({
  success: z.boolean(),
  result: z
    .object({
      totalProcessed: z.number(),
      successfulRefreshes: z.number(),
      failedRefreshes: z.number(),
      results: z.array(
        z.object({
          success: z.boolean(),
          connectionId: z.string(),
          newExpiryDate: z.date().optional(),
          errorMessage: z.string().optional(),
          attempts: z.number(),
        })
      ),
    })
    .optional(),
  error: z.string().optional(),
});

// ============================================================================
// INDIVIDUAL TOKEN REFRESH
// ============================================================================

export interface RefreshTokensRequest {
  connectionId: string;
  organizationId: string;
}

export interface RefreshTokensResponseSuccess {
  success: true;
  result: RefreshResult;
}

export interface RefreshTokensResponseError {
  success: false;
  error: string;
}

export type RefreshTokensResponse = RefreshTokensResponseSuccess | RefreshTokensResponseError;

/**
 * Manually refreshes OAuth tokens for a specific connection.
 * Can be called on-demand or for troubleshooting.
 */
export async function refreshTokens(
  db: PostgresJsDatabase<any>,
  request: RefreshTokensRequest
): Promise<RefreshTokensResponse> {
  try {
    const result = await refreshOAuthTokens(db, request.connectionId, request.organizationId);

    return {
      success: true,
      result,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Token refresh failed: ${errorMessage}`,
    };
  }
}

// ============================================================================
// BULK TOKEN REFRESH
// ============================================================================

export interface BulkRefreshTokensRequest {
  organizationId?: string;
  provider?: 'google_workspace' | 'microsoft_365';
  maxConcurrency?: number;
}

export interface BulkRefreshTokensResponseSuccess {
  success: true;
  result: BulkRefreshResult;
}

export interface BulkRefreshTokensResponseError {
  success: false;
  error: string;
}

export type BulkRefreshTokensResponse =
  | BulkRefreshTokensResponseSuccess
  | BulkRefreshTokensResponseError;

/**
 * Performs bulk token refresh for multiple connections.
 * Designed for background jobs and maintenance operations.
 */
export async function bulkRefreshTokensServer(
  db: PostgresJsDatabase<any>,
  request: BulkRefreshTokensRequest
): Promise<BulkRefreshTokensResponse> {
  try {
    const result = await bulkRefreshTokens(db, request);

    return {
      success: true,
      result,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Bulk token refresh failed: ${errorMessage}`,
    };
  }
}

// ============================================================================
// MONITORING AND STATISTICS
// ============================================================================

export interface GetTokenRefreshStatsRequest {
  organizationId?: string;
}

export interface GetTokenRefreshStatsResponseSuccess {
  success: true;
  stats: {
    totalConnections: number;
    connectionsNeedingRefresh: number;
    successfulRefreshes: number;
    failedRefreshes: number;
    averageRefreshInterval: number;
  };
}

export interface GetTokenRefreshStatsResponseError {
  success: false;
  error: string;
}

export type GetTokenRefreshStatsResponse =
  | GetTokenRefreshStatsResponseSuccess
  | GetTokenRefreshStatsResponseError;

/**
 * Gets token refresh statistics for monitoring and alerting.
 */
export async function getTokenRefreshStatsServer(
  db: PostgresJsDatabase<any>,
  request: GetTokenRefreshStatsRequest
): Promise<GetTokenRefreshStatsResponse> {
  try {
    const stats = await getTokenRefreshStats(db, request.organizationId);

    return {
      success: true,
      stats,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to get token refresh stats: ${errorMessage}`,
    };
  }
}

export interface GetConnectionsNeedingRefreshRequest {
  organizationId?: string;
  provider?: 'google_workspace' | 'microsoft_365';
}

export interface GetConnectionsNeedingRefreshResponseSuccess {
  success: true;
  connections: Array<{
    connectionId: string;
    organizationId: string;
    provider: 'google_workspace' | 'microsoft_365';
    services: string[];
    tokenExpiresAt: Date;
    priority: 'high' | 'medium' | 'low';
    minutesUntilExpiry: number;
  }>;
}

export interface GetConnectionsNeedingRefreshResponseError {
  success: false;
  error: string;
}

export type GetConnectionsNeedingRefreshResponse =
  | GetConnectionsNeedingRefreshResponseSuccess
  | GetConnectionsNeedingRefreshResponseError;

/**
 * Gets a list of connections that need token refresh.
 * Useful for monitoring and manual intervention.
 */
export async function getConnectionsNeedingRefreshServer(
  db: PostgresJsDatabase<any>,
  request: GetConnectionsNeedingRefreshRequest
): Promise<GetConnectionsNeedingRefreshResponse> {
  try {
    const candidates = await getConnectionsNeedingRefresh(db);

    // Filter by request parameters
    let filteredCandidates = candidates;
    if (request.organizationId) {
      filteredCandidates = filteredCandidates.filter(
        (c) => c.organizationId === request.organizationId
      );
    }
    if (request.provider) {
      filteredCandidates = filteredCandidates.filter((c) => c.provider === request.provider);
    }

    const connections = filteredCandidates.map((candidate) => ({
      connectionId: candidate.connectionId,
      organizationId: candidate.organizationId,
      provider: candidate.provider,
      services: candidate.services,
      tokenExpiresAt: candidate.tokenExpiresAt,
      priority: candidate.priority,
      minutesUntilExpiry: Math.floor(
        (candidate.tokenExpiresAt.getTime() - Date.now()) / (1000 * 60)
      ),
    }));

    return {
      success: true,
      connections,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to get connections needing refresh: ${errorMessage}`,
    };
  }
}

// ============================================================================
// BACKGROUND JOB SCHEDULER
// ============================================================================

/**
 * Background job function for automated token refresh.
 * Designed to be called by a scheduler (cron job, queue system, etc.)
 */
export async function scheduledTokenRefresh(
  db: PostgresJsDatabase<any>,
  options: {
    organizationId?: string;
    maxConcurrency?: number;
    dryRun?: boolean;
  } = {}
): Promise<{
  success: boolean;
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
}> {
  const { organizationId, maxConcurrency = 3, dryRun = false } = options;

  try {
    if (dryRun) {
      // Just check what would be processed
      const candidates = await getConnectionsNeedingRefresh(db);
      const filteredCandidates = organizationId
        ? candidates.filter((c) => c.organizationId === organizationId)
        : candidates;

      return {
        success: true,
        processed: 0,
        successful: 0,
        failed: 0,
        errors: [`DRY RUN: Would process ${filteredCandidates.length} connections`],
      };
    }

    // Perform actual bulk refresh
    const result = await bulkRefreshTokens(db, {
      organizationId,
      maxConcurrency,
    });

    const errors = result.results
      .filter((r) => !r.success)
      .map((r) => `Connection ${r.connectionId}: ${r.errorMessage}`);

    return {
      success: true,
      processed: result.totalProcessed,
      successful: result.successfulRefreshes,
      failed: result.failedRefreshes,
      errors,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [errorMessage],
    };
  }
}

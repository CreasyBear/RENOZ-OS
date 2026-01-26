/**
 * OAuth Connection Health Monitoring
 *
 * Server functions for connection validation, health checking, and monitoring.
 * Implements automated health checks for all OAuth services.
 */

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { oauthConnections, oauthSyncLogs } from 'drizzle/schema/oauth';
import { decryptOAuthToken } from '@/lib/oauth/token-encryption';
import {
  ConnectionHealthStatus,
  ServiceHealthStatus,
  HealthStatus,
  ServiceStatus,
} from '@/lib/oauth/health-types';
import type {
  ConnectionHealthCheck,
  ServiceHealthCheck,
  BulkHealthCheckResult,
} from '@/lib/oauth/health-types';
import {
  calculateOverallHealthStatus,
  DEFAULT_HEALTH_CONFIG,
} from '@/lib/oauth/health-types';
import { ServerError } from '@/lib/server/errors';

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

export const ValidateConnectionRequestSchema = z.object({
  connectionId: z.string().uuid(),
  organizationId: z.string().uuid(),
  services: z.array(z.enum(['calendar', 'email', 'contacts'])).optional(),
});

export const BulkHealthCheckRequestSchema = z.object({
  organizationId: z.string().optional(),
  provider: z.enum(['google_workspace', 'microsoft_365']).optional(),
  maxConcurrency: z.number().min(1).max(10).default(3),
});

export const HealthCheckResponseSchema = z.object({
  success: z.boolean(),
  status: z.nativeEnum(ConnectionHealthStatus),
  services: z.array(
    z.object({
      service: z.enum(['calendar', 'email', 'contacts']),
      status: z.nativeEnum(ServiceHealthStatus),
      responseTime: z.number().optional(),
      lastChecked: z.date(),
      errorMessage: z.string().optional(),
      details: z.record(z.string(), z.any()).optional(),
    })
  ),
  errorMessage: z.string().optional(),
  responseTime: z.number(),
});

// ============================================================================
// CONNECTION VALIDATION
// ============================================================================

export interface ValidateConnectionRequest {
  connectionId: string;
  organizationId: string;
  services?: ('calendar' | 'email' | 'contacts')[];
}

export interface ValidateConnectionResponseSuccess {
  success: true;
  healthCheck: ConnectionHealthCheck;
}

export interface ValidateConnectionResponseError {
  success: false;
  error: string;
}

export type ValidateConnectionResponse =
  | ValidateConnectionResponseSuccess
  | ValidateConnectionResponseError;

/**
 * Validates the health of an OAuth connection by testing each service.
 * Based on midday's connection validation patterns.
 */
export async function validateOAuthConnection(
  db: PostgresJsDatabase<any>,
  request: ValidateConnectionRequest
): Promise<ValidateConnectionResponse> {
  const startTime = Date.now();

  try {
    // Get connection details
    const [connection] = await db
      .select({
        id: oauthConnections.id,
        organizationId: oauthConnections.organizationId,
        provider: oauthConnections.provider,
        accessToken: oauthConnections.accessToken,
        refreshToken: oauthConnections.refreshToken,
        tokenExpiresAt: oauthConnections.tokenExpiresAt,
        isActive: oauthConnections.isActive,
        serviceType: oauthConnections.serviceType,
      })
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.id, request.connectionId),
          eq(oauthConnections.organizationId, request.organizationId)
        )
      )
      .limit(1);

    if (!connection) {
      return {
        success: false,
        error: 'OAuth connection not found',
      };
    }

    // Check if connection is active
    if (!connection.isActive) {
      return {
        success: false,
        error: 'Connection is not active',
      };
    }

    // Check token expiration
    const now = new Date();
    if (connection.tokenExpiresAt && new Date(connection.tokenExpiresAt) <= now) {
      return {
        success: false,
        error: 'Access token has expired',
      };
    }

    // Determine which services to check
    const servicesToCheck = request.services || [connection.serviceType];

    // Decrypt access token
    let accessToken: string;
    try {
      accessToken = decryptOAuthToken(connection.accessToken, connection.organizationId);
    } catch (error) {
      return {
        success: false,
        error: 'Failed to decrypt access token',
      };
    }

    // Perform health checks for each service
    const serviceChecks: ServiceHealthCheck[] = [];

    for (const service of servicesToCheck) {
      const serviceCheck = await checkServiceHealth(
        connection.provider as 'google_workspace' | 'microsoft_365',
        service,
        accessToken
      );
      serviceChecks.push(serviceCheck);
    }

    // Calculate overall health status
    const overallStatus = calculateOverallHealthStatus(serviceChecks);

    // Update connection status if needed
    const newIsActive = overallStatus === HealthStatus.HEALTHY;
    if (connection.isActive !== newIsActive) {
      await db
        .update(oauthConnections)
        .set({
          isActive: newIsActive,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(oauthConnections.id, request.connectionId));
    }

    // Create health check result
    const healthCheck: ConnectionHealthCheck = {
      connectionId: connection.id,
      organizationId: connection.organizationId,
      provider: connection.provider as 'google_workspace' | 'microsoft_365',
      overallStatus,
      services: serviceChecks,
      lastChecked: new Date(),
      nextCheckDue: new Date(Date.now() + DEFAULT_HEALTH_CONFIG.checkIntervalMinutes * 60 * 1000),
      consecutiveFailures: overallStatus === HealthStatus.HEALTHY ? 0 : 1, // Simplified
      metadata: {
        responseTime: Date.now() - startTime,
        servicesChecked: servicesToCheck.length,
      },
    };

    // Log health check
    await db.insert(oauthSyncLogs).values({
      organizationId: connection.organizationId,
      connectionId: connection.id,
      serviceType: servicesToCheck[0],
      operation: 'health_check',
      status: overallStatus === HealthStatus.HEALTHY ? 'completed' : 'failed',
      recordCount: servicesToCheck.length,
      metadata: {
        connectionId: connection.id,
        overallStatus,
        servicesChecked: serviceChecks.length,
        responseTime: Date.now() - startTime,
      },
      startedAt: new Date(),
      completedAt: new Date(),
    });

    return {
      success: true,
      healthCheck,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log error
    try {
      await db.insert(oauthSyncLogs).values({
        organizationId: request.organizationId,
        connectionId: request.connectionId,
        serviceType: request.services?.[0] || 'calendar',
        operation: 'health_check',
        status: 'failed',
        errorMessage,
        metadata: {
          connectionId: request.connectionId,
          responseTime: Date.now() - startTime,
        },
        startedAt: new Date(),
        completedAt: new Date(),
      });
    } catch (logError) {
      console.error('Failed to log health check error:', logError);
    }

    return {
      success: false,
      error: `Health check failed: ${errorMessage}`,
    };
  }
}

// ============================================================================
// SERVICE-SPECIFIC HEALTH CHECKS
// ============================================================================

/**
 * Performs a health check for a specific service using the provider's API.
 */
async function checkServiceHealth(
  provider: 'google_workspace' | 'microsoft_365',
  service: 'calendar' | 'email' | 'contacts',
  accessToken: string
): Promise<ServiceHealthCheck> {
  const startTime = Date.now();

  try {
    switch (provider) {
      case 'google_workspace':
        return await checkGoogleWorkspaceService(service, accessToken);

      case 'microsoft_365':
        return await checkMicrosoft365Service(service, accessToken);

      default:
        throw new ServerError(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const responseTime = Date.now() - startTime;

    return {
      service,
      status: ServiceStatus.UNKNOWN,
      responseTime,
      lastChecked: new Date(),
      errorMessage,
    };
  }
}

/**
 * Checks Google Workspace service health.
 */
async function checkGoogleWorkspaceService(
  service: 'calendar' | 'email' | 'contacts',
  accessToken: string
): Promise<ServiceHealthCheck> {
  const startTime = Date.now();

  try {
    let endpoint: string;
    let method = 'GET';

    switch (service) {
      case 'calendar':
        endpoint = 'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1';
        break;
      case 'email':
        endpoint = 'https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=1';
        break;
      case 'contacts':
        endpoint =
          'https://people.googleapis.com/v1/people/me/connections?personFields=names&maxResults=1';
        break;
      default:
        throw new ServerError(`Unsupported service: ${service}`);
    }

    const response = await fetch(endpoint, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(DEFAULT_HEALTH_CONFIG.requestTimeoutSeconds * 1000),
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        service,
        status: ServiceStatus.HEALTHY,
        responseTime,
        lastChecked: new Date(),
      };
    }

    // Handle specific error codes
    switch (response.status) {
      case 401:
        return {
          service,
          status: ServiceStatus.UNAUTHORIZED,
          responseTime,
          lastChecked: new Date(),
          errorMessage: 'Access token is invalid or expired',
        };
      case 403:
        return {
          service,
          status: ServiceStatus.FORBIDDEN,
          responseTime,
          lastChecked: new Date(),
          errorMessage: 'Insufficient permissions for this service',
        };
      case 404:
        return {
          service,
          status: ServiceStatus.NOT_FOUND,
          responseTime,
          lastChecked: new Date(),
          errorMessage: 'Service endpoint not found',
        };
      case 429:
        return {
          service,
          status: ServiceStatus.RATE_LIMITED,
          responseTime,
          lastChecked: new Date(),
          errorMessage: 'Rate limit exceeded',
        };
      case 503:
        return {
          service,
          status: ServiceStatus.SERVICE_UNAVAILABLE,
          responseTime,
          lastChecked: new Date(),
          errorMessage: 'Service temporarily unavailable',
        };
      default:
        return {
          service,
          status: ServiceStatus.UNKNOWN,
          responseTime,
          lastChecked: new Date(),
          errorMessage: `HTTP ${response.status}: ${response.statusText}`,
        };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
      return {
        service,
        status: ServiceStatus.TIMEOUT,
        responseTime,
        lastChecked: new Date(),
        errorMessage: 'Request timed out',
      };
    }

    return {
      service,
      status: ServiceStatus.NETWORK_ERROR,
      responseTime,
      lastChecked: new Date(),
      errorMessage,
    };
  }
}

/**
 * Checks Microsoft 365 service health.
 */
async function checkMicrosoft365Service(
  service: 'calendar' | 'email' | 'contacts',
  accessToken: string
): Promise<ServiceHealthCheck> {
  const startTime = Date.now();

  try {
    let endpoint: string;

    switch (service) {
      case 'calendar':
        endpoint = 'https://graph.microsoft.com/v1.0/me/calendars?$top=1';
        break;
      case 'email':
        endpoint = 'https://graph.microsoft.com/v1.0/me/messages?$top=1';
        break;
      case 'contacts':
        endpoint = 'https://graph.microsoft.com/v1.0/me/contacts?$top=1';
        break;
      default:
        throw new ServerError(`Unsupported service: ${service}`);
    }

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(DEFAULT_HEALTH_CONFIG.requestTimeoutSeconds * 1000),
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        service,
        status: ServiceStatus.HEALTHY,
        responseTime,
        lastChecked: new Date(),
      };
    }

    // Handle specific error codes
    switch (response.status) {
      case 401:
        return {
          service,
          status: ServiceStatus.UNAUTHORIZED,
          responseTime,
          lastChecked: new Date(),
          errorMessage: 'Access token is invalid or expired',
        };
      case 403:
        return {
          service,
          status: ServiceStatus.FORBIDDEN,
          responseTime,
          lastChecked: new Date(),
          errorMessage: 'Insufficient permissions for this service',
        };
      case 404:
        return {
          service,
          status: ServiceStatus.NOT_FOUND,
          responseTime,
          lastChecked: new Date(),
          errorMessage: 'Service endpoint not found',
        };
      case 429:
        return {
          service,
          status: ServiceStatus.RATE_LIMITED,
          responseTime,
          lastChecked: new Date(),
          errorMessage: 'Rate limit exceeded',
        };
      case 503:
        return {
          service,
          status: ServiceStatus.SERVICE_UNAVAILABLE,
          responseTime,
          lastChecked: new Date(),
          errorMessage: 'Service temporarily unavailable',
        };
      default:
        return {
          service,
          status: ServiceStatus.UNKNOWN,
          responseTime,
          lastChecked: new Date(),
          errorMessage: `HTTP ${response.status}: ${response.statusText}`,
        };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
      return {
        service,
        status: ServiceStatus.TIMEOUT,
        responseTime,
        lastChecked: new Date(),
        errorMessage: 'Request timed out',
      };
    }

    return {
      service,
      status: ServiceStatus.NETWORK_ERROR,
      responseTime,
      lastChecked: new Date(),
      errorMessage,
    };
  }
}

// ============================================================================
// BULK HEALTH MONITORING
// ============================================================================

export interface BulkHealthCheckRequest {
  organizationId?: string;
  provider?: 'google_workspace' | 'microsoft_365';
  maxConcurrency?: number;
}

export interface BulkHealthCheckResponseSuccess {
  success: true;
  result: BulkHealthCheckResult;
}

export interface BulkHealthCheckResponseError {
  success: false;
  error: string;
}

export type BulkHealthCheckResponse = BulkHealthCheckResponseSuccess | BulkHealthCheckResponseError;

/**
 * Performs bulk health checks for multiple connections.
 * Implements concurrent checking with configurable limits.
 */
export async function bulkHealthCheck(
  db: PostgresJsDatabase<any>,
  request: BulkHealthCheckRequest
): Promise<BulkHealthCheckResponse> {
  try {
    // Build query filters
    const whereConditions = [];

    if (request.organizationId) {
      whereConditions.push(eq(oauthConnections.organizationId, request.organizationId));
    }

    if (request.provider) {
      whereConditions.push(eq(oauthConnections.provider, request.provider));
    }

    // Only check active connections
    whereConditions.push(eq(oauthConnections.isActive, true));

    // Get connections to check
    const connections = await db
      .select({
        id: oauthConnections.id,
        organizationId: oauthConnections.organizationId,
        provider: oauthConnections.provider,
        serviceType: oauthConnections.serviceType,
        accessToken: oauthConnections.accessToken,
        refreshToken: oauthConnections.refreshToken,
        tokenExpiresAt: oauthConnections.tokenExpiresAt,
        isActive: oauthConnections.isActive,
      })
      .from(oauthConnections)
      .where(and(...whereConditions))
      .limit(100); // Limit to prevent overwhelming the system

    const maxConcurrency = request.maxConcurrency || 3;
    const results: ConnectionHealthCheck[] = [];
    const errors: Array<{ connectionId: string; error: string }> = [];

    // Process connections in batches for concurrency control
    for (let i = 0; i < connections.length; i += maxConcurrency) {
      const batch = connections.slice(i, i + maxConcurrency);

      const batchPromises = batch.map(async (connection) => {
        try {
          const result = await validateOAuthConnection(db, {
            connectionId: connection.id,
            organizationId: connection.organizationId,
            services: [connection.serviceType] as ('calendar' | 'email' | 'contacts')[],
          });

          if (result.success) {
            return result.healthCheck;
          } else {
            errors.push({
              connectionId: connection.id,
              error: result.error,
            });
            return null;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({
            connectionId: connection.id,
            error: errorMessage,
          });
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(
        ...batchResults.filter((result): result is ConnectionHealthCheck => result !== null)
      );
    }

    const totalConnections = connections.length;
    const healthyConnections = results.filter(
      (r) => r.overallStatus === HealthStatus.HEALTHY
    ).length;
    const unhealthyConnections = totalConnections - healthyConnections;

    const result: BulkHealthCheckResult = {
      totalConnections,
      healthyConnections,
      unhealthyConnections,
      results,
      errors,
    };

    return {
      success: true,
      result,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Bulk health check failed: ${errorMessage}`,
    };
  }
}

// ============================================================================
// MONITORING UTILITIES
// ============================================================================

/**
 * Gets health monitoring statistics for reporting.
 */
export async function getHealthMonitoringStats(
  db: PostgresJsDatabase<any>,
  organizationId?: string
): Promise<{
  totalConnections: number;
  healthyConnections: number;
  unhealthyConnections: number;
  averageResponseTime: number;
  recentChecks: number;
}> {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  // Get connection counts
  const whereConditions = [];
  if (organizationId) {
    whereConditions.push(eq(oauthSyncLogs.organizationId, organizationId));
  }

  const [statsResult] = await db
    .select({
      totalConnections: sql<number>`count(distinct ${oauthConnections.id})`,
      healthyChecks: sql<number>`count(case when ${oauthSyncLogs.status} = 'completed' then 1 end)`,
      unhealthyChecks: sql<number>`count(case when ${oauthSyncLogs.status} = 'failed' then 1 end)`,
      avgResponseTime: sql<number>`avg((${oauthSyncLogs.metadata}->>'responseTime')::int)`,
      recentChecks: sql<number>`count(*)`,
    })
    .from(oauthSyncLogs)
    .leftJoin(oauthConnections, eq(oauthSyncLogs.organizationId, oauthConnections.organizationId))
    .where(
      and(
        eq(oauthSyncLogs.operation, 'health_check'),
        gte(oauthSyncLogs.createdAt, thirtyMinutesAgo),
        ...whereConditions
      )
    );

  return {
    totalConnections: statsResult?.totalConnections ?? 0,
    healthyConnections: statsResult?.healthyChecks ?? 0,
    unhealthyConnections: statsResult?.unhealthyChecks ?? 0,
    averageResponseTime: statsResult?.avgResponseTime ?? 0,
    recentChecks: statsResult?.recentChecks ?? 0,
  };
}

/**
 * Calendar Sync Server Functions
 *
 * Server functions for calendar synchronization operations.
 * Provides API endpoints for triggering and monitoring calendar syncs.
 */

import type { OAuthDatabase } from '@/lib/oauth/db-types';
import { z } from 'zod';
import { CalendarSyncEngine, type SyncResult } from '@/lib/oauth/calendar-sync';
import { and, eq, sql, desc } from 'drizzle-orm';
import { oauthConnections, oauthSyncLogs } from 'drizzle/schema/oauth';

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

export const SyncCalendarRequestSchema = z.object({
  connectionId: z.string().uuid(),
  fullSync: z.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const BulkCalendarSyncRequestSchema = z.object({
  organizationId: z.string().uuid().optional(),
  provider: z.enum(['google_workspace', 'microsoft_365']).optional(),
  fullSync: z.boolean().optional(),
  maxConcurrency: z.number().min(1).max(5).default(2),
});

export const CalendarSyncResultSchema = z.object({
  success: z.boolean(),
  eventsProcessed: z.number(),
  eventsCreated: z.number(),
  eventsUpdated: z.number(),
  eventsDeleted: z.number(),
  conflictsResolved: z.number(),
  errors: z.array(z.string()),
  duration: z.number(),
});

// ============================================================================
// INDIVIDUAL CONNECTION SYNC
// ============================================================================

export interface SyncCalendarRequest {
  connectionId: string;
  fullSync?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface SyncCalendarResponseSuccess {
  success: true;
  result: SyncResult;
}

export interface SyncCalendarResponseError {
  success: false;
  error: string;
}

export type SyncCalendarResponse = SyncCalendarResponseSuccess | SyncCalendarResponseError;

/**
 * Sync calendar events for a specific OAuth connection.
 * Can perform full or incremental sync based on configuration.
 */
export async function syncCalendar(
  db: OAuthDatabase,
  request: SyncCalendarRequest
): Promise<SyncCalendarResponse> {
  try {
    // Validate that the connection exists and has calendar service
    const [connection] = await db
      .select()
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.id, request.connectionId),
          eq(oauthConnections.serviceType, 'calendar')
        )
      )
      .limit(1);

    if (!connection) {
      return {
        success: false,
        error: 'Calendar connection not found or does not include calendar service',
      };
    }

    // Initialize sync engine
    const syncEngine = new CalendarSyncEngine(db);

    // Parse dates if provided
    const options: {
      fullSync?: boolean;
      startDate?: Date;
      endDate?: Date;
    } = {
      fullSync: request.fullSync,
    };

    if (request.startDate) {
      options.startDate = new Date(request.startDate);
    }

    if (request.endDate) {
      options.endDate = new Date(request.endDate);
    }

    // Perform sync
    const result = await syncEngine.syncConnection(request.connectionId, options);

    return {
      success: true,
      result,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Calendar sync failed: ${errorMessage}`,
    };
  }
}

// ============================================================================
// BULK CALENDAR SYNC
// ============================================================================

export interface BulkCalendarSyncRequest {
  organizationId?: string;
  provider?: 'google_workspace' | 'microsoft_365';
  fullSync?: boolean;
  maxConcurrency?: number;
}

export interface BulkCalendarSyncResponseSuccess {
  success: true;
  results: Array<{
    connectionId: string;
    success: boolean;
    result?: SyncResult;
    error?: string;
  }>;
  summary: {
    totalConnections: number;
    successfulSyncs: number;
    failedSyncs: number;
    totalEventsProcessed: number;
    totalDuration: number;
  };
}

export interface BulkCalendarSyncResponseError {
  success: false;
  error: string;
}

export type BulkCalendarSyncResponse =
  | BulkCalendarSyncResponseSuccess
  | BulkCalendarSyncResponseError;

/**
 * Perform bulk calendar sync across multiple connections.
 * Useful for background jobs and maintenance operations.
 */
export async function bulkCalendarSync(
  db: OAuthDatabase,
  request: BulkCalendarSyncRequest
): Promise<BulkCalendarSyncResponse> {
  try {
    // Find all eligible connections
    // Build where conditions
    const whereConditions = [
      eq(oauthConnections.serviceType, 'calendar'),
      eq(oauthConnections.isActive, true),
    ];

    if (request.organizationId) {
      whereConditions.push(eq(oauthConnections.organizationId, request.organizationId));
    }

    if (request.provider) {
      whereConditions.push(eq(oauthConnections.provider, request.provider));
    }

    const query = db
      .select({
        id: oauthConnections.id,
        organizationId: oauthConnections.organizationId,
        provider: oauthConnections.provider,
        isActive: oauthConnections.isActive,
      })
      .from(oauthConnections)
      .where(and(...whereConditions));

    const connections = await query;

    if (connections.length === 0) {
      return {
        success: true,
        results: [],
        summary: {
          totalConnections: 0,
          successfulSyncs: 0,
          failedSyncs: 0,
          totalEventsProcessed: 0,
          totalDuration: 0,
        },
      };
    }

    // Initialize sync engine
    const syncEngine = new CalendarSyncEngine(db);
    const maxConcurrency = request.maxConcurrency || 2;

    // Process connections with concurrency control
    const results: Array<{
      connectionId: string;
      success: boolean;
      result?: SyncResult;
      error?: string;
    }> = [];

    let successfulSyncs = 0;
    let failedSyncs = 0;
    let totalEventsProcessed = 0;
    let totalDuration = 0;

    for (let i = 0; i < connections.length; i += maxConcurrency) {
      const batch = connections.slice(i, i + maxConcurrency);

      const batchPromises = batch.map(async (connection) => {
        try {
          const result = await syncEngine.syncConnection(connection.id, {
            fullSync: request.fullSync,
          });

          if (result.success) {
            successfulSyncs++;
            totalEventsProcessed += result.eventsProcessed;
          } else {
            failedSyncs++;
          }

          totalDuration += result.duration;

          return {
            connectionId: connection.id,
            success: result.success,
            result,
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          failedSyncs++;
          totalDuration += 0; // No duration for failed syncs

          return {
            connectionId: connection.id,
            success: false,
            error: errorMessage,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to avoid overwhelming external APIs
      if (i + maxConcurrency < connections.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
      }
    }

    return {
      success: true,
      results,
      summary: {
        totalConnections: connections.length,
        successfulSyncs,
        failedSyncs,
        totalEventsProcessed,
        totalDuration,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Bulk calendar sync failed: ${errorMessage}`,
    };
  }
}

// ============================================================================
// SYNC STATUS AND MONITORING
// ============================================================================

export interface GetCalendarSyncStatusRequest {
  connectionId: string;
  organizationId: string;
}

export interface GetCalendarSyncStatusResponseSuccess {
  success: true;
  status: {
    connectionId: string;
    lastFullSyncAt?: Date;
    lastIncrementalSyncAt?: Date;
    eventsSynced: number;
    eventsCreated: number;
    eventsUpdated: number;
    eventsDeleted: number;
    conflictsResolved: number;
    errors: string[];
    status: 'idle' | 'running' | 'completed' | 'failed';
    currentOperation?: string;
  };
}

export interface GetCalendarSyncStatusResponseError {
  success: false;
  error: string;
}

export type GetCalendarSyncStatusResponse =
  | GetCalendarSyncStatusResponseSuccess
  | GetCalendarSyncStatusResponseError;

/**
 * Get the current sync status for a calendar connection.
 */
export async function getCalendarSyncStatus(
  db: OAuthDatabase,
  request: GetCalendarSyncStatusRequest
): Promise<GetCalendarSyncStatusResponse> {
  try {
    // Get recent sync logs for this connection
    const recentLogs = await db
      .select()
      .from(oauthSyncLogs)
      .where(
        and(
          eq(oauthSyncLogs.organizationId, request.organizationId),
          eq(oauthSyncLogs.connectionId, request.connectionId),
          eq(oauthSyncLogs.serviceType, 'calendar')
        )
      )
      .orderBy(desc(oauthSyncLogs.createdAt))
      .limit(10);

    // Aggregate sync statistics
    let lastFullSyncAt: Date | undefined;
    let lastIncrementalSyncAt: Date | undefined;
    let eventsSynced = 0;
    let eventsCreated = 0;
    let eventsUpdated = 0;
    let eventsDeleted = 0;
    let conflictsResolved = 0;
    const errors: string[] = [];
    let currentStatus: 'idle' | 'running' | 'completed' | 'failed' = 'idle';

    for (const log of recentLogs) {
      if (log.operation === 'calendar_full_sync' && log.status === 'completed') {
        lastFullSyncAt = new Date(log.createdAt);
      }

      if (log.operation === 'calendar_incremental_sync' && log.status === 'completed') {
        lastIncrementalSyncAt = new Date(log.createdAt);
      }

      if (log.operation.includes('calendar') && log.status === 'running') {
        currentStatus = 'running';
      }

      // Aggregate metrics
      const metadata = log.metadata as Record<string, unknown> | null;
      eventsSynced +=
        (metadata?.eventsProcessed as number | undefined) ?? log.recordCount ?? 0;
      eventsCreated += (metadata?.eventsCreated as number | undefined) ?? 0;
      eventsUpdated += (metadata?.eventsUpdated as number | undefined) ?? 0;
      eventsDeleted += (metadata?.eventsDeleted as number | undefined) ?? 0;
      conflictsResolved += (metadata?.conflictsResolved as number | undefined) ?? 0;

      if (log.errorMessage) {
        errors.push(log.errorMessage);
      }
    }

    // Determine overall status
    if (errors.length > 0 && currentStatus !== 'running') {
      currentStatus = 'failed';
    } else if (recentLogs.length > 0 && currentStatus !== 'running') {
      currentStatus = 'completed';
    }

    return {
      success: true,
      status: {
        connectionId: request.connectionId,
        lastFullSyncAt,
        lastIncrementalSyncAt,
        eventsSynced,
        eventsCreated,
        eventsUpdated,
        eventsDeleted,
        conflictsResolved,
        errors,
        status: currentStatus,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to get calendar sync status: ${errorMessage}`,
    };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Schedule background calendar sync jobs.
 * This would typically be called by a cron job or scheduler.
 */
export async function scheduleCalendarSyncJobs(
  db: OAuthDatabase,
  options: {
    organizationId?: string;
    fullSync?: boolean;
    priority?: 'high' | 'medium' | 'low';
  } = {}
): Promise<{
  success: boolean;
  jobsScheduled: number;
  errors: string[];
}> {
  try {
    // Find connections that need syncing based on schedule
    const connectionsNeedingSync = await db
      .select({
        id: oauthConnections.id,
        organizationId: oauthConnections.organizationId,
        lastSyncedAt: oauthConnections.lastSyncedAt,
      })
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.serviceType, 'calendar'),
          eq(oauthConnections.isActive, true),
          options.organizationId
            ? eq(
                oauthConnections.organizationId,
                options.organizationId
              )
            : undefined,
          // Add time-based conditions for scheduling
          sql`last_synced_at IS NULL OR last_synced_at < NOW() - INTERVAL '1 hour'`
        )
      );

    // In a real implementation, this would enqueue jobs in a job queue system
    // For now, we'll just return the count
    return {
      success: true,
      jobsScheduled: connectionsNeedingSync.length,
      errors: [],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      jobsScheduled: 0,
      errors: [errorMessage],
    };
  }
}

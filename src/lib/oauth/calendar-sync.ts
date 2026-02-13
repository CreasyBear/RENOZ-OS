/**
 * Calendar Sync Engine
 *
 * Bidirectional calendar event synchronization between renoz-v3 and external providers.
 * Implements conflict resolution, delta syncing, and provider abstraction.
 */

import crypto from 'node:crypto';
import type { OAuthDatabase } from '@/lib/oauth/db-types';
import { eq, and, inArray } from 'drizzle-orm';
import {
  oauthConnections,
  oauthSyncLogs,
  oauthCalendarEvents,
  oauthSyncStates,
} from 'drizzle/schema/oauth';
import { decryptOAuthToken } from './token-encryption';
import { logger } from '@/lib/logger';
import type { ConnectionForSyncEngine } from '@/lib/schemas/oauth/connection';
import type {
  GoogleCalendarAttendeeRaw,
  GoogleCalendarEventRaw,
  MicrosoftCalendarAttendeeRaw,
  MicrosoftCalendarEventRaw,
} from '@/lib/schemas/integrations/calendar';

// ============================================================================
// CALENDAR EVENT TYPES
// ============================================================================

export interface CalendarEvent {
  id: string;
  externalId: string;
  connectionId: string;
  organizationId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  location?: string;
  attendees?: CalendarAttendee[];
  status: 'confirmed' | 'tentative' | 'cancelled';
  isAllDay: boolean;
  recurrence?: CalendarRecurrence;
  reminders?: CalendarReminder[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt: Date;
}

export interface CalendarAttendee {
  email: string;
  displayName?: string;
  status: 'accepted' | 'declined' | 'tentative' | 'needsAction';
  isOrganizer?: boolean;
}

export interface CalendarRecurrence {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: Date;
  count?: number;
  byDay?: string[]; // e.g., ["MO", "WE", "FR"]
  byMonth?: number[];
}

export interface CalendarReminder {
  minutes: number;
  method: 'email' | 'popup';
}

// ============================================================================
// SYNC ENGINE CONFIGURATION
// ============================================================================

export interface CalendarSyncConfig {
  /** How often to run full sync (in hours) */
  fullSyncIntervalHours: number;

  /** Maximum events to sync per batch */
  batchSize: number;

  /** How far back to sync historical events (in days) */
  historicalSyncDays: number;

  /** Conflict resolution strategy */
  conflictResolution: 'external_wins' | 'internal_wins' | 'manual' | 'newest_wins';

  /** Enable bidirectional sync */
  bidirectionalSync: boolean;

  /** Rate limiting delay between requests (in ms) */
  requestDelayMs: number;

  /** Maximum retries for failed operations */
  maxRetries: number;
}

export const DEFAULT_CALENDAR_SYNC_CONFIG: CalendarSyncConfig = {
  fullSyncIntervalHours: 24, // Daily full sync
  batchSize: 100,
  historicalSyncDays: 90, // 3 months of history
  conflictResolution: 'newest_wins',
  bidirectionalSync: true,
  requestDelayMs: 100, // 100ms between requests
  maxRetries: 3,
};

// ============================================================================
// SYNC STATUS AND TRACKING
// ============================================================================

export interface CalendarSyncStatus {
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
}

export interface SyncResult {
  success: boolean;
  eventsProcessed: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  conflictsResolved: number;
  errors: string[];
  duration: number;
}

// ============================================================================
// CALENDAR PROVIDER ABSTRACTION
// ============================================================================

export interface CalendarProvider {
  /**
   * List calendar events within a date range
   */
  listEvents(
    connection: { accessToken: string; refreshToken?: string },
    options: {
      calendarId?: string;
      startDate: Date;
      endDate: Date;
      maxResults?: number;
      syncToken?: string;
    }
  ): Promise<{
    events: ExternalCalendarEvent[];
    nextSyncToken?: string;
    hasMore: boolean;
  }>;

  /**
   * Create a new calendar event
   */
  createEvent(
    connection: { accessToken: string; refreshToken?: string },
    event: CalendarEventInput
  ): Promise<ExternalCalendarEvent>;

  /**
   * Update an existing calendar event
   */
  updateEvent(
    connection: { accessToken: string; refreshToken?: string },
    eventId: string,
    updates: Partial<CalendarEventInput>
  ): Promise<ExternalCalendarEvent>;

  /**
   * Delete a calendar event
   */
  deleteEvent(
    connection: { accessToken: string; refreshToken?: string },
    eventId: string
  ): Promise<void>;

  /**
   * Get changes since last sync (delta sync)
   */
  getChanges(
    connection: { accessToken: string; refreshToken?: string },
    syncToken: string
  ): Promise<{
    events: ExternalCalendarEvent[];
    deletedEvents: string[];
    nextSyncToken: string;
  }>;
}

export interface ExternalCalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string; // All-day events
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
    organizer?: boolean;
  }>;
  status: string;
  recurrence?: string[];
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
  updated: string;
  created?: string;
  etag?: string; // For change detection
}

export interface CalendarEventInput {
  title: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
}

/** Map Google API response to ExternalCalendarEvent with required fields */
function toExternalCalendarEventFromGoogle(data: GoogleCalendarEventRaw): ExternalCalendarEvent {
  const attendees = data.attendees
    ?.map((a: GoogleCalendarAttendeeRaw) =>
      a.email != null
        ? {
            email: a.email,
            displayName: a.displayName,
            responseStatus: a.responseStatus ?? 'needsAction',
            organizer: a.organizer ?? false,
          }
        : null
    )
    .filter((a): a is NonNullable<typeof a> => a != null);
  return {
    id: data.id ?? '',
    title: data.summary || '(No title)',
    description: data.description,
    start: data.start ?? {},
    end: data.end ?? {},
    location: data.location,
    attendees,
    status: data.status || 'confirmed',
    recurrence: data.recurrence,
    reminders: data.reminders
      ? { useDefault: data.reminders.useDefault ?? true, overrides: data.reminders.overrides }
      : undefined,
    updated: data.updated ?? '',
    created: data.created,
    etag: data.etag,
  };
}

/** Map Microsoft API response to ExternalCalendarEvent with required fields */
function toExternalCalendarEventFromMicrosoft(data: MicrosoftCalendarEventRaw): ExternalCalendarEvent {
  const attendees = data.attendees
    ?.map((a: MicrosoftCalendarAttendeeRaw) => {
      const email = a.emailAddress?.address;
      return email != null
        ? {
            email,
            displayName: a.emailAddress?.name,
            responseStatus: a.status?.response ?? 'none',
            organizer: a.type === 'organizer',
          }
        : null;
    })
    .filter((a): a is NonNullable<typeof a> => a != null);
  return {
    id: data.id ?? '',
    title: data.subject || '(No title)',
    description: data.body?.content,
    start: {
      dateTime: data.start?.dateTime,
      timeZone: data.start?.timeZone,
    },
    end: {
      dateTime: data.end?.dateTime,
      timeZone: data.end?.timeZone,
    },
    location: data.location?.displayName,
    attendees,
    status: data.showAs || 'confirmed',
    updated: (data.lastModifiedDateTime || data.createdDateTime) ?? '',
    created: data.createdDateTime,
    etag: data['@odata.etag'],
  };
}

// ============================================================================
// SYNC ENGINE IMPLEMENTATION
// ============================================================================

export class CalendarSyncEngine {
  private db: OAuthDatabase;
  private config: CalendarSyncConfig;
  private googleProvider: CalendarProvider;
  private microsoftProvider: CalendarProvider;

  constructor(db: OAuthDatabase, config: Partial<CalendarSyncConfig> = {}) {
    this.db = db;
    this.config = { ...DEFAULT_CALENDAR_SYNC_CONFIG, ...config };
    this.googleProvider = new GoogleCalendarProvider();
    this.microsoftProvider = new MicrosoftCalendarProvider();
  }

  /**
   * Sync calendar events for a specific connection
   */
  async syncConnection(
    connectionId: string,
    options: {
      fullSync?: boolean;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      // Get connection details
      const [connection] = await this.db
        .select({
          id: oauthConnections.id,
          organizationId: oauthConnections.organizationId,
          provider: oauthConnections.provider,
          accessToken: oauthConnections.accessToken,
          refreshToken: oauthConnections.refreshToken,
          isActive: oauthConnections.isActive,
          serviceType: oauthConnections.serviceType,
        })
        .from(oauthConnections)
        .where(
          and(
            eq(oauthConnections.id, connectionId),
            eq(oauthConnections.serviceType, 'calendar')
          )
        )
        .limit(1);

      if (!connection) {
        throw new Error(`Calendar connection not found: ${connectionId}`);
      }

      if (!connection.isActive) {
        throw new Error('Connection is not active');
      }

      // Decrypt tokens
      const accessToken = decryptOAuthToken(connection.accessToken, connection.organizationId);
      const refreshToken = connection.refreshToken
        ? decryptOAuthToken(connection.refreshToken, connection.organizationId)
        : undefined;

      // Determine sync type
      const fullSync = options.fullSync ?? (await this.shouldPerformFullSync(connectionId));

      // Get date range for sync
      const { startDate, endDate } = this.getSyncDateRange(options, fullSync);

      // Get the appropriate provider
      const provider = this.getProvider(
        connection.provider as 'google_workspace' | 'microsoft_365'
      );

      // Perform sync
      const syncResult = fullSync
        ? await this.performFullSync(
            connection,
            provider,
            { accessToken, refreshToken },
            startDate,
            endDate
          )
        : await this.performIncrementalSync(connection, provider, { accessToken, refreshToken });

      // Update sync status
      await this.updateSyncStatus(connectionId, {
        lastFullSyncAt: fullSync ? new Date() : undefined,
        lastIncrementalSyncAt: new Date(),
        eventsSynced: syncResult.eventsProcessed,
        status: syncResult.success ? 'completed' : 'failed',
        errors: syncResult.errors,
      });

      // Log sync completion
      await this.db.insert(oauthSyncLogs).values({
        organizationId: connection.organizationId,
        connectionId,
        serviceType: 'calendar',
        operation: fullSync ? 'calendar_full_sync' : 'calendar_incremental_sync',
        status: syncResult.success ? 'completed' : 'failed',
        recordCount: syncResult.eventsProcessed,
        metadata: {
          eventsCreated: syncResult.eventsCreated,
          eventsUpdated: syncResult.eventsUpdated,
          eventsDeleted: syncResult.eventsDeleted,
          conflictsResolved: syncResult.conflictsResolved,
          duration: Date.now() - startTime,
          fullSync,
        },
        startedAt: new Date(),
        completedAt: new Date(),
      });

      return {
        ...syncResult,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log sync failure
      try {
        logger.error('Calendar sync failed', new Error(errorMessage), {});
      } catch (logError) {
        logger.error('Failed to log sync failure', logError as Error, {});
      }

      return {
        success: false,
        eventsProcessed: 0,
        eventsCreated: 0,
        eventsUpdated: 0,
        eventsDeleted: 0,
        conflictsResolved: 0,
        errors: [errorMessage],
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Perform a full sync of calendar events
   */
  private async performFullSync(
    connection: ConnectionForSyncEngine,
    provider: CalendarProvider,
    tokens: { accessToken: string; refreshToken?: string },
    startDate: Date,
    endDate: Date
  ): Promise<SyncResult> {
    const syncStart = Date.now();
    let eventsCreated = 0;
    let eventsUpdated = 0;
    let eventsDeleted = 0;
    let conflictsResolved = 0;
    const errors: string[] = [];
    let eventsProcessed = 0;

    try {
      // Get all events from external provider
      const { events: externalEvents, nextSyncToken } = await provider.listEvents(tokens, {
        startDate,
        endDate,
        maxResults: this.config.batchSize,
      });

      eventsProcessed = externalEvents.length;

      // Process events in batches to avoid overwhelming the system
      for (let i = 0; i < externalEvents.length; i += this.config.batchSize) {
        const batch = externalEvents.slice(i, i + this.config.batchSize);

        // Add delay between batches to respect rate limits
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.config.requestDelayMs));
        }

        // Process each event in the batch
        for (const externalEvent of batch) {
          try {
            const result = await this.processExternalEvent(connection, externalEvent);
            eventsCreated += result.created ? 1 : 0;
            eventsUpdated += result.updated ? 1 : 0;
            eventsDeleted += result.deleted ? 1 : 0;
            conflictsResolved += result.conflictResolved ? 1 : 0;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            errors.push(`Failed to process event ${externalEvent.id}: ${errorMessage}`);
          }
        }
      }

      // If bidirectional sync is enabled, sync renoz events back to external calendar
      if (this.config.bidirectionalSync) {
        // This would sync renoz calendar events to external provider
        // Implementation depends on renoz calendar event storage
      }

      if (nextSyncToken) {
        await this.upsertSyncState(connection, nextSyncToken);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Full sync failed: ${errorMessage}`);
    }

    return {
      success: errors.length === 0,
      eventsProcessed,
      eventsCreated,
      eventsUpdated,
      eventsDeleted,
      conflictsResolved,
      errors,
      duration: Date.now() - syncStart,
    };
  }

  /**
   * Perform an incremental sync using change tokens
   */
  private async performIncrementalSync(
    connection: ConnectionForSyncEngine,
    provider: CalendarProvider,
    tokens: { accessToken: string; refreshToken?: string }
  ): Promise<SyncResult> {
    const syncState = await this.getSyncState(connection.id);
    if (!syncState?.syncToken) {
      const { startDate, endDate } = this.getSyncDateRange({}, false);
      return this.performFullSync(connection, provider, tokens, startDate, endDate);
    }

    const syncStart = Date.now();
    let eventsCreated = 0;
    let eventsUpdated = 0;
    let eventsDeleted = 0;
    let conflictsResolved = 0;
    const errors: string[] = [];
    let eventsProcessed = 0;

    try {
      const syncResult = await provider.getChanges(tokens, syncState.syncToken);
      eventsProcessed = syncResult.events.length;

      for (const externalEvent of syncResult.events) {
        const result = await this.processExternalEvent(connection, externalEvent);
        eventsCreated += result.created ? 1 : 0;
        eventsUpdated += result.updated ? 1 : 0;
        conflictsResolved += result.conflictResolved ? 1 : 0;
      }

      if (syncResult.deletedEvents.length > 0) {
        await this.deleteCalendarEventsByExternalIds(connection.id, syncResult.deletedEvents);
        eventsDeleted += syncResult.deletedEvents.length;
      }

      if (syncResult.nextSyncToken) {
        await this.upsertSyncState(connection, syncResult.nextSyncToken);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Incremental sync failed: ${errorMessage}`);
    }

    return {
      success: errors.length === 0,
      eventsProcessed,
      eventsCreated,
      eventsUpdated,
      eventsDeleted,
      conflictsResolved,
      errors,
      duration: Date.now() - syncStart,
    };
  }

  /**
   * Process a single external calendar event
   */
  private async processExternalEvent(
    connection: ConnectionForSyncEngine,
    externalEvent: ExternalCalendarEvent
  ): Promise<{ created: boolean; updated: boolean; deleted: boolean; conflictResolved: boolean }> {
    // Convert external event to internal format
    const internalEvent = this.convertExternalEvent(connection, externalEvent);

    // Check if event already exists
    const existingEvent = await this.findExistingEvent(internalEvent.externalId, connection.id);

    if (existingEvent) {
      // Check for conflicts and resolve them
      const hasConflict = this.hasEventConflict(existingEvent, internalEvent);

      if (hasConflict) {
        await this.resolveEventConflict(existingEvent, internalEvent);
        return { created: false, updated: false, deleted: false, conflictResolved: true };
      } else if (existingEvent.lastSyncedAt < new Date(externalEvent.updated)) {
        // Update existing event
        await this.updateCalendarEvent(internalEvent);
        return { created: false, updated: true, deleted: false, conflictResolved: false };
      }
      return { created: false, updated: false, deleted: false, conflictResolved: false };
    } else {
      // Create new event
      await this.createCalendarEvent(internalEvent);
      return { created: true, updated: false, deleted: false, conflictResolved: false };
    }
  }

  /**
   * Convert external event format to internal format
   */
  private convertExternalEvent(
    connection: ConnectionForSyncEngine,
    externalEvent: ExternalCalendarEvent
  ): CalendarEvent {
    const startTime = externalEvent.start.dateTime
      ? new Date(externalEvent.start.dateTime)
      : new Date(externalEvent.start.date!);

    const endTime = externalEvent.end.dateTime
      ? new Date(externalEvent.end.dateTime)
      : new Date(externalEvent.end.date!);

    return {
      id: crypto.randomUUID(),
      externalId: externalEvent.id,
      connectionId: connection.id,
      organizationId: connection.organizationId,
      title: externalEvent.title,
      description: externalEvent.description,
      startTime,
      endTime,
      timezone: externalEvent.start.timeZone || 'UTC',
      location: externalEvent.location,
      attendees: externalEvent.attendees?.map((attendee) => ({
        email: attendee.email,
        displayName: attendee.displayName,
        status: this.mapAttendeeStatus(attendee.responseStatus),
        isOrganizer: attendee.organizer,
      })),
      status: this.mapEventStatus(externalEvent.status),
      isAllDay: !externalEvent.start.dateTime,
      recurrence: externalEvent.recurrence
        ? this.parseRecurrence(externalEvent.recurrence)
        : undefined,
      reminders: externalEvent.reminders?.overrides?.map((override) => ({
        minutes: override.minutes,
        method: override.method.toLowerCase() as 'email' | 'popup',
      })),
      metadata: {
        etag: externalEvent.etag,
        provider: connection.provider,
      },
      createdAt: externalEvent.created ? new Date(externalEvent.created) : new Date(),
      updatedAt: new Date(externalEvent.updated),
      lastSyncedAt: new Date(),
    };
  }

  /**
   * Map external attendee status to internal format
   */
  private mapAttendeeStatus(
    externalStatus: string
  ): 'accepted' | 'declined' | 'tentative' | 'needsAction' {
    switch (externalStatus.toLowerCase()) {
      case 'accepted':
        return 'accepted';
      case 'declined':
        return 'declined';
      case 'tentative':
        return 'tentative';
      default:
        return 'needsAction';
    }
  }

  /**
   * Map external event status to internal format
   */
  private mapEventStatus(externalStatus: string): 'confirmed' | 'tentative' | 'cancelled' {
    switch (externalStatus.toLowerCase()) {
      case 'confirmed':
        return 'confirmed';
      case 'tentative':
        return 'tentative';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'confirmed';
    }
  }

  /**
   * Parse recurrence rules from external format
   */
  private parseRecurrence(recurrence: string[]): CalendarRecurrence | undefined {
    // Simplified recurrence parsing - would need more complex logic for full RFC 5545 support
    if (recurrence.length === 0) return undefined;

    // Basic parsing logic would go here

    return {
      frequency: 'weekly',
      interval: 1,
    };
  }

  /**
   * Find existing calendar event by external ID
   */
  private async findExistingEvent(
    externalId: string,
    connectionId: string
  ): Promise<CalendarEvent | null> {
    const [existing] = await this.db
      .select()
      .from(oauthCalendarEvents)
      .where(and(eq(oauthCalendarEvents.connectionId, connectionId), eq(oauthCalendarEvents.externalId, externalId)))
      .limit(1);

    return (existing as unknown as CalendarEvent) || null;
  }

  /**
   * Check if there are conflicts between existing and new event
   */
  private hasEventConflict(existing: CalendarEvent, incoming: CalendarEvent): boolean {
    // Check if both events have been modified since last sync
    return existing.updatedAt > existing.lastSyncedAt && incoming.updatedAt > incoming.lastSyncedAt;
  }

  /**
   * Resolve conflicts between existing and incoming events
   */
  private async resolveEventConflict(
    existing: CalendarEvent,
    incoming: CalendarEvent
  ): Promise<void> {
    switch (this.config.conflictResolution) {
      case 'external_wins':
        await this.updateCalendarEvent(incoming);
        break;
      case 'internal_wins':
        // Keep existing event
        break;
      case 'newest_wins':
        if (incoming.updatedAt > existing.updatedAt) {
          await this.updateCalendarEvent(incoming);
        }
        break;
      case 'manual':
        // Would create a conflict record for manual resolution
        break;
    }
  }

  /**
   * Create a new calendar event
   */
  private async createCalendarEvent(event: CalendarEvent): Promise<void> {
    await this.db.insert(oauthCalendarEvents).values({
      organizationId: event.organizationId,
      connectionId: event.connectionId,
      externalId: event.externalId,
      title: event.title,
      description: event.description,
      startTime: event.startTime,
      endTime: event.endTime,
      timezone: event.timezone,
      location: event.location,
      status: event.status,
      isAllDay: event.isAllDay,
      raw: event.metadata || {},
      lastSyncedAt: new Date(),
    });
  }

  /**
   * Update an existing calendar event
   */
  private async updateCalendarEvent(event: CalendarEvent): Promise<void> {
    await this.db
      .update(oauthCalendarEvents)
      .set({
        title: event.title,
        description: event.description,
        startTime: event.startTime,
        endTime: event.endTime,
        timezone: event.timezone,
        location: event.location,
        status: event.status,
        isAllDay: event.isAllDay,
        raw: event.metadata || {},
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(oauthCalendarEvents.connectionId, event.connectionId), eq(oauthCalendarEvents.externalId, event.externalId)));
  }

  private async deleteCalendarEventsByExternalIds(
    connectionId: string,
    externalIds: string[]
  ): Promise<void> {
    if (externalIds.length === 0) return;

    await this.db
      .delete(oauthCalendarEvents)
      .where(
        and(
          eq(oauthCalendarEvents.connectionId, connectionId),
          inArray(oauthCalendarEvents.externalId, externalIds)
        )
      );
  }

  private async getSyncState(connectionId: string) {
    const [state] = await this.db
      .select()
      .from(oauthSyncStates)
      .where(eq(oauthSyncStates.connectionId, connectionId))
      .limit(1);

    return state || null;
  }

  private async upsertSyncState(
    connection: ConnectionForSyncEngine,
    syncToken: string
  ): Promise<void> {
    await this.db
      .insert(oauthSyncStates)
      .values({
        organizationId: connection.organizationId,
        connectionId: connection.id,
        provider: connection.provider as 'google_workspace' | 'microsoft_365',
        serviceType: 'calendar',
        syncToken,
        lastSyncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [oauthSyncStates.connectionId, oauthSyncStates.serviceType],
        set: {
          syncToken,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        },
      });
  }

  /**
   * Determine if a full sync should be performed
   */
  private async shouldPerformFullSync(connectionId: string): Promise<boolean> {
    // Check last full sync time
    const [lastSync] = await this.db
      .select({ lastSyncedAt: oauthConnections.lastSyncedAt })
      .from(oauthConnections)
      .where(eq(oauthConnections.id, connectionId))
      .limit(1);

    if (!lastSync?.lastSyncedAt) return true;

    const last = new Date(lastSync.lastSyncedAt);
    const hoursSince = (Date.now() - last.getTime()) / (1000 * 60 * 60);
    return hoursSince >= this.config.fullSyncIntervalHours;
  }

  /**
   * Get the date range for syncing
   */
  private getSyncDateRange(
    options: { startDate?: Date; endDate?: Date },
    fullSync: boolean
  ): { startDate: Date; endDate: Date } {
    if (options.startDate && options.endDate) {
      return { startDate: options.startDate, endDate: options.endDate };
    }

    const endDate = new Date();
    const startDate = fullSync
      ? new Date(endDate.getTime() - this.config.historicalSyncDays * 24 * 60 * 60 * 1000)
      : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days for incremental

    return { startDate, endDate };
  }

  /**
   * Get the appropriate calendar provider
   */
  private getProvider(provider: 'google_workspace' | 'microsoft_365'): CalendarProvider {
    switch (provider) {
      case 'google_workspace':
        return this.googleProvider;
      case 'microsoft_365':
        return this.microsoftProvider;
      default:
        throw new Error(`Unsupported calendar provider: ${provider}`);
    }
  }

  /**
   * Update sync status for a connection
   */
  private async updateSyncStatus(
    connectionId: string,
    _updates: Partial<CalendarSyncStatus>
  ): Promise<void> {
    await this.db
      .update(oauthConnections)
      .set({
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(oauthConnections.id, connectionId));
  }

  // Convenience operations for job integration
  async createEvent(
    provider: 'google_workspace' | 'microsoft_365',
    connection: { accessToken: string; refreshToken?: string },
    event: CalendarEventInput
  ): Promise<ExternalCalendarEvent> {
    return this.getProvider(provider).createEvent(connection, event);
  }

  async updateEvent(
    provider: 'google_workspace' | 'microsoft_365',
    connection: { accessToken: string; refreshToken?: string },
    eventId: string,
    updates: Partial<CalendarEventInput>
  ): Promise<ExternalCalendarEvent> {
    return this.getProvider(provider).updateEvent(connection, eventId, updates);
  }

  async deleteEvent(
    provider: 'google_workspace' | 'microsoft_365',
    connection: { accessToken: string; refreshToken?: string },
    eventId: string
  ): Promise<void> {
    return this.getProvider(provider).deleteEvent(connection, eventId);
  }
}

// ============================================================================
// PROVIDER IMPLEMENTATIONS
// ============================================================================

class GoogleCalendarProvider implements CalendarProvider {
  async listEvents(
    connection: { accessToken: string; refreshToken?: string },
    options: {
      calendarId?: string;
      startDate: Date;
      endDate: Date;
      maxResults?: number;
      syncToken?: string;
    }
  ): Promise<{
    events: ExternalCalendarEvent[];
    nextSyncToken?: string;
    hasMore: boolean;
  }> {
    const calendarId = options.calendarId || 'primary';
    const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

    const params = new URLSearchParams({
      timeMin: options.startDate.toISOString(),
      timeMax: options.endDate.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    if (options.maxResults) {
      params.set('maxResults', options.maxResults.toString());
    }

    if (options.syncToken) {
      params.set('syncToken', options.syncToken);
    }

    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    const items = (data.items ?? []) as GoogleCalendarEventRaw[];
    const events: ExternalCalendarEvent[] = items
      .filter((item): item is GoogleCalendarEventRaw & { id: string } => !!item.id)
      .map(toExternalCalendarEventFromGoogle);

    return {
      events,
      nextSyncToken: data.nextSyncToken,
      hasMore: !!data.nextPageToken,
    };
  }

  async createEvent(
    connection: { accessToken: string; refreshToken?: string },
    event: CalendarEventInput
  ): Promise<ExternalCalendarEvent> {
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: event.title,
          description: event.description,
          start: event.start,
          end: event.end,
          location: event.location,
          attendees: event.attendees?.map((attendee) => ({
            email: attendee.email,
            displayName: attendee.displayName,
          })),
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to create Google Calendar event: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as GoogleCalendarEventRaw;
    return toExternalCalendarEventFromGoogle(data);
  }

  async updateEvent(
    connection: { accessToken: string; refreshToken?: string },
    eventId: string,
    updates: Partial<CalendarEventInput>
  ): Promise<ExternalCalendarEvent> {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to update Google Calendar event: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as GoogleCalendarEventRaw;
    return toExternalCalendarEventFromGoogle(data);
  }

  async deleteEvent(
    connection: { accessToken: string; refreshToken?: string },
    eventId: string
  ): Promise<void> {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
        },
      }
    );

    if (!response.ok && response.status !== 410) {
      // 410 Gone is acceptable for deleted events
      throw new Error(
        `Failed to delete Google Calendar event: ${response.status} ${response.statusText}`
      );
    }
  }

  async getChanges(
    connection: { accessToken: string; refreshToken?: string },
    syncToken: string
  ): Promise<{
    events: ExternalCalendarEvent[];
    deletedEvents: string[];
    nextSyncToken: string;
  }> {
    const baseUrl = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
    const params = new URLSearchParams({
      syncToken,
      singleEvents: 'true',
    });

    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Google Calendar sync error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const items = (data.items ?? []) as GoogleCalendarEventRaw[];
    const events: ExternalCalendarEvent[] = items
      .filter((item): item is GoogleCalendarEventRaw & { id: string } => !!item.id)
      .map(toExternalCalendarEventFromGoogle);

    return {
      events,
      deletedEvents: [], // Google doesn't provide deleted events in sync response
      nextSyncToken: data.nextSyncToken,
    };
  }
}

class MicrosoftCalendarProvider implements CalendarProvider {
  async listEvents(
    connection: { accessToken: string; refreshToken?: string },
    options: {
      calendarId?: string;
      startDate: Date;
      endDate: Date;
      maxResults?: number;
      syncToken?: string;
    }
  ): Promise<{
    events: ExternalCalendarEvent[];
    nextSyncToken?: string;
    hasMore: boolean;
  }> {
    const calendarId = options.calendarId || 'calendar';
    const baseUrl = `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events`;

    const params = new URLSearchParams({
      startDateTime: options.startDate.toISOString(),
      endDateTime: options.endDate.toISOString(),
      $orderby: 'start/dateTime',
    });

    if (options.maxResults) {
      params.set('$top', options.maxResults.toString());
    }

    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Microsoft Graph API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const items = (data.value ?? []) as MicrosoftCalendarEventRaw[];
    const events: ExternalCalendarEvent[] = items
      .filter((item): item is MicrosoftCalendarEventRaw & { id: string } => !!item.id)
      .map(toExternalCalendarEventFromMicrosoft);

    return {
      events,
      nextSyncToken: undefined, // Microsoft doesn't use sync tokens the same way
      hasMore: !!data['@odata.nextLink'],
    };
  }

  async createEvent(
    connection: { accessToken: string; refreshToken?: string },
    event: CalendarEventInput
  ): Promise<ExternalCalendarEvent> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: event.title,
        body: {
          contentType: 'text',
          content: event.description || '',
        },
        start: event.start,
        end: event.end,
        location: event.location ? { displayName: event.location } : undefined,
        attendees: event.attendees?.map((attendee) => ({
          emailAddress: {
            address: attendee.email,
            name: attendee.displayName,
          },
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to create Microsoft Calendar event: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as MicrosoftCalendarEventRaw;
    return toExternalCalendarEventFromMicrosoft(data);
  }

  async updateEvent(
    connection: { accessToken: string; refreshToken?: string },
    eventId: string,
    updates: Partial<CalendarEventInput>
  ): Promise<ExternalCalendarEvent> {
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: updates.title,
        body: updates.description
          ? {
              contentType: 'text',
              content: updates.description,
            }
          : undefined,
        start: updates.start,
        end: updates.end,
        location: updates.location ? { displayName: updates.location } : undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to update Microsoft Calendar event: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as MicrosoftCalendarEventRaw;
    return toExternalCalendarEventFromMicrosoft(data);
  }

  async deleteEvent(
    connection: { accessToken: string; refreshToken?: string },
    eventId: string
  ): Promise<void> {
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to delete Microsoft Calendar event: ${response.status} ${response.statusText}`
      );
    }
  }

  async getChanges(
    connection: { accessToken: string; refreshToken?: string },
    syncToken: string
  ): Promise<{
    events: ExternalCalendarEvent[];
    deletedEvents: string[];
    nextSyncToken: string;
  }> {
    // Microsoft Graph doesn't have a direct equivalent to Google Calendar's sync token
    // This is a simplified implementation
    const response = await fetch('https://graph.microsoft.com/v1.0/me/events?$delta=true', {
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Microsoft Graph delta sync error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const items = (data.value ?? []) as MicrosoftCalendarEventRaw[];
    const events: ExternalCalendarEvent[] = items
      .filter((item): item is MicrosoftCalendarEventRaw & { id: string } => !!item.id)
      .map(toExternalCalendarEventFromMicrosoft);

    return {
      events,
      deletedEvents: [], // Would need to check for @removed properties
      nextSyncToken: data['@odata.deltaLink'] || syncToken,
    };
  }
}


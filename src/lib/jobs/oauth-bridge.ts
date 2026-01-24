/**
 * Jobs OAuth Bridge
 *
 * Bridges the jobs calendar system to the new OAuth Integration Suite.
 * Provides backward-compatible interfaces while using the new multi-service OAuth architecture.
 */

import { eq, and, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { oauthConnections } from 'drizzle/schema/oauth';
import { decryptOAuthToken } from '@/lib/oauth/token-encryption';
import { CalendarSyncEngine, type CalendarEventInput } from '@/lib/oauth/calendar-sync';

// ============================================================================
// LEGACY COMPATIBILITY TYPES
// ============================================================================

export interface LegacyCalendarConnection {
  id: string;
  organizationId: string;
  userId: string;
  provider: 'google' | 'outlook';
  calendarId: string;
  calendarName: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string[];
  isActive: boolean;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// BRIDGE FUNCTIONS
// ============================================================================

/**
 * Maps new OAuth connection to legacy calendar connection format
 */
function mapOAuthToLegacyConnection(oauthConnection: any): LegacyCalendarConnection {
  return {
    id: oauthConnection.id,
    organizationId: oauthConnection.organizationId,
    userId: oauthConnection.userId || 'system', // May not have userId in new schema
    provider: oauthConnection.provider === 'google_workspace' ? 'google' : 'outlook',
    calendarId: oauthConnection.externalAccountId || 'primary',
    calendarName: `${oauthConnection.provider} Calendar`,
    accessToken: oauthConnection.accessToken,
    refreshToken: oauthConnection.refreshToken || '',
    expiresAt: oauthConnection.tokenExpiresAt || new Date(),
    scope: oauthConnection.scopes || [],
    isActive: oauthConnection.isActive !== false,
    lastSyncedAt: oauthConnection.lastSyncedAt,
    createdAt: oauthConnection.createdAt,
    updatedAt: oauthConnection.updatedAt,
  };
}

/**
 * Finds calendar OAuth connection for organization
 */
export async function getCalendarOAuthConnection(
  organizationId: string
): Promise<LegacyCalendarConnection | null> {
  // Find active calendar connection in new OAuth system
  const [connection] = await db
    .select()
    .from(oauthConnections)
    .where(
      and(
        eq(oauthConnections.organizationId, organizationId),
        eq(oauthConnections.serviceType, 'calendar'),
        eq(oauthConnections.isActive, true)
      )
    )
    .orderBy(desc(oauthConnections.updatedAt))
    .limit(1);

  if (!connection) {
    return null;
  }

  return mapOAuthToLegacyConnection(connection);
}

/**
 * Validates calendar connection by testing OAuth token
 */
export async function validateCalendarConnection(connectionId: string): Promise<boolean> {
  try {
    const [connection] = await db
      .select()
      .from(oauthConnections)
      .where(eq(oauthConnections.id, connectionId))
      .limit(1);

    if (!connection || !connection.isActive) {
      return false;
    }

    // Try to decrypt token as basic validation
    decryptOAuthToken(connection.accessToken, connection.organizationId);
    return true;
  } catch (error) {
    console.error('Calendar connection validation failed:', error);
    return false;
  }
}

/**
 * Syncs job data to calendar using new OAuth system
 */
export async function syncJobToCalendar(
  organizationId: string,
  jobData: {
    id: string;
    title: string;
    description?: string;
    scheduledDate: Date;
    scheduledTime?: string;
    duration?: number; // in minutes
    installerName?: string;
    location?: string;
  }
): Promise<{ success: boolean; calendarEventId?: string; error?: string }> {
  try {
    const connection = await getCalendarOAuthConnection(organizationId);
    if (!connection) {
      return { success: false, error: 'No active calendar connection found' };
    }

    // Decrypt tokens
    const accessToken = decryptOAuthToken(connection.accessToken, organizationId);
    const refreshToken = connection.refreshToken
      ? decryptOAuthToken(connection.refreshToken, organizationId)
      : undefined;

    // Convert job data to calendar event format
    const startDateTime = new Date(
      `${jobData.scheduledDate.toISOString().split('T')[0]}T${jobData.scheduledTime || '09:00'}:00`
    );
    const endDateTime = new Date(startDateTime);

    const eventData: CalendarEventInput = {
      title: jobData.title,
      description:
        jobData.description || `Job scheduled for ${jobData.installerName || 'installer'}`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'Australia/Sydney',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'Australia/Sydney',
      },
      location: jobData.location,
    };

    // Add duration if specified
    if (jobData.duration) {
      endDateTime.setMinutes(endDateTime.getMinutes() + jobData.duration);
    } else {
      // Default 1 hour duration
      endDateTime.setHours(endDateTime.getHours() + 1);
    }

    eventData.end.dateTime = endDateTime.toISOString();

    // Sync to calendar using new OAuth system
    const engine = new CalendarSyncEngine(db);
    const result = await engine.createEvent(
      connection.provider === 'google' ? 'google_workspace' : 'microsoft_365',
      { accessToken, refreshToken },
      eventData
    );

    return {
      success: true,
      calendarEventId: result.id,
    };
  } catch (error) {
    console.error('Job calendar sync failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown sync error',
    };
  }
}

/**
 * Updates existing calendar event for job changes
 *
 * @param organizationId - The organization ID
 * @param calendarEventId - The calendar event ID to update
 * @param updates - The fields to update
 */
export async function updateJobCalendarEvent(
  organizationId: string,
  calendarEventId: string,
  updates: Partial<{
    title: string;
    description: string;
    scheduledDate: Date;
    scheduledTime: string;
    duration: number;
    location: string;
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find the connection
    const connection = await getCalendarOAuthConnection(organizationId);
    if (!connection) {
      return { success: false, error: 'No active calendar connection found' };
    }

    // Prepare update data
    const updateData: Partial<CalendarEventInput> = {};
    if (updates.title) updateData.title = updates.title;
    if (updates.description) updateData.description = updates.description;
    if (updates.location) updateData.location = updates.location;

    // Handle time updates
    if (updates.scheduledDate || updates.scheduledTime) {
      const baseDate = updates.scheduledDate || new Date();
      const timeString = updates.scheduledTime || '09:00';

      const startDateTime = new Date(
        `${baseDate.toISOString().split('T')[0]}T${timeString}:00`
      );

      const endDateTime = new Date(startDateTime);
      if (updates.duration) {
        endDateTime.setMinutes(endDateTime.getMinutes() + updates.duration);
      }

      updateData.start = {
        dateTime: startDateTime.toISOString(),
        timeZone: 'Australia/Sydney',
      };
      updateData.end = {
        dateTime: endDateTime.toISOString(),
        timeZone: 'Australia/Sydney',
      };
    }

    // Decrypt tokens
    const accessToken = decryptOAuthToken(connection.accessToken, organizationId);
    const refreshToken = connection.refreshToken
      ? decryptOAuthToken(connection.refreshToken, organizationId)
      : undefined;

    // Use the new OAuth calendar sync to update
    const engine = new CalendarSyncEngine(db);
    await engine.updateEvent(
      connection.provider === 'google' ? 'google_workspace' : 'microsoft_365',
      { accessToken, refreshToken },
      calendarEventId,
      updateData
    );

    return {
      success: true,
    };
  } catch (error) {
    console.error('Job calendar update failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown update error',
    };
  }
}

/**
 * Removes job from calendar
 *
 * @param organizationId - The organization ID
 * @param calendarEventId - The calendar event ID to remove
 */
export async function removeJobFromCalendar(
  organizationId: string,
  calendarEventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const connection = await getCalendarOAuthConnection(organizationId);
    if (!connection) {
      return { success: false, error: 'No active calendar connection found' };
    }

    // Decrypt tokens
    const accessToken = decryptOAuthToken(connection.accessToken, organizationId);
    const refreshToken = connection.refreshToken
      ? decryptOAuthToken(connection.refreshToken, organizationId)
      : undefined;

    // Use new OAuth system to delete event
    const engine = new CalendarSyncEngine(db);
    await engine.deleteEvent(
      connection.provider === 'google' ? 'google_workspace' : 'microsoft_365',
      { accessToken, refreshToken },
      calendarEventId
    );

    return {
      success: true,
    };
  } catch (error) {
    console.error('Job calendar removal failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown removal error',
    };
  }
}

/**
 * Lists available calendars for the organization
 */
export async function listAvailableCalendars(
  organizationId: string
): Promise<Array<{ id: string; name: string; primary?: boolean }>> {
  try {
    const connection = await getCalendarOAuthConnection(organizationId);
    if (!connection) {
      return [];
    }

    const accessToken = decryptOAuthToken(connection.accessToken, organizationId);

    if (connection.provider === 'google') {
      const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Google calendars: ${response.statusText}`);
      }

      const data = await response.json();
      return (data.items || []).map((calendar: any) => ({
        id: calendar.id,
        name: calendar.summary,
        primary: calendar.primary,
      }));
    }

    const response = await fetch('https://graph.microsoft.com/v1.0/me/calendars', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Microsoft calendars: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.value || []).map((calendar: any) => ({
      id: calendar.id,
      name: calendar.name,
      primary: calendar.isDefaultCalendar,
    }));
  } catch (error) {
    console.error('Failed to list calendars:', error);
    return [];
  }
}

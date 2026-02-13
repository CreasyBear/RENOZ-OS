/**
 * Jobs OAuth Bridge
 *
 * Bridges the jobs calendar system to the new OAuth Integration Suite.
 * Provides backward-compatible interfaces while using the new multi-service OAuth architecture.
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { oauthConnections } from 'drizzle/schema/oauth';
import { decryptOAuthToken } from '@/lib/oauth/token-encryption';
import { CalendarSyncEngine, type CalendarEventInput } from '@/lib/oauth/calendar-sync';
import { withAuth } from '@/lib/server/protected';

// ============================================================================
// SCHEMAS
// ============================================================================

const jobDataSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  scheduledDate: z.date(),
  scheduledTime: z.string().optional(),
  duration: z.number().optional(),
  installerName: z.string().optional(),
  location: z.string().optional(),
});

const updatesSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  scheduledDate: z.date().optional(),
  scheduledTime: z.string().optional(),
  duration: z.number().optional(),
  location: z.string().optional(),
});

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
// HELPER FUNCTIONS
// ============================================================================

function mapOAuthToLegacyConnection(
  oauthConnection: import('@/lib/schemas/oauth/connection').OAuthConnectionForSync
): LegacyCalendarConnection {
  return {
    id: oauthConnection.id,
    organizationId: oauthConnection.organizationId,
    userId: oauthConnection.userId || 'system',
    provider: oauthConnection.provider === 'google_workspace' ? 'google' : 'outlook',
    calendarId: oauthConnection.externalAccountId || 'primary',
    calendarName: `${oauthConnection.provider} Calendar`,
    accessToken: oauthConnection.accessToken,
    refreshToken: oauthConnection.refreshToken || '',
    expiresAt: oauthConnection.tokenExpiresAt != null ? oauthConnection.tokenExpiresAt : new Date(),
    scope: oauthConnection.scopes || [],
    isActive: oauthConnection.isActive !== false,
    lastSyncedAt: oauthConnection.lastSyncedAt ?? undefined,
    createdAt: oauthConnection.createdAt,
    updatedAt: oauthConnection.updatedAt,
  };
}

// ============================================================================
// SERVER FUNCTIONS
// ============================================================================

/**
 * Get calendar OAuth connection for an organization
 */
export const getCalendarOAuthConnection = createServerFn({ method: 'GET' })
  .handler(async () => {
    const ctx = await withAuth();
    
    const connection = await db
      .select()
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.organizationId, ctx.organizationId),
          eq(oauthConnections.provider, 'google_workspace'),
          eq(oauthConnections.isActive, true)
        )
      )
      .orderBy(desc(oauthConnections.createdAt))
      .limit(1);

    if (!connection || connection.length === 0) {
      return null;
    }

    return mapOAuthToLegacyConnection(connection[0]);
  });

/**
 * List available calendars for OAuth sync
 */
export const listAvailableCalendars = createServerFn({ method: 'GET' })
  .handler(async () => {
    const ctx = await withAuth();
    
    const connections = await db
      .select()
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.organizationId, ctx.organizationId),
          eq(oauthConnections.isActive, true)
        )
      )
      .orderBy(desc(oauthConnections.createdAt));

    return connections.map(mapOAuthToLegacyConnection);
  });

/**
 * Sync a job to the connected calendar
 */
export const syncJobToCalendar = createServerFn({ method: 'POST' })
  .inputValidator(jobDataSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const jobData = data;
    
    const connection = await db
      .select()
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.organizationId, ctx.organizationId),
          eq(oauthConnections.provider, 'google_workspace'),
          eq(oauthConnections.isActive, true)
        )
      )
      .orderBy(desc(oauthConnections.createdAt))
      .limit(1);

    if (!connection || connection.length === 0) {
      return { success: false, error: 'No active calendar connection found' };
    }

    const conn = connection[0];
    const accessToken = decryptOAuthToken(conn.accessToken, ctx.organizationId);
    const refreshToken = conn.refreshToken
      ? decryptOAuthToken(conn.refreshToken, ctx.organizationId)
      : undefined;

    const engine = new CalendarSyncEngine(db);
    
    // Build start/end times
    const baseDate = jobData.scheduledDate;
    const timeString = jobData.scheduledTime || '09:00';
    const startDateTime = new Date(`${baseDate.toISOString().split('T')[0]}T${timeString}:00`);
    const endDateTime = new Date(startDateTime);
    if (jobData.duration) {
      endDateTime.setMinutes(endDateTime.getMinutes() + jobData.duration);
    }

    const eventInput: CalendarEventInput = {
      title: jobData.title,
      description: jobData.description,
      location: jobData.location,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'Australia/Sydney',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'Australia/Sydney',
      },
    };

    await engine.createEvent(
      conn.provider === 'google_workspace' ? 'google_workspace' : 'microsoft_365',
      { accessToken, refreshToken },
      eventInput
    );

    return { success: true };
  });

/**
 * Update an existing job calendar event
 */
export const updateJobCalendarEvent = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    jobId: z.string(),
    updates: updatesSchema,
  }))
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const { jobId, updates } = data;
    
    const connection = await db
      .select()
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.organizationId, ctx.organizationId),
          eq(oauthConnections.provider, 'google_workspace'),
          eq(oauthConnections.isActive, true)
        )
      )
      .orderBy(desc(oauthConnections.createdAt))
      .limit(1);

    if (!connection || connection.length === 0) {
      return { success: false, error: 'No active calendar connection found' };
    }

    const conn = connection[0];
    const accessToken = decryptOAuthToken(conn.accessToken, ctx.organizationId);
    const refreshToken = conn.refreshToken
      ? decryptOAuthToken(conn.refreshToken, ctx.organizationId)
      : undefined;

    const updateData: Partial<CalendarEventInput> = {};
    if (updates.title) updateData.title = updates.title;
    if (updates.description) updateData.description = updates.description;
    if (updates.location) updateData.location = updates.location;

    if (updates.scheduledDate || updates.scheduledTime) {
      const baseDate = updates.scheduledDate || new Date();
      const timeString = updates.scheduledTime || '09:00';
      const startDateTime = new Date(`${baseDate.toISOString().split('T')[0]}T${timeString}:00`);
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

    const engine = new CalendarSyncEngine(db);
    await engine.updateEvent(
      conn.provider === 'google_workspace' ? 'google_workspace' : 'microsoft_365',
      { accessToken, refreshToken },
      jobId,
      updateData
    );

    return { success: true };
  });

/**
 * Remove a job from the calendar
 */
export const removeJobFromCalendar = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    jobId: z.string(),
  }))
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const { jobId } = data;
    
    const connection = await db
      .select()
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.organizationId, ctx.organizationId),
          eq(oauthConnections.provider, 'google_workspace'),
          eq(oauthConnections.isActive, true)
        )
      )
      .orderBy(desc(oauthConnections.createdAt))
      .limit(1);

    if (!connection || connection.length === 0) {
      return { success: false, error: 'No active calendar connection found' };
    }

    const conn = connection[0];
    const accessToken = decryptOAuthToken(conn.accessToken, ctx.organizationId);
    const refreshToken = conn.refreshToken
      ? decryptOAuthToken(conn.refreshToken, ctx.organizationId)
      : undefined;

    const engine = new CalendarSyncEngine(db);
    await engine.deleteEvent(
      conn.provider === 'google_workspace' ? 'google_workspace' : 'microsoft_365',
      { accessToken, refreshToken },
      jobId
    );

    return { success: true };
  });

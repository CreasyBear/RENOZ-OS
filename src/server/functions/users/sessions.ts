/**
 * User Session Management Server Functions
 *
 * Server functions for managing user sessions.
 * Allows listing active sessions and terminating sessions.
 *
 * @see drizzle/schema/users.ts for userSessions schema
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { eq, and, gt, desc, ne, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userSessions } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { idParamSchema } from '@/lib/schemas';
import { getRequest } from '@tanstack/react-start/server';
import { UAParser } from 'ua-parser-js';

// ============================================================================
// TYPES
// ============================================================================

export interface SessionInfo {
  id: string;
  device: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser: string;
  ipAddress: string | null;
  lastActiveAt: Date | null;
  createdAt: Date;
  isCurrent: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Parse user agent string into device info
 */
function parseUserAgent(userAgent: string | null): {
  device: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser: string;
} {
  if (!userAgent) {
    return { device: 'Unknown Device', deviceType: 'unknown', browser: 'Unknown' };
  }

  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  // Determine device name
  let device = 'Unknown Device';
  if (result.device.vendor && result.device.model) {
    device = `${result.device.vendor} ${result.device.model}`;
  } else if (result.os.name) {
    device = result.os.name;
    if (result.os.version) {
      device += ` ${result.os.version}`;
    }
  }

  // Determine device type
  let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'unknown';
  if (result.device.type === 'mobile') {
    deviceType = 'mobile';
  } else if (result.device.type === 'tablet') {
    deviceType = 'tablet';
  } else if (
    result.os.name &&
    ['Windows', 'macOS', 'Mac OS', 'Linux', 'Chrome OS'].includes(result.os.name)
  ) {
    deviceType = 'desktop';
  }

  // Get browser info
  let browser = 'Unknown Browser';
  if (result.browser.name) {
    browser = result.browser.name;
    if (result.browser.version) {
      // Only include major version
      const majorVersion = result.browser.version.split('.')[0];
      browser += ` ${majorVersion}`;
    }
  }

  return { device, deviceType, browser };
}

// ============================================================================
// LIST SESSIONS
// ============================================================================

/**
 * List all active sessions for the current user.
 */
export const listMySessions = createServerFn({ method: 'GET' })
  .inputValidator(z.object({}))
  .handler(async (): Promise<SessionInfo[]> => {
    const ctx = await withAuth({ permission: PERMISSIONS.user.read });

    // Get current session token from request
    const request = getRequest();
    let currentToken: string | null = null;
    try {
      // Try to get session from cookie or authorization header
      const authHeader = request?.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        currentToken = authHeader.substring(7);
      } else {
        // Check for session cookie
        const cookies = request?.headers.get('cookie');
        if (cookies) {
          const sessionCookie = cookies.split(';').find((c) => c.trim().startsWith('session='));
          if (sessionCookie) {
            currentToken = sessionCookie.split('=')[1]?.trim() || null;
          }
        }
      }
    } catch {
      currentToken = null;
    }

    // Get active sessions (not expired)
    const sessions = await db
      .select({
        id: userSessions.id,
        sessionToken: userSessions.sessionToken,
        userAgent: userSessions.userAgent,
        ipAddress: userSessions.ipAddress,
        lastActiveAt: userSessions.lastActiveAt,
        createdAt: userSessions.createdAt,
      })
      .from(userSessions)
      .where(and(eq(userSessions.userId, ctx.user.id), gt(userSessions.expiresAt, new Date())))
      .orderBy(desc(userSessions.lastActiveAt));

    return sessions.map((session) => {
      const { device, deviceType, browser } = parseUserAgent(session.userAgent);
      return {
        id: session.id,
        device,
        deviceType,
        browser,
        ipAddress: session.ipAddress,
        lastActiveAt: session.lastActiveAt,
        createdAt: session.createdAt,
        isCurrent: session.sessionToken === currentToken,
      };
    });
  });

// ============================================================================
// TERMINATE SESSION
// ============================================================================

/**
 * Terminate a specific session (log out that device).
 */
export const terminateSession = createServerFn({ method: 'POST' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.user.update });

    // Verify session belongs to user
    const [session] = await db
      .select({ id: userSessions.id })
      .from(userSessions)
      .where(and(eq(userSessions.id, data.id), eq(userSessions.userId, ctx.user.id)))
      .limit(1);

    if (!session) {
      throw new Error('Session not found');
    }

    // Delete the session
    await db.delete(userSessions).where(eq(userSessions.id, data.id));

    return { success: true };
  });

// ============================================================================
// TERMINATE ALL OTHER SESSIONS
// ============================================================================

/**
 * Terminate all sessions except the current one.
 */
export const terminateAllOtherSessions = createServerFn({ method: 'POST' })
  .inputValidator(z.object({}))
  .handler(async () => {
    const ctx = await withAuth({ permission: PERMISSIONS.user.update });

    // Get current session token from request
    const request = getRequest();
    let currentToken: string | null = null;
    try {
      // Try to get session from cookie or authorization header
      const authHeader = request?.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        currentToken = authHeader.substring(7);
      } else {
        // Check for session cookie
        const cookies = request?.headers.get('cookie');
        if (cookies) {
          const sessionCookie = cookies.split(';').find((c) => c.trim().startsWith('session='));
          if (sessionCookie) {
            currentToken = sessionCookie.split('=')[1]?.trim() || null;
          }
        }
      }
    } catch {
      currentToken = null;
    }

    // Build delete condition
    const conditions = [eq(userSessions.userId, ctx.user.id)];

    // Exclude current session if we have a token
    if (currentToken) {
      conditions.push(ne(userSessions.sessionToken, currentToken));
    }

    // Delete all other sessions
    await db.delete(userSessions).where(and(...conditions));

    return {
      success: true,
    };
  });

// ============================================================================
// RECORD SESSION ACTIVITY
// ============================================================================

/**
 * Update last active timestamp for current session.
 * Called periodically by the client.
 */
export const recordSessionActivity = createServerFn({ method: 'POST' })
  .inputValidator(z.object({}))
  .handler(async () => {
    const ctx = await withAuth({ permission: PERMISSIONS.user.update });

    // Get current session token from request
    const request = getRequest();
    let currentToken: string | null = null;
    try {
      // Try to get session from cookie or authorization header
      const authHeader = request?.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        currentToken = authHeader.substring(7);
      } else {
        // Check for session cookie
        const cookies = request?.headers.get('cookie');
        if (cookies) {
          const sessionCookie = cookies.split(';').find((c) => c.trim().startsWith('session='));
          if (sessionCookie) {
            currentToken = sessionCookie.split('=')[1]?.trim() || null;
          }
        }
      }
    } catch {
      currentToken = null;
    }

    if (!currentToken) {
      return { success: false };
    }

    await db
      .update(userSessions)
      .set({
        lastActiveAt: new Date(),
        updatedBy: ctx.user.id,
        version: sql`version + 1`,
      })
      .where(
        and(eq(userSessions.userId, ctx.user.id), eq(userSessions.sessionToken, currentToken))
      );

    return { success: true };
  });

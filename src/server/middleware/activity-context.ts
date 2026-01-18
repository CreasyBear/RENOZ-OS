/**
 * Activity Context Middleware
 *
 * Provides request context extraction for activity logging.
 * Captures userId, ipAddress, and userAgent from the request.
 *
 * @see src/lib/activity-logger.ts for the ActivityLogger utility
 * @see _Initiation/_prd/2-domains/activities/activities.prd.json for full spec
 */

import { getRequest } from "@tanstack/react-start/server";
import { createActivityLogger, type ActivityContext, type ActivityLogger } from "@/lib/activity-logger";
import type { SessionContext } from "@/lib/server/protected";

// ============================================================================
// REQUEST CONTEXT EXTRACTION
// ============================================================================

/**
 * Extract IP address from request headers.
 * Handles various proxy configurations.
 *
 * @param request - The HTTP request
 * @returns IP address string or null
 */
export function getClientIpAddress(request: Request): string | null {
  // Standard proxy headers (ordered by priority)
  const headers = [
    "x-forwarded-for", // Most common, comma-separated list
    "x-real-ip", // Nginx proxy
    "cf-connecting-ip", // Cloudflare
    "x-client-ip", // Various proxies
    "x-cluster-client-ip", // Load balancers
    "forwarded", // RFC 7239 standard
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // x-forwarded-for can be a comma-separated list; take the first (original client)
      const ip = value.split(",")[0]?.trim();
      if (ip && isValidIp(ip)) {
        return ip;
      }
    }
  }

  return null;
}

/**
 * Basic IP address validation.
 */
function isValidIp(ip: string): boolean {
  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 pattern (simplified)
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

  return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
}

/**
 * Extract user agent from request headers.
 *
 * @param request - The HTTP request
 * @returns User agent string or null
 */
export function getUserAgent(request: Request): string | null {
  const userAgent = request.headers.get("user-agent");
  // Limit length to avoid storing very long user agents
  return userAgent ? userAgent.substring(0, 500) : null;
}

/**
 * Generate a unique request ID for correlation.
 *
 * @param request - The HTTP request (may already have x-request-id)
 * @returns Request ID string
 */
export function getRequestId(request: Request): string {
  // Check if a request ID was already provided
  const existingId = request.headers.get("x-request-id");
  if (existingId) {
    return existingId;
  }

  // Generate a new request ID
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// ACTIVITY CONTEXT BUILDER
// ============================================================================

/**
 * Build activity context from session and request.
 *
 * @param session - Session context from withAuth()
 * @param request - Optional request object (will use getRequest() if not provided)
 * @returns Activity context for the activity logger
 */
export function buildActivityContext(
  session: SessionContext,
  request?: Request
): ActivityContext {
  const req = request ?? getRequest();

  return {
    organizationId: session.organizationId,
    userId: session.user.id,
    ipAddress: getClientIpAddress(req),
    userAgent: getUserAgent(req),
    requestId: getRequestId(req),
  };
}

/**
 * Build activity context for system actions (no user session).
 *
 * @param organizationId - Organization ID for the action
 * @param options - Optional context options
 * @returns Activity context for system activity logging
 */
export function buildSystemActivityContext(
  organizationId: string,
  options?: {
    requestId?: string;
  }
): ActivityContext {
  return {
    organizationId,
    userId: null, // System actions have no user
    ipAddress: null,
    userAgent: null,
    requestId: options?.requestId ?? `sys_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  };
}

// ============================================================================
// ACTIVITY LOGGER FACTORY WITH CONTEXT
// ============================================================================

/**
 * Create an activity logger with context from the current session and request.
 *
 * @param session - Session context from withAuth()
 * @param request - Optional request object
 * @returns ActivityLogger instance with injected context
 *
 * @example
 * ```ts
 * // In a server function
 * export const updateCustomer = createServerFn({ method: 'POST' })
 *   .inputValidator(updateCustomerSchema)
 *   .handler(async ({ data }) => {
 *     const ctx = await withAuth({ permission: 'customer.update' });
 *     const logger = createActivityLoggerWithContext(ctx);
 *
 *     // ... perform update ...
 *
 *     await logger.logUpdate('customer', customer.id, oldCustomer, newCustomer);
 *     return newCustomer;
 *   });
 * ```
 */
export function createActivityLoggerWithContext(
  session: SessionContext,
  request?: Request
): ActivityLogger {
  const context = buildActivityContext(session, request);
  return createActivityLogger(context);
}

/**
 * Create an activity logger for system actions (no user session).
 *
 * @param organizationId - Organization ID for the action
 * @param options - Optional context options
 * @returns ActivityLogger instance for system logging
 *
 * @example
 * ```ts
 * // In a background job
 * const logger = createSystemActivityLogger(organizationId, {
 *   requestId: job.id,
 * });
 * await logger.log({
 *   entityType: 'order',
 *   entityId: order.id,
 *   action: 'updated',
 *   description: 'Order status automatically updated by scheduler',
 * });
 * ```
 */
export function createSystemActivityLogger(
  organizationId: string,
  options?: {
    requestId?: string;
  }
): ActivityLogger {
  const context = buildSystemActivityContext(organizationId, options);
  return createActivityLogger(context);
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { ActivityContext, ActivityLogger } from "@/lib/activity-logger";

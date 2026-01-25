/**
 * Activity Logger Utility
 *
 * Provides functions for logging activities to the audit trail.
 * Activities are logged asynchronously to avoid blocking main transactions.
 *
 * @see drizzle/schema/activities.ts for database schema
 * @see src/lib/schemas/activities.ts for validation schemas
 * @see _Initiation/_prd/2-domains/activities/activities.prd.json for full spec
 */

import { db } from "@/lib/db";
import { activities, type ActivityChanges, type ActivityMetadata } from "drizzle/schema";
import type { ActivityAction, ActivityEntityType } from "./schemas/activities";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Context for activity logging, typically injected from request middleware.
 */
export interface ActivityContext {
  /** Organization ID for multi-tenant isolation */
  organizationId: string;
  /** User ID of the actor (null for system actions) */
  userId?: string | null;
  /** IP address of the request */
  ipAddress?: string | null;
  /** User agent string */
  userAgent?: string | null;
  /** Optional request ID for correlation */
  requestId?: string;
}

/**
 * Parameters for logging an activity.
 */
export interface LogActivityParams {
  /** Type of entity being acted upon */
  entityType: ActivityEntityType;
  /** ID of the entity */
  entityId: string;
  /** Action performed */
  action: ActivityAction;
  /** Field changes (for updates) */
  changes?: ActivityChanges;
  /** Additional metadata */
  metadata?: ActivityMetadata;
  /** Human-readable description */
  description?: string;
}

/**
 * Parameters for computing field changes between two states.
 */
export interface ComputeChangesParams<T extends Record<string, unknown>> {
  /** Previous state (null for creates) */
  before: T | null;
  /** Current state (null for deletes) */
  after: T | null;
  /** Fields to exclude from change detection */
  excludeFields?: (keyof T)[];
  /** Sensitive fields to mask in the audit log */
  sensitiveFields?: (keyof T)[];
}

// ============================================================================
// ACTIVITY LOGGER CLASS
// ============================================================================

/**
 * Activity logger with context injection.
 *
 * @example
 * ```ts
 * // Create logger with context (typically from middleware)
 * const logger = createActivityLogger({
 *   organizationId: ctx.organizationId,
 *   userId: ctx.user.id,
 *   ipAddress: request.headers.get('x-forwarded-for'),
 *   userAgent: request.headers.get('user-agent'),
 * });
 *
 * // Log an activity
 * await logger.log({
 *   entityType: 'customer',
 *   entityId: customer.id,
 *   action: 'updated',
 *   changes: computeChanges({ before: oldCustomer, after: newCustomer }),
 *   description: 'Updated customer contact information',
 * });
 * ```
 */
export class ActivityLogger {
  private context: ActivityContext;
  private queue: Promise<void>[] = [];
  private maxQueueSize = 100;

  constructor(context: ActivityContext) {
    this.context = context;
  }

  /**
   * Log an activity asynchronously.
   * The activity is queued and logged without blocking the caller.
   *
   * @param params - Activity parameters
   * @returns Promise that resolves when the activity is logged
   */
  async log(params: LogActivityParams): Promise<void> {
    const { entityType, entityId, action, changes, metadata, description } = params;

    // Add requestId to metadata if available
    const enrichedMetadata: ActivityMetadata = {
      ...metadata,
      ...(this.context.requestId && { requestId: this.context.requestId }),
    };

    try {
      await db.insert(activities).values({
        organizationId: this.context.organizationId,
        userId: this.context.userId ?? null,
        entityType,
        entityId,
        action,
        changes: changes ?? null,
        metadata: Object.keys(enrichedMetadata).length > 0 ? enrichedMetadata : null,
        ipAddress: this.context.ipAddress ?? null,
        userAgent: this.context.userAgent ?? null,
        description: description ?? null,
        createdBy: this.context.userId ?? null,
      });
    } catch (error) {
      // Log error but don't throw - activity logging should not fail the main operation
      console.error("[ActivityLogger] Failed to log activity:", error, {
        entityType,
        entityId,
        action,
      });
    }
  }

  /**
   * Log activity asynchronously without awaiting (fire-and-forget).
   * Use this when you don't need to wait for the activity to be logged.
   *
   * @param params - Activity parameters
   */
  logAsync(params: LogActivityParams): void {
    // Clean up completed promises periodically
    if (this.queue.length > this.maxQueueSize) {
      this.queue = this.queue.filter(
        (p) =>
          !(p as Promise<void> & { _resolved?: boolean })._resolved
      );
    }

    const promise = this.log(params).then(() => {
      (promise as Promise<void> & { _resolved?: boolean })._resolved = true;
    });
    this.queue.push(promise);
  }

  /**
   * Wait for all queued activities to be logged.
   * Call this before ending a request if you need to ensure all activities are persisted.
   */
  async flush(): Promise<void> {
    await Promise.allSettled(this.queue);
    this.queue = [];
  }

  /**
   * Log a create action.
   */
  async logCreate(
    entityType: ActivityEntityType,
    entityId: string,
    entity: Record<string, unknown>,
    options?: { description?: string; excludeFields?: string[] }
  ): Promise<void> {
    const changes = computeChanges({
      before: null,
      after: entity,
      excludeFields: options?.excludeFields as never[],
    });

    await this.log({
      entityType,
      entityId,
      action: "created",
      changes,
      description: options?.description,
    });
  }

  /**
   * Log an update action.
   */
  async logUpdate(
    entityType: ActivityEntityType,
    entityId: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    options?: { description?: string; excludeFields?: string[] }
  ): Promise<void> {
    const changes = computeChanges({
      before,
      after,
      excludeFields: options?.excludeFields as never[],
    });

    // Only log if there are actual changes
    if (changes.fields && changes.fields.length > 0) {
      await this.log({
        entityType,
        entityId,
        action: "updated",
        changes,
        description: options?.description,
      });
    }
  }

  /**
   * Log a delete action.
   */
  async logDelete(
    entityType: ActivityEntityType,
    entityId: string,
    entity: Record<string, unknown>,
    options?: { description?: string; excludeFields?: string[] }
  ): Promise<void> {
    const changes = computeChanges({
      before: entity,
      after: null,
      excludeFields: options?.excludeFields as never[],
    });

    await this.log({
      entityType,
      entityId,
      action: "deleted",
      changes,
      description: options?.description,
    });
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create an ActivityLogger instance with the given context.
 *
 * @param context - Activity context (organizationId, userId, etc.)
 * @returns ActivityLogger instance
 */
export function createActivityLogger(context: ActivityContext): ActivityLogger {
  return new ActivityLogger(context);
}

// ============================================================================
// CHANGE COMPUTATION
// ============================================================================

/**
 * Compute changes between two states for audit logging.
 *
 * @param params - Before/after states and options
 * @returns ActivityChanges object with before, after, and changed fields
 *
 * @example
 * ```ts
 * const changes = computeChanges({
 *   before: { name: 'John', email: 'john@example.com' },
 *   after: { name: 'John Doe', email: 'john@example.com' },
 *   excludeFields: ['updatedAt'],
 * });
 * // Result: { before: { name: 'John' }, after: { name: 'John Doe' }, fields: ['name'] }
 * ```
 */
export function computeChanges<T extends Record<string, unknown>>(
  params: ComputeChangesParams<T>
): ActivityChanges {
  const { before, after, excludeFields = [], sensitiveFields = [] } = params;

  // For creates (no before state)
  if (!before && after) {
    const maskedAfter = maskSensitiveFields(after, sensitiveFields);
    const filteredAfter = excludeFieldsFromObject(maskedAfter, excludeFields);
    return {
      before: undefined,
      after: filteredAfter,
      fields: Object.keys(filteredAfter),
    };
  }

  // For deletes (no after state)
  if (before && !after) {
    const maskedBefore = maskSensitiveFields(before, sensitiveFields);
    const filteredBefore = excludeFieldsFromObject(maskedBefore, excludeFields);
    return {
      before: filteredBefore,
      after: undefined,
      fields: Object.keys(filteredBefore),
    };
  }

  // For updates
  if (before && after) {
    const changedFields: string[] = [];
    const beforeChanges: Record<string, unknown> = {};
    const afterChanges: Record<string, unknown> = {};

    // Find all keys from both objects
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
      // Skip excluded fields
      if (excludeFields.includes(key as keyof T)) {
        continue;
      }

      const beforeValue = before[key];
      const afterValue = after[key];

      // Check if values are different
      if (!isEqual(beforeValue, afterValue)) {
        changedFields.push(key);

        // Mask sensitive fields
        if (sensitiveFields.includes(key as keyof T)) {
          beforeChanges[key] = beforeValue !== undefined ? "[REDACTED]" : undefined;
          afterChanges[key] = afterValue !== undefined ? "[REDACTED]" : undefined;
        } else {
          beforeChanges[key] = beforeValue;
          afterChanges[key] = afterValue;
        }
      }
    }

    return {
      before: changedFields.length > 0 ? beforeChanges : undefined,
      after: changedFields.length > 0 ? afterChanges : undefined,
      fields: changedFields,
    };
  }

  // No changes
  return { fields: [] };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Mask sensitive fields in an object.
 */
function maskSensitiveFields<T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields: (keyof T)[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveFields.includes(key as keyof T)) {
      result[key] = value !== undefined ? "[REDACTED]" : undefined;
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Exclude fields from an object.
 */
function excludeFieldsFromObject<T extends Record<string, unknown>>(
  obj: Record<string, unknown>,
  excludeFields: (keyof T)[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!excludeFields.includes(key as keyof T)) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Deep equality check for values.
 */
function isEqual(a: unknown, b: unknown): boolean {
  // Handle null/undefined
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (a === undefined || b === undefined) return false;

  // Handle dates
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i])) return false;
    }
    return true;
  }

  // Handle objects
  if (typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (
        !isEqual(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key]
        )
      ) {
        return false;
      }
    }
    return true;
  }

  // Primitive comparison
  return a === b;
}

// ============================================================================
// DEFAULT EXCLUDED FIELDS
// ============================================================================

/**
 * Fields commonly excluded from activity logs.
 */
export const DEFAULT_EXCLUDED_FIELDS = [
  "updatedAt",
  "createdAt",
  "deletedAt",
  "version",
] as const;

/**
 * Sensitive fields that should be redacted in activity logs.
 */
export const SENSITIVE_FIELDS = [
  "password",
  "passwordHash",
  "token",
  "apiKey",
  "secret",
  "accessToken",
  "refreshToken",
] as const;

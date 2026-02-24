/**
 * Audit Logs Server Functions
 *
 * Server functions for audit trail management.
 * Provides read-only access to audit logs and utilities for logging.
 *
 * @see drizzle/schema/audit-logs.ts for database schema
 * @see src/lib/schemas/users.ts for validation schemas
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { eq, and, desc, gte, lte, count as drizzleCount } from 'drizzle-orm';
import { db } from '@/lib/db';
import { auditLogs, users } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { auditLogFilterSchema } from '@/lib/schemas/users';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from 'drizzle/schema';
import { buildSafeCSV } from '@/lib/utils/csv-sanitize';
import type { FlexibleJson } from '@/lib/schemas/_shared/patterns';

// ============================================================================
// LIST AUDIT LOGS
// ============================================================================

/**
 * List audit logs for the organization.
 * Requires: audit.read permission
 */
export const listAuditLogs = createServerFn({ method: 'GET' })
  .inputValidator(auditLogFilterSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.audit.read });

    const { page, pageSize, userId, action, entityType, entityId, dateFrom, dateTo } = data;
    const offset = (page - 1) * pageSize;

    // Build conditions
    const conditions = [eq(auditLogs.organizationId, ctx.organizationId)];

    if (userId) {
      conditions.push(eq(auditLogs.userId, userId));
    }
    if (action) {
      conditions.push(eq(auditLogs.action, action));
    }
    if (entityType) {
      conditions.push(eq(auditLogs.entityType, entityType));
    }
    if (entityId) {
      conditions.push(eq(auditLogs.entityId, entityId));
    }
    if (dateFrom) {
      conditions.push(gte(auditLogs.timestamp, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(auditLogs.timestamp, dateTo));
    }

    // Get logs with user info
    const logs = await db
      .select({
        id: auditLogs.id,
        organizationId: auditLogs.organizationId,
        userId: auditLogs.userId,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        oldValues: auditLogs.oldValues,
        newValues: auditLogs.newValues,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        timestamp: auditLogs.timestamp,
        metadata: auditLogs.metadata,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
        },
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(auditLogs.timestamp))
      .limit(pageSize)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: drizzleCount() })
      .from(auditLogs)
      .where(and(...conditions));

    return {
      items: logs.map((log) => ({
        ...log,
        oldValues: log.oldValues as FlexibleJson | null,
        newValues: log.newValues as FlexibleJson | null,
      })),
      pagination: {
        page,
        pageSize,
        totalItems: count,
        totalPages: Math.ceil(count / pageSize),
      },
    };
  });

// ============================================================================
// GET ENTITY AUDIT TRAIL
// ============================================================================

const entityAuditTrailSchema = z.object({
  entityType: z.string(),
  entityId: z.string().uuid(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Get audit trail for a specific entity.
 * Requires: audit.read permission
 */
export const getEntityAuditTrail = createServerFn({ method: 'GET' })
  .inputValidator(entityAuditTrailSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.audit.read });

    const { entityType, entityId, page, pageSize } = data;
    const offset = (page - 1) * pageSize;

    const logs = await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        action: auditLogs.action,
        oldValues: auditLogs.oldValues,
        newValues: auditLogs.newValues,
        timestamp: auditLogs.timestamp,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
        },
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(
        and(
          eq(auditLogs.organizationId, ctx.organizationId),
          eq(auditLogs.entityType, entityType),
          eq(auditLogs.entityId, entityId)
        )
      )
      .orderBy(desc(auditLogs.timestamp))
      .limit(pageSize)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: drizzleCount() })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.organizationId, ctx.organizationId),
          eq(auditLogs.entityType, entityType),
          eq(auditLogs.entityId, entityId)
        )
      );

    return {
      items: logs.map((log) => ({
        ...log,
        oldValues: log.oldValues as FlexibleJson | null,
        newValues: log.newValues as FlexibleJson | null,
      })),
      pagination: {
        page,
        pageSize,
        totalItems: count,
        totalPages: Math.ceil(count / pageSize),
      },
    };
  });

// ============================================================================
// GET USER ACTIVITY
// ============================================================================

const userActivitySchema = z.object({
  userId: z.string().uuid(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

/**
 * Get all activity by a specific user.
 * Requires: audit.read permission
 */
export const getUserActivity = createServerFn({ method: 'GET' })
  .inputValidator(userActivitySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.audit.read });

    const { userId, page, pageSize, dateFrom, dateTo } = data;
    const offset = (page - 1) * pageSize;

    const conditions = [
      eq(auditLogs.organizationId, ctx.organizationId),
      eq(auditLogs.userId, userId),
    ];

    if (dateFrom) {
      conditions.push(gte(auditLogs.timestamp, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(auditLogs.timestamp, dateTo));
    }

    const logs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        timestamp: auditLogs.timestamp,
        ipAddress: auditLogs.ipAddress,
      })
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.timestamp))
      .limit(pageSize)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: drizzleCount() })
      .from(auditLogs)
      .where(and(...conditions));

    return {
      items: logs,
      pagination: {
        page,
        pageSize,
        totalItems: count,
        totalPages: Math.ceil(count / pageSize),
      },
    };
  });

// ============================================================================
// GET MY ACTIVITY
// ============================================================================

/**
 * Get current user's own activity.
 * No special permissions required.
 */
export const getMyActivity = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const { page, pageSize } = data;
    const offset = (page - 1) * pageSize;

    const logs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        timestamp: auditLogs.timestamp,
        ipAddress: auditLogs.ipAddress,
      })
      .from(auditLogs)
      .where(and(eq(auditLogs.userId, ctx.user.id), eq(auditLogs.organizationId, ctx.organizationId)))
      .orderBy(desc(auditLogs.timestamp))
      .limit(pageSize)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: drizzleCount() })
      .from(auditLogs)
      .where(and(eq(auditLogs.userId, ctx.user.id), eq(auditLogs.organizationId, ctx.organizationId)));

    return {
      items: logs,
      pagination: {
        page,
        pageSize,
        totalItems: count,
        totalPages: Math.ceil(count / pageSize),
      },
    };
  });

// ============================================================================
// GET AUDIT STATS
// ============================================================================

const auditStatsSchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

/**
 * Get audit log statistics for dashboard.
 * Requires: audit.read permission
 */
export const getAuditStats = createServerFn({ method: 'GET' })
  .inputValidator(auditStatsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.audit.read });

    const conditions = [eq(auditLogs.organizationId, ctx.organizationId)];

    if (data.dateFrom) {
      conditions.push(gte(auditLogs.timestamp, data.dateFrom));
    }
    if (data.dateTo) {
      conditions.push(lte(auditLogs.timestamp, data.dateTo));
    }

    // Total logs
    const [{ totalLogs }] = await db
      .select({ totalLogs: drizzleCount() })
      .from(auditLogs)
      .where(and(...conditions));

    // Logs by action category
    const actionStats = await db
      .select({
        action: auditLogs.action,
        count: drizzleCount(),
      })
      .from(auditLogs)
      .where(and(...conditions))
      .groupBy(auditLogs.action)
      .orderBy(desc(drizzleCount()))
      .limit(10);

    // Logs by entity type
    const entityStats = await db
      .select({
        entityType: auditLogs.entityType,
        count: drizzleCount(),
      })
      .from(auditLogs)
      .where(and(...conditions))
      .groupBy(auditLogs.entityType)
      .orderBy(desc(drizzleCount()))
      .limit(100);

    // Most active users
    const userStats = await db
      .select({
        userId: auditLogs.userId,
        userName: users.name,
        userEmail: users.email,
        count: drizzleCount(),
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(and(...conditions))
      .groupBy(auditLogs.userId, users.name, users.email)
      .orderBy(desc(drizzleCount()))
      .limit(10);

    return {
      totalLogs,
      actionStats,
      entityStats,
      userStats,
    };
  });

// ============================================================================
// GET AVAILABLE ACTIONS
// ============================================================================

/**
 * Get list of available audit actions.
 * Useful for filter dropdowns.
 */
export const getAuditActions = createServerFn({ method: 'GET' }).handler(async () => {
  await withAuth({ permission: PERMISSIONS.audit.read });
  return Object.values(AUDIT_ACTIONS);
});

// ============================================================================
// GET AVAILABLE ENTITY TYPES
// ============================================================================

/**
 * Get list of available entity types.
 * Useful for filter dropdowns.
 */
export const getAuditEntityTypes = createServerFn({ method: 'GET' }).handler(async () => {
  await withAuth({ permission: PERMISSIONS.audit.read });
  return Object.values(AUDIT_ENTITY_TYPES);
});

// ============================================================================
// EXPORT AUDIT LOGS
// ============================================================================

const exportAuditLogsSchema = auditLogFilterSchema.extend({
  format: z.enum(['json', 'csv']).default('json'),
});

/**
 * Export audit logs to JSON or CSV.
 * Requires: audit.export permission
 */
export const exportAuditLogs = createServerFn({ method: 'POST' })
  .inputValidator(exportAuditLogsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.audit.export });

    const { userId, action, entityType, entityId, dateFrom, dateTo, format } = data;

    // Build conditions
    const conditions = [eq(auditLogs.organizationId, ctx.organizationId)];

    if (userId) {
      conditions.push(eq(auditLogs.userId, userId));
    }
    if (action) {
      conditions.push(eq(auditLogs.action, action));
    }
    if (entityType) {
      conditions.push(eq(auditLogs.entityType, entityType));
    }
    if (entityId) {
      conditions.push(eq(auditLogs.entityId, entityId));
    }
    if (dateFrom) {
      conditions.push(gte(auditLogs.timestamp, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(auditLogs.timestamp, dateTo));
    }

    // Get all matching logs (limit to 10000 for safety)
    const logs = await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        oldValues: auditLogs.oldValues,
        newValues: auditLogs.newValues,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        timestamp: auditLogs.timestamp,
      })
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.timestamp))
      .limit(10000);

    // Log the export action (dynamic import - audit-logs-internal uses getRequest, server-only)
    const { logAuditEvent } = await import('./audit-logs-internal');
    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: AUDIT_ACTIONS.DATA_EXPORT,
      entityType: AUDIT_ENTITY_TYPES.SESSION,
      metadata: {
        exportType: 'audit_logs',
        format,
        recordCount: logs.length,
        filters: { userId, action, entityType, entityId, dateFrom, dateTo },
      },
    });

    if (format === 'csv') {
      // Convert to CSV with injection protection
      const headers = [
        'id',
        'userId',
        'action',
        'entityType',
        'entityId',
        'timestamp',
        'ipAddress',
      ];
      const rows = logs.map((log) => [
        log.id,
        log.userId || '',
        log.action,
        log.entityType,
        log.entityId || '',
        log.timestamp.toISOString(),
        log.ipAddress || '',
      ]);

      return {
        format: 'csv',
        content: buildSafeCSV(headers, rows),
        count: logs.length,
      };
    }

    return {
      format: 'json',
      content: JSON.stringify(logs, null, 2),
      count: logs.length,
    };
  });

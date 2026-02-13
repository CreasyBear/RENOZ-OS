/**
 * Data Exports Server Functions
 *
 * Server functions for managing data export jobs.
 * Handles export creation, status tracking, and file management.
 * Exports are processed synchronously.
 *
 * @see drizzle/schema/data-exports.ts for database schema
 */
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { eq, and, sql, desc, asc, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  dataExports,
  EXPORTABLE_ENTITIES,
  EXPORT_EXPIRATION_DAYS,
  MAX_CONCURRENT_EXPORTS,
  MAX_EXPORT_SIZE_BYTES,
  type ExportMetadata,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { logAuditEvent } from '../_shared/audit-logs';
import { AUDIT_ACTIONS } from 'drizzle/schema';
import { paginationSchema } from '@/lib/schemas';
import { cursorPaginationSchema } from '@/lib/db/pagination';
import { decodeCursor, buildCursorCondition, buildStandardCursorResponse } from '@/lib/db/pagination';
import { uploadFile, deleteFile, createSignedUrl } from '@/lib/storage';
import { isOurStorageUrl, extractStoragePathFromPublicUrl } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { fetchEntitiesForExport } from './data-exports/export-entities';
// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================
const idParamSchema = z.object({
  id: z.string().uuid(),
});
const exportFormatSchema = z.enum(['csv', 'json', 'xlsx']);
const exportStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
  'expired',
]);
const createExportSchema = z.object({
  entities: z.array(z.enum(EXPORTABLE_ENTITIES)).min(1).max(10),
  format: exportFormatSchema,
  filters: z.record(z.string(), z.unknown()).optional(),
  dateRange: z
    .object({
      start: z.coerce.date().optional(),
      end: z.coerce.date().optional(),
    })
    .optional(),
  anonymized: z.boolean().optional().default(false),
  includedFields: z.array(z.string()).optional(),
});
const listExportsSchema = paginationSchema.extend({
  status: exportStatusSchema.optional(),
  format: exportFormatSchema.optional(),
});

const listExportsCursorSchema = cursorPaginationSchema.merge(
  z.object({
    status: exportStatusSchema.optional(),
    format: exportFormatSchema.optional(),
  })
);
// ============================================================================
// LIST EXPORTS
// ============================================================================
/**
 * List export jobs for the current user.
 */
export const listDataExports = createServerFn({ method: 'GET' })
  .inputValidator(listExportsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const { page, pageSize, status, format } = data;
    const offset = (page - 1) * pageSize;
    const conditions = [
      eq(dataExports.organizationId, ctx.organizationId),
      eq(dataExports.requestedBy, ctx.user.id),
    ];
    if (status) {
      conditions.push(eq(dataExports.status, status));
    }
    if (format) {
      conditions.push(eq(dataExports.format, format));
    }
    const exports = await db
      .select({
        id: dataExports.id,
        organizationId: dataExports.organizationId,
        requestedBy: dataExports.requestedBy,
        entities: dataExports.entities,
        format: dataExports.format,
        status: dataExports.status,
        fileUrl: dataExports.fileUrl,
        fileName: dataExports.fileName,
        fileSize: dataExports.fileSize,
        recordCount: dataExports.recordCount,
        expiresAt: dataExports.expiresAt,
        startedAt: dataExports.startedAt,
        completedAt: dataExports.completedAt,
        errorMessage: dataExports.errorMessage,
        createdAt: dataExports.createdAt,
      })
      .from(dataExports)
      .where(and(...conditions))
      .orderBy(desc(dataExports.createdAt))
      .limit(pageSize)
      .offset(offset);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(dataExports)
      .where(and(...conditions));
    return {
      items: exports,
      pagination: {
        page,
        pageSize,
        totalItems: count,
        totalPages: Math.ceil(count / pageSize),
      },
    };
  });

/**
 * List export jobs with cursor pagination (recommended for large datasets).
 */
export const listDataExportsCursor = createServerFn({ method: 'GET' })
  .inputValidator(listExportsCursorSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const { cursor, pageSize = 20, sortOrder = 'desc', status, format } = data;

    const conditions = [
      eq(dataExports.organizationId, ctx.organizationId),
      eq(dataExports.requestedBy, ctx.user.id),
    ];
    if (status) conditions.push(eq(dataExports.status, status));
    if (format) conditions.push(eq(dataExports.format, format));

    if (cursor) {
      const cursorPosition = decodeCursor(cursor);
      if (cursorPosition) {
        conditions.push(buildCursorCondition(dataExports.createdAt, dataExports.id, cursorPosition, sortOrder));
      }
    }

    const orderDir = sortOrder === 'asc' ? asc : desc;
    const exports = await db
      .select({
        id: dataExports.id,
        organizationId: dataExports.organizationId,
        requestedBy: dataExports.requestedBy,
        entities: dataExports.entities,
        format: dataExports.format,
        status: dataExports.status,
        fileUrl: dataExports.fileUrl,
        fileName: dataExports.fileName,
        fileSize: dataExports.fileSize,
        recordCount: dataExports.recordCount,
        expiresAt: dataExports.expiresAt,
        startedAt: dataExports.startedAt,
        completedAt: dataExports.completedAt,
        errorMessage: dataExports.errorMessage,
        createdAt: dataExports.createdAt,
      })
      .from(dataExports)
      .where(and(...conditions))
      .orderBy(orderDir(dataExports.createdAt), orderDir(dataExports.id))
      .limit(pageSize + 1);

    return buildStandardCursorResponse(exports, pageSize);
  });

// ============================================================================
// GET EXPORT
// ============================================================================
/**
 * Get a single export job by ID.
 */
export const getDataExport = createServerFn({ method: 'GET' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const [exportJob] = await db
      .select()
      .from(dataExports)
      .where(and(eq(dataExports.id, data.id), eq(dataExports.organizationId, ctx.organizationId)))
      .limit(1);
    if (!exportJob) {
      throw new NotFoundError('Export not found', 'export');
    }
    // Users can only see their own exports unless admin
    if (
      exportJob.requestedBy !== ctx.user.id &&
      ctx.user.role !== 'admin' &&
      ctx.user.role !== 'owner'
    ) {
      throw new NotFoundError('Export not found', 'export');
    }
    return exportJob;
  });
// ============================================================================
// SERIALIZATION HELPERS
// ============================================================================

function rowsToCsv(exportResults: { entity: string; rows: Record<string, unknown>[] }[]): string {
  const lines: string[] = [];
  const allKeys = new Set<string>();
  for (const { rows } of exportResults) {
    for (const row of rows) {
      for (const k of Object.keys(row)) {
        allKeys.add(k);
      }
    }
  }
  const headers = ['entity', ...Array.from(allKeys)];
  lines.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','));

  for (const { entity, rows } of exportResults) {
    for (const row of rows) {
      const values = headers.slice(1).map(h => {
        const v = row[h];
        if (v === null || v === undefined) return '""';
        const s = String(v);
        return `"${s.replace(/"/g, '""')}"`;
      });
      lines.push([`"${entity}"`, ...values].join(','));
    }
  }
  return lines.join('\n');
}

function rowsToJson(exportResults: { entity: string; rows: Record<string, unknown>[] }[]): string {
  const output: Record<string, Record<string, unknown>[]> = {};
  for (const { entity, rows } of exportResults) {
    output[entity] = rows;
  }
  return JSON.stringify(output, null, 0);
}

// ============================================================================
// CREATE EXPORT
// ============================================================================
/**
 * Create and process a new export synchronously.
 * Fetches data, serializes, uploads to storage, and returns the completed export.
 */
export const createDataExport = createServerFn({ method: 'POST' })
  .inputValidator(createExportSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.audit.export });

    // Check concurrent export limit (processing = in-flight)
    const [{ processingCount }] = await db
      .select({ processingCount: sql<number>`count(*)::int` })
      .from(dataExports)
      .where(
        and(
          eq(dataExports.organizationId, ctx.organizationId),
          sql`${dataExports.status} IN ('pending', 'processing')`
        )
      );
    if (processingCount >= MAX_CONCURRENT_EXPORTS) {
      throw new ValidationError(
        `Maximum of ${MAX_CONCURRENT_EXPORTS} exports in progress. Please wait for current exports to complete.`
      );
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + EXPORT_EXPIRATION_DAYS);

    // Generate filename (xlsx format outputs CSV for now)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `export-${data.entities.join('-')}-${timestamp}.${data.format}`;

    const metadata: ExportMetadata = {
      filters: data.filters,
      anonymized: data.anonymized,
      includedFields: data.includedFields,
      dateRange: data.dateRange
        ? {
            start: data.dateRange.start?.toISOString(),
            end: data.dateRange.end?.toISOString(),
          }
        : undefined,
    };

    // Insert record with processing status
    const [created] = await db
      .insert(dataExports)
      .values({
        organizationId: ctx.organizationId,
        requestedBy: ctx.user.id,
        entities: data.entities,
        format: data.format,
        status: 'processing',
        fileName,
        expiresAt,
        metadata,
        startedAt: new Date(),
      })
      .returning();

    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: AUDIT_ACTIONS.DATA_EXPORT,
      entityType: 'export',
      entityId: created.id,
      newValues: {
        entities: data.entities,
        format: data.format,
      },
    });

    try {
      // Extend timeout for export (120s)
      await db.execute(sql`SET LOCAL statement_timeout = '120s'`);

      const dateRange = data.dateRange
        ? {
            start: data.dateRange.start,
            end: data.dateRange.end,
          }
        : undefined;

      const exportResults = await fetchEntitiesForExport({
        organizationId: ctx.organizationId,
        entities: data.entities,
        dateRange,
        filters: data.filters,
      });

      const totalRows = exportResults.reduce((sum, r) => sum + r.rows.length, 0);

      let content: string;
      const contentType = data.format === 'json' ? 'application/json' : 'text/csv';
      const storageExt = data.format === 'xlsx' ? 'csv' : data.format;

      if (data.format === 'json') {
        content = rowsToJson(exportResults);
      } else {
        content = rowsToCsv(exportResults);
      }

      const contentBuffer = Buffer.from(content, 'utf-8');

      if (contentBuffer.byteLength > MAX_EXPORT_SIZE_BYTES) {
        throw new ValidationError(
          `Export exceeds maximum size (${MAX_EXPORT_SIZE_BYTES / 1024 / 1024}MB). Try narrowing the date range or selecting fewer entities.`
        );
      }

      const storagePath = `${ctx.organizationId}/exports/${created.id}.${storageExt}`;

      const arrayBuffer = contentBuffer.buffer.slice(
        contentBuffer.byteOffset,
        contentBuffer.byteOffset + contentBuffer.byteLength
      );

      await uploadFile({
        path: storagePath,
        fileBody: arrayBuffer,
        contentType,
        upsert: true,
      });

      await db
        .update(dataExports)
        .set({
          status: 'completed',
          fileUrl: storagePath,
          fileSize: contentBuffer.length,
          recordCount: totalRows,
          completedAt: new Date(),
        })
        .where(eq(dataExports.id, created.id));

      const [updated] = await db
        .select()
        .from(dataExports)
        .where(eq(dataExports.id, created.id))
        .limit(1);

      return {
        id: updated!.id,
        status: updated!.status,
        entities: updated!.entities,
        format: updated!.format,
        fileName: updated!.fileName,
        expiresAt: updated!.expiresAt,
        createdAt: updated!.createdAt,
        fileSize: updated!.fileSize,
        recordCount: updated!.recordCount,
      };
    } catch (err) {
      const errorMessage =
        err instanceof ValidationError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Export failed. Try narrowing the date range or selecting fewer entities.';

      await db
        .update(dataExports)
        .set({
          status: 'failed',
          errorMessage,
          completedAt: new Date(),
        })
        .where(eq(dataExports.id, created.id));

      logger.error('[data-exports] Export failed', { exportId: created.id, error: err });

      if (err instanceof ValidationError) throw err;
      throw new ValidationError(errorMessage);
    }
  });
// ============================================================================
// CANCEL EXPORT
// ============================================================================
/**
 * Cancel a pending export job.
 */
export const cancelDataExport = createServerFn({ method: 'POST' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const [exportJob] = await db
      .select()
      .from(dataExports)
      .where(
        and(
          eq(dataExports.id, data.id),
          eq(dataExports.organizationId, ctx.organizationId),
          eq(dataExports.requestedBy, ctx.user.id)
        )
      )
      .limit(1);
    if (!exportJob) {
      throw new NotFoundError('Export not found', 'export');
    }
    if (exportJob.status !== 'pending' && exportJob.status !== 'processing') {
      throw new ValidationError('Only pending or processing exports can be cancelled');
    }
    const [updated] = await db
      .update(dataExports)
      .set({ status: 'cancelled' })
      .where(eq(dataExports.id, data.id))
      .returning();
    return {
      id: updated.id,
      status: updated.status,
    };
  });
// ============================================================================
// DELETE EXPORT
// ============================================================================
/**
 * Delete an export and its file.
 */
export const deleteDataExport = createServerFn({ method: 'POST' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const [exportJob] = await db
      .select()
      .from(dataExports)
      .where(
        and(
          eq(dataExports.id, data.id),
          eq(dataExports.organizationId, ctx.organizationId),
          eq(dataExports.requestedBy, ctx.user.id)
        )
      )
      .limit(1);
    if (!exportJob) {
      throw new NotFoundError('Export not found', 'export');
    }

    if (exportJob.fileUrl) {
      const path = isOurStorageUrl(exportJob.fileUrl)
        ? extractStoragePathFromPublicUrl(exportJob.fileUrl, 'attachments')
        : exportJob.fileUrl;
      if (path) {
        try {
          await deleteFile({ path });
        } catch {
          logger.warn('Export file delete failed', { path: exportJob.fileUrl });
        }
      }
    }

    await db.delete(dataExports).where(eq(dataExports.id, data.id));
    return { success: true };
  });
// ============================================================================
// GET EXPORTABLE ENTITIES
// ============================================================================
/**
 * Get list of entities that can be exported.
 */
export const getExportableEntities = createServerFn({ method: 'GET' }).handler(async () => {
  return EXPORTABLE_ENTITIES;
});
// ============================================================================
// CLEANUP EXPIRED EXPORTS
// ============================================================================
/**
 * Clean up expired exports.
 * Should be run periodically via cron job.
 */
export async function cleanupExpiredExports(): Promise<number> {
  const now = new Date();
  // Mark expired exports
  const expired = await db
    .update(dataExports)
    .set({ status: 'expired' })
    .where(and(lte(dataExports.expiresAt, now), eq(dataExports.status, 'completed')))
    .returning({ id: dataExports.id, fileUrl: dataExports.fileUrl });

  for (const exp of expired) {
    if (exp.fileUrl) {
      const path = isOurStorageUrl(exp.fileUrl)
        ? extractStoragePathFromPublicUrl(exp.fileUrl, 'attachments')
        : exp.fileUrl;
      if (path) {
        try {
          await deleteFile({ path });
        } catch {
          logger.warn('Expired export file delete failed', { path: exp.fileUrl });
        }
      }
    }
  }

  return expired.length;
}
// ============================================================================
// GET EXPORT DOWNLOAD URL
// ============================================================================
/**
 * Get a signed download URL for a completed export.
 */
export const getExportDownloadUrl = createServerFn({ method: 'GET' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const [exportJob] = await db
      .select({
        id: dataExports.id,
        status: dataExports.status,
        fileUrl: dataExports.fileUrl,
        fileName: dataExports.fileName,
        expiresAt: dataExports.expiresAt,
        requestedBy: dataExports.requestedBy,
        organizationId: dataExports.organizationId,
      })
      .from(dataExports)
      .where(
        and(
          eq(dataExports.id, data.id),
          eq(dataExports.organizationId, ctx.organizationId),
          eq(dataExports.requestedBy, ctx.user.id)
        )
      )
      .limit(1);
    if (!exportJob) {
      throw new NotFoundError('Export not found', 'export');
    }
    if (exportJob.status !== 'completed') {
      throw new ValidationError('Export is not ready for download');
    }
    if (!exportJob.fileUrl) {
      throw new ValidationError('Export file not available');
    }
    if (exportJob.expiresAt && new Date(exportJob.expiresAt) < new Date()) {
      throw new ValidationError('Export has expired');
    }

    const path = isOurStorageUrl(exportJob.fileUrl)
      ? extractStoragePathFromPublicUrl(exportJob.fileUrl, 'attachments')
      : exportJob.fileUrl;

    if (!path) {
      throw new ValidationError('Export file not available');
    }

    const { signedUrl } = await createSignedUrl({
      path,
      expiresIn: 3600,
      download: exportJob.fileName ?? true,
    });

    return {
      url: signedUrl,
      fileName: exportJob.fileName,
      expiresAt: exportJob.expiresAt,
    };
  });

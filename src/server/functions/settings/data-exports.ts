/**
 * Data Exports Server Functions
 *
 * Server functions for managing data export jobs.
 * Handles export creation, status tracking, and file management.
 *
 * @see drizzle/schema/data-exports.ts for database schema
 */
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { eq, and, sql, desc, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  dataExports,
  EXPORTABLE_ENTITIES,
  EXPORT_EXPIRATION_DAYS,
  MAX_CONCURRENT_EXPORTS,
  type ExportMetadata,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { logAuditEvent } from '../_shared/audit-logs';
import { AUDIT_ACTIONS } from 'drizzle/schema';
import { paginationSchema } from '@/lib/schemas';
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
      throw new Error('Export not found');
    }
    // Users can only see their own exports unless admin
    if (
      exportJob.requestedBy !== ctx.user.id &&
      ctx.user.role !== 'admin' &&
      ctx.user.role !== 'owner'
    ) {
      throw new Error('Export not found');
    }
    return exportJob;
  });
// ============================================================================
// CREATE EXPORT
// ============================================================================
/**
 * Create a new export job.
 * The job will be processed asynchronously.
 */
export const createDataExport = createServerFn({ method: 'POST' })
  .inputValidator(createExportSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.audit.export });
    // Check concurrent export limit
    const [{ pendingCount }] = await db
      .select({ pendingCount: sql<number>`count(*)::int` })
      .from(dataExports)
      .where(
        and(eq(dataExports.organizationId, ctx.organizationId), eq(dataExports.status, 'pending'))
      );
    if (pendingCount >= MAX_CONCURRENT_EXPORTS) {
      throw new Error(
        `Maximum of ${MAX_CONCURRENT_EXPORTS} pending exports. Please wait for current exports to complete.`
      );
    }
    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + EXPORT_EXPIRATION_DAYS);
    // Generate filename
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
    const [created] = await db
      .insert(dataExports)
      .values({
        organizationId: ctx.organizationId,
        requestedBy: ctx.user.id,
        entities: data.entities,
        format: data.format,
        status: 'pending',
        fileName,
        expiresAt,
        metadata,
      })
      .returning();
    // Log audit
    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: AUDIT_ACTIONS.DATA_EXPORT,
      entityType: 'export' as any,
      entityId: created.id,
      newValues: {
        entities: data.entities,
        format: data.format,
      },
    });
    // TODO: Trigger background job to process export
    // This would typically be done via a queue (e.g., BullMQ, SQS)
    // For now, we just create the pending job
    return {
      id: created.id,
      status: created.status,
      entities: created.entities,
      format: created.format,
      fileName: created.fileName,
      expiresAt: created.expiresAt,
      createdAt: created.createdAt,
    };
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
      throw new Error('Export not found');
    }
    if (exportJob.status !== 'pending' && exportJob.status !== 'processing') {
      throw new Error('Only pending or processing exports can be cancelled');
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
      throw new Error('Export not found');
    }
    // TODO: Delete file from storage if exists
    // if (exportJob.fileUrl) {
    //   await deleteFile(exportJob.fileUrl);
    // }
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
  // TODO: Delete files from storage
  // for (const exp of expired) {
  //   if (exp.fileUrl) {
  //     await deleteFile(exp.fileUrl);
  //   }
  // }
  return expired.length;
}
// ============================================================================
// UPDATE EXPORT STATUS (Internal)
// ============================================================================
/**
 * Update export job status.
 * Used by background job processor.
 */
export async function updateExportStatus(
  exportId: string,
  update: {
    status: 'processing' | 'completed' | 'failed';
    fileUrl?: string;
    fileSize?: number;
    recordCount?: number;
    errorMessage?: string;
  }
): Promise<void> {
  const updateData: Record<string, unknown> = {
    status: update.status,
  };
  if (update.status === 'processing') {
    updateData.startedAt = new Date();
  }
  if (update.status === 'completed' || update.status === 'failed') {
    updateData.completedAt = new Date();
  }
  if (update.fileUrl) updateData.fileUrl = update.fileUrl;
  if (update.fileSize) updateData.fileSize = update.fileSize;
  if (update.recordCount) updateData.recordCount = update.recordCount;
  if (update.errorMessage) updateData.errorMessage = update.errorMessage;
  await db.update(dataExports).set(updateData).where(eq(dataExports.id, exportId));
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
      throw new Error('Export not found');
    }
    if (exportJob.status !== 'completed') {
      throw new Error('Export is not ready for download');
    }
    if (!exportJob.fileUrl) {
      throw new Error('Export file not available');
    }
    if (exportJob.expiresAt && new Date(exportJob.expiresAt) < new Date()) {
      throw new Error('Export has expired');
    }
    // TODO: Generate signed URL if using cloud storage
    // For now, return the stored URL
    return {
      url: exportJob.fileUrl,
      fileName: exportJob.fileName,
      expiresAt: exportJob.expiresAt,
    };
  });

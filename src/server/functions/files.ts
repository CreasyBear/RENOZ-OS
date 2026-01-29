/**
 * Project Files Server Functions
 *
 * Server-side functions for project file attachments.
 *
 * SPRINT-03: Real implementation replacing stubs
 *
 * @see src/lib/schemas/jobs/workstreams-notes.ts for validation schemas
 * @see drizzle/schema/jobs/workstreams-notes.ts for database schema
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projectFiles } from 'drizzle/schema';
import {
  createFileSchema,
  updateFileSchema,
  fileIdSchema,
  filesListQuerySchema,
} from '@/lib/schemas/jobs/workstreams-notes';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';

// ============================================================================
// FILE CRUD
// ============================================================================

/**
 * List files for a project
 */
export const listFiles = createServerFn({ method: 'GET' })
  .inputValidator(filesListQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });

    const { projectId, siteVisitId, fileType, page, pageSize } = data;

    // Build conditions
    const conditions = [
      eq(projectFiles.organizationId, ctx.organizationId),
      eq(projectFiles.projectId, projectId),
    ];

    if (siteVisitId) {
      conditions.push(eq(projectFiles.siteVisitId, siteVisitId));
    }
    if (fileType) {
      conditions.push(eq(projectFiles.fileType, fileType));
    }

    const whereClause = and(...conditions);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(projectFiles)
      .where(whereClause);
    const totalItems = Number(countResult[0]?.count ?? 0);

    // Get paginated results
    const offset = (page - 1) * pageSize;
    const files = await db
      .select()
      .from(projectFiles)
      .where(whereClause)
      .orderBy(asc(projectFiles.position), desc(projectFiles.createdAt))
      .limit(pageSize)
      .offset(offset);

    return {
      success: true,
      data: files,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  });

/**
 * Get a single file by ID
 */
export const getFile = createServerFn({ method: 'GET' })
  .inputValidator(fileIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });

    const [file] = await db
      .select()
      .from(projectFiles)
      .where(
        and(
          eq(projectFiles.id, data.id),
          eq(projectFiles.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!file) {
      throw new Error('File not found');
    }

    return {
      success: true,
      data: file,
    };
  });

/**
 * Create a new file record
 */
export const createFile = createServerFn({ method: 'POST' })
  .inputValidator(createFileSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.create });

    // Get max position for this project
    const [{ maxPosition }] = await db
      .select({ maxPosition: sql<number>`max(${projectFiles.position})` })
      .from(projectFiles)
      .where(
        and(
          eq(projectFiles.projectId, data.projectId),
          eq(projectFiles.organizationId, ctx.organizationId)
        )
      );

    const position = data.position ?? (maxPosition ?? -1) + 1;

    const [file] = await db
      .insert(projectFiles)
      .values({
        organizationId: ctx.organizationId,
        projectId: data.projectId,
        siteVisitId: data.siteVisitId ?? null,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize ?? null,
        mimeType: data.mimeType ?? null,
        fileType: data.fileType,
        description: null,
        position,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    return {
      success: true,
      data: file,
    };
  });

/**
 * Update an existing file record
 */
export const updateFile = createServerFn({ method: 'POST' })
  .inputValidator(updateFileSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });

    const { id, ...updates } = data;

    const [file] = await db
      .update(projectFiles)
      .set({
        ...updates,
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectFiles.id, id),
          eq(projectFiles.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!file) {
      throw new Error('File not found');
    }

    return {
      success: true,
      data: file,
    };
  });

/**
 * Delete a file record
 */
export const deleteFile = createServerFn({ method: 'POST' })
  .inputValidator(fileIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.delete });

    // Get file to find its position
    const [file] = await db
      .select()
      .from(projectFiles)
      .where(
        and(
          eq(projectFiles.id, data.id),
          eq(projectFiles.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (file) {
      // Delete the file record
      await db
        .delete(projectFiles)
        .where(eq(projectFiles.id, data.id));

      // Reorder remaining files
      await db
        .update(projectFiles)
        .set({
          position: sql`${projectFiles.position} - 1`,
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(projectFiles.projectId, file.projectId),
            eq(projectFiles.organizationId, ctx.organizationId),
            sql`${projectFiles.position} > ${file.position}`
          )
        );
    }

    return {
      success: true,
    };
  });

/**
 * Get files statistics for a project
 */
export const getProjectFilesStats = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      projectId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });

    const stats = await db
      .select({
        fileType: projectFiles.fileType,
        count: sql<number>`count(*)`,
        totalSize: sql<number>`coalesce(sum(${projectFiles.fileSize}), 0)`,
      })
      .from(projectFiles)
      .where(
        and(
          eq(projectFiles.projectId, data.projectId),
          eq(projectFiles.organizationId, ctx.organizationId)
        )
      )
      .groupBy(projectFiles.fileType);

    const totalCount = stats.reduce((acc, s) => acc + s.count, 0);
    const totalSize = stats.reduce((acc, s) => acc + s.totalSize, 0);

    return {
      success: true,
      data: {
        totalCount,
        totalSize,
        byType: stats,
      },
    };
  });

/**
 * Reorder files within a project
 */
export const reorderFiles = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      projectId: z.string().uuid(),
      fileIds: z.array(z.string().uuid()),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });

    // Update positions based on the provided order
    const updates = data.fileIds.map((id, index) =>
      db
        .update(projectFiles)
        .set({
          position: index,
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(projectFiles.id, id),
            eq(projectFiles.projectId, data.projectId),
            eq(projectFiles.organizationId, ctx.organizationId)
          )
        )
    );

    await Promise.all(updates);

    return {
      success: true,
    };
  });

// Import z for input schemas
import { z } from 'zod';

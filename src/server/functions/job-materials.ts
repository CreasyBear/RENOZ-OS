/**
 * Job Materials Server Functions
 *
 * Server-side functions for job material BOM operations.
 * Includes enhanced tracking for serial numbers, photos, and installation location.
 *
 * Story 029: Enhanced Materials Tracking
 *
 * @path src/server/functions/job-materials.ts
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { jobMaterials } from 'drizzle/schema';
import {
  listJobMaterialsSchema,
  addJobMaterialSchema,
  updateJobMaterialSchema,
  removeJobMaterialSchema,
  recordMaterialInstallationSchema,
} from '@/lib/schemas/jobs/job-materials';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';

// ============================================================================
// MATERIAL CRUD
// ============================================================================

/**
 * List materials for a job
 */
export const listJobMaterials = createServerFn({ method: 'GET' })
  .inputValidator(listJobMaterialsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });

    const materials = await db.query.jobMaterials.findMany({
      where: and(
        eq(jobMaterials.jobId, data.jobId),
        eq(jobMaterials.organizationId, ctx.organizationId)
      ),
      with: {
        product: true,
      },
    });

    return materials;
  });

/**
 * Add a material to a job's BOM
 */
export const addJobMaterial = createServerFn({ method: 'POST' })
  .inputValidator(addJobMaterialSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });

    const [material] = await db
      .insert(jobMaterials)
      .values({
        organizationId: ctx.organizationId,
        jobId: data.jobId,
        productId: data.productId,
        quantityRequired: data.quantityRequired,
        unitCost: data.unitCost,
        notes: data.notes,
      })
      .returning();

    return material;
  });

/**
 * Update a job material entry
 */
export const updateJobMaterial = createServerFn({ method: 'POST' })
  .inputValidator(updateJobMaterialSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });

    const { materialId, ...updates } = data;

    const [material] = await db
      .update(jobMaterials)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(jobMaterials.id, materialId),
          eq(jobMaterials.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!material) {
      throw new Error('Material not found');
    }

    return material;
  });

/**
 * Remove a material from a job's BOM
 */
export const removeJobMaterial = createServerFn({ method: 'POST' })
  .inputValidator(removeJobMaterialSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.delete });

    const [material] = await db
      .delete(jobMaterials)
      .where(
        and(
          eq(jobMaterials.id, data.materialId),
          eq(jobMaterials.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!material) {
      throw new Error('Material not found');
    }

    return { success: true };
  });

// ============================================================================
// ENHANCED MATERIAL TRACKING (Story 029)
// ============================================================================

/**
 * Record material installation with serial numbers, location, and photos
 */
export const recordMaterialInstallation = createServerFn({ method: 'POST' })
  .inputValidator(recordMaterialInstallationSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });

    const { materialId, serialNumbers, installedLocation, photos, quantityUsed } = data;

    // Verify material exists
    const existingMaterial = await db.query.jobMaterials.findFirst({
      where: and(
        eq(jobMaterials.id, materialId),
        eq(jobMaterials.organizationId, ctx.organizationId)
      ),
    });

    if (!existingMaterial) {
      throw new Error('Material not found');
    }

    const [material] = await db
      .update(jobMaterials)
      .set({
        quantityUsed,
        serialNumbers,
        installedLocation,
        photos,
        isInstalled: true,
        installedAt: new Date(),
        installedBy: ctx.user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(jobMaterials.id, materialId),
          eq(jobMaterials.organizationId, ctx.organizationId)
        )
      )
      .returning();

    return material;
  });

/**
 * Job Materials Server Functions
 *
 * Server-side functions for job BOM (Bill of Materials) operations.
 * All functions use withAuth for authentication and filter by organizationId.
 *
 * @see src/lib/schemas/job-materials.ts for validation schemas
 * @see drizzle/schema/job-materials.ts for database schema
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-002b
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { jobMaterials, jobAssignments, products } from 'drizzle/schema';
import {
  listJobMaterialsSchema,
  addJobMaterialSchema,
  updateJobMaterialSchema,
  removeJobMaterialSchema,
  reserveJobStockSchema,
  calculateJobMaterialCostSchema,
  getJobMaterialSchema,
  type MaterialResponse,
  type JobMaterialCostSummary,
} from '@/lib/schemas';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError } from '@/lib/server/errors';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import { computeChanges } from '@/lib/activity-logger';

// ============================================================================
// ACTIVITY LOGGING HELPERS
// ============================================================================

/**
 * Fields to exclude from activity change tracking (system-managed)
 */
const JOB_MATERIAL_EXCLUDED_FIELDS: string[] = [
  'updatedAt',
  'updatedBy',
  'createdAt',
  'createdBy',
  'deletedAt',
  'organizationId',
];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Verify job belongs to the user's organization.
 * Returns the job with customerId if found, throws NotFoundError otherwise.
 */
async function verifyJobAccess(jobId: string, organizationId: string) {
  const [job] = await db
    .select({ id: jobAssignments.id, customerId: jobAssignments.customerId })
    .from(jobAssignments)
    .where(and(eq(jobAssignments.id, jobId), eq(jobAssignments.organizationId, organizationId)))
    .limit(1);

  if (!job) {
    throw new NotFoundError('Job not found');
  }

  return job;
}

/**
 * Verify material belongs to the user's organization.
 * Returns the material if found, throws NotFoundError otherwise.
 */
async function verifyMaterialAccess(materialId: string, organizationId: string) {
  const [material] = await db
    .select({ id: jobMaterials.id, jobId: jobMaterials.jobId })
    .from(jobMaterials)
    .where(and(eq(jobMaterials.id, materialId), eq(jobMaterials.organizationId, organizationId)))
    .limit(1);

  if (!material) {
    throw new NotFoundError('Material not found');
  }

  return material;
}

/**
 * Verify product exists and belongs to the user's organization.
 * Returns the product if found, throws NotFoundError otherwise.
 */
async function verifyProductAccess(productId: string, organizationId: string) {
  const [product] = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      description: products.description,
    })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.organizationId, organizationId)))
    .limit(1);

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  return product;
}

// ============================================================================
// LIST JOB MATERIALS
// ============================================================================

/**
 * Get all materials for a job assignment with product details.
 */
export const listJobMaterials = createServerFn({ method: 'GET' })
  .inputValidator(listJobMaterialsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.read ?? 'customer.read',
    });

    // Verify job access
    await verifyJobAccess(data.jobId, ctx.organizationId);

    // Get materials with product details
    const materials = await db
      .select({
        id: jobMaterials.id,
        jobId: jobMaterials.jobId,
        productId: jobMaterials.productId,
        quantityRequired: jobMaterials.quantityRequired,
        quantityUsed: jobMaterials.quantityUsed,
        unitCost: jobMaterials.unitCost,
        notes: jobMaterials.notes,
        createdAt: jobMaterials.createdAt,
        updatedAt: jobMaterials.updatedAt,
        createdBy: jobMaterials.createdBy,
        updatedBy: jobMaterials.updatedBy,
        productSku: products.sku,
        productName: products.name,
        productDescription: products.description,
      })
      .from(jobMaterials)
      .leftJoin(products, eq(jobMaterials.productId, products.id))
      .where(
        and(eq(jobMaterials.jobId, data.jobId), eq(jobMaterials.organizationId, ctx.organizationId))
      )
      .orderBy(jobMaterials.createdAt);

    // Transform to MaterialResponse
    const response: MaterialResponse[] = materials.map((m) => ({
      id: m.id,
      jobId: m.jobId,
      productId: m.productId,
      quantityRequired: Number(m.quantityRequired),
      quantityUsed: Number(m.quantityUsed),
      unitCost: Number(m.unitCost),
      notes: m.notes,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      createdBy: m.createdBy,
      updatedBy: m.updatedBy,
      product: {
        id: m.productId,
        sku: m.productSku,
        name: m.productName ?? '',
        description: m.productDescription,
      },
    }));

    return { materials: response };
  });

// ============================================================================
// ADD JOB MATERIAL
// ============================================================================

/**
 * Add a material to a job's BOM.
 */
export const addJobMaterial = createServerFn({ method: 'POST' })
  .inputValidator(addJobMaterialSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.update ?? 'customer.update',
    });
    const logger = createActivityLoggerWithContext(ctx);

    // Verify job access and get customerId for activity logging
    const job = await verifyJobAccess(data.jobId, ctx.organizationId);

    // Verify product access and get details
    const product = await verifyProductAccess(data.productId, ctx.organizationId);

    // Insert the material
    const [material] = await db
      .insert(jobMaterials)
      .values({
        organizationId: ctx.organizationId,
        jobId: data.jobId,
        productId: data.productId,
        quantityRequired: data.quantityRequired,
        quantityUsed: 0,
        unitCost: data.unitCost,
        notes: data.notes ?? null,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    // Log material addition
    logger.logAsync({
      entityType: 'job_material',
      entityId: material.id,
      action: 'created',
      description: `Added material to job: ${product.name ?? product.sku} (qty: ${data.quantityRequired})`,
      changes: computeChanges({
        before: null,
        after: material,
        excludeFields: JOB_MATERIAL_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        customerId: job.customerId ?? undefined,
        materialId: material.id,
        jobAssignmentId: data.jobId,
        productId: product.id,
        productName: product.name ?? undefined,
        quantity: Number(data.quantityRequired),
        customFields: {
          sku: product.sku ?? null,
          unitCost: Number(data.unitCost),
        },
      },
    });

    const response: MaterialResponse = {
      id: material.id,
      jobId: material.jobId,
      productId: material.productId,
      quantityRequired: Number(material.quantityRequired),
      quantityUsed: Number(material.quantityUsed),
      unitCost: Number(material.unitCost),
      notes: material.notes,
      createdAt: material.createdAt,
      updatedAt: material.updatedAt,
      createdBy: material.createdBy,
      updatedBy: material.updatedBy,
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name ?? '',
        description: product.description,
      },
    };

    return { material: response };
  });

// ============================================================================
// UPDATE JOB MATERIAL
// ============================================================================

/**
 * Update a job material entry.
 */
export const updateJobMaterial = createServerFn({ method: 'POST' })
  .inputValidator(updateJobMaterialSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.update ?? 'customer.update',
    });
    const logger = createActivityLoggerWithContext(ctx);

    // Get existing material for change tracking
    const [existingMaterial] = await db
      .select()
      .from(jobMaterials)
      .where(eq(jobMaterials.id, data.materialId))
      .limit(1);

    if (!existingMaterial) {
      throw new NotFoundError('Material not found');
    }

    const before = existingMaterial;

    // Get customerId from job for activity logging
    const job = await verifyJobAccess(existingMaterial.jobId, ctx.organizationId);

    // Build update object
    const updates: Record<string, unknown> = {
      updatedBy: ctx.user.id,
      updatedAt: new Date(),
    };

    if (data.quantityRequired !== undefined) {
      updates.quantityRequired = data.quantityRequired;
    }
    if (data.quantityUsed !== undefined) {
      updates.quantityUsed = data.quantityUsed;
    }
    if (data.unitCost !== undefined) {
      updates.unitCost = data.unitCost;
    }
    if (data.notes !== undefined) {
      updates.notes = data.notes;
    }

    // Update the material
    const [material] = await db
      .update(jobMaterials)
      .set(updates)
      .where(eq(jobMaterials.id, data.materialId))
      .returning();

    // Get product details
    const [product] = await db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        description: products.description,
      })
      .from(products)
      .where(eq(products.id, material.productId))
      .limit(1);

    // Log material update
    const changes = computeChanges({
      before,
      after: material,
      excludeFields: JOB_MATERIAL_EXCLUDED_FIELDS as never[],
    });

    if (changes.fields && changes.fields.length > 0) {
      logger.logAsync({
        entityType: 'job_material',
        entityId: material.id,
        action: 'updated',
        description: `Updated material: ${product?.name ?? product?.sku ?? 'Unknown'}`,
        changes,
        metadata: {
          customerId: job.customerId ?? undefined,
          materialId: material.id,
          jobAssignmentId: material.jobId,
          productId: material.productId,
          productName: product?.name ?? undefined,
          quantity: Number(material.quantityRequired),
          changedFields: changes.fields,
        },
      });
    }

    const response: MaterialResponse = {
      id: material.id,
      jobId: material.jobId,
      productId: material.productId,
      quantityRequired: Number(material.quantityRequired),
      quantityUsed: Number(material.quantityUsed),
      unitCost: Number(material.unitCost),
      notes: material.notes,
      createdAt: material.createdAt,
      updatedAt: material.updatedAt,
      createdBy: material.createdBy,
      updatedBy: material.updatedBy,
      product: {
        id: product?.id ?? material.productId,
        sku: product?.sku ?? null,
        name: product?.name ?? '',
        description: product?.description ?? null,
      },
    };

    return { material: response };
  });

// ============================================================================
// REMOVE JOB MATERIAL
// ============================================================================

/**
 * Remove a material from a job's BOM.
 */
export const removeJobMaterial = createServerFn({ method: 'POST' })
  .inputValidator(removeJobMaterialSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.update ?? 'customer.update',
    });
    const logger = createActivityLoggerWithContext(ctx);

    // Get existing material for activity logging
    const [existingMaterial] = await db
      .select()
      .from(jobMaterials)
      .where(eq(jobMaterials.id, data.materialId))
      .limit(1);

    if (!existingMaterial) {
      throw new NotFoundError('Material not found');
    }

    // Get product details for logging
    const [product] = await db
      .select({ name: products.name, sku: products.sku })
      .from(products)
      .where(eq(products.id, existingMaterial.productId))
      .limit(1);

    // Get customerId from job for activity logging
    const job = await verifyJobAccess(existingMaterial.jobId, ctx.organizationId);

    // Delete the material
    await db.delete(jobMaterials).where(eq(jobMaterials.id, data.materialId));

    // Log material removal
    logger.logAsync({
      entityType: 'job_material',
      entityId: existingMaterial.id,
      action: 'deleted',
      description: `Removed material from job: ${product?.name ?? product?.sku ?? 'Unknown'}`,
      changes: computeChanges({
        before: existingMaterial,
        after: null,
        excludeFields: JOB_MATERIAL_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        customerId: job.customerId ?? undefined,
        materialId: existingMaterial.id,
        jobAssignmentId: existingMaterial.jobId,
        productId: existingMaterial.productId,
        productName: product?.name ?? undefined,
        quantity: Number(existingMaterial.quantityRequired),
      },
    });

    return { success: true, jobId: existingMaterial.jobId };
  });

// ============================================================================
// RESERVE JOB STOCK
// ============================================================================

/**
 * Reserve inventory for a job's materials.
 *
 * Note: This is a placeholder implementation. Full inventory reservation
 * requires integration with the inventory domain (DOM-INV).
 * For now, it validates the materials exist and returns success.
 */
export const reserveJobStock = createServerFn({ method: 'POST' })
  .inputValidator(reserveJobStockSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.update ?? 'customer.update',
    });

    // Verify job access
    await verifyJobAccess(data.jobId, ctx.organizationId);

    // Get materials to reserve
    let materials;
    if (data.materialIds && data.materialIds.length > 0) {
      // Reserve specific materials
      materials = await db
        .select({
          id: jobMaterials.id,
          productId: jobMaterials.productId,
          quantityRequired: jobMaterials.quantityRequired,
        })
        .from(jobMaterials)
        .where(
          and(
            eq(jobMaterials.jobId, data.jobId),
            eq(jobMaterials.organizationId, ctx.organizationId),
            sql`${jobMaterials.id} = ANY(${data.materialIds})`
          )
        );
    } else {
      // Reserve all materials for the job
      materials = await db
        .select({
          id: jobMaterials.id,
          productId: jobMaterials.productId,
          quantityRequired: jobMaterials.quantityRequired,
        })
        .from(jobMaterials)
        .where(
          and(
            eq(jobMaterials.jobId, data.jobId),
            eq(jobMaterials.organizationId, ctx.organizationId)
          )
        );
    }

    // TODO: Integrate with inventory domain to create actual reservations
    // For now, return the list of materials that would be reserved

    return {
      jobId: data.jobId,
      reservedCount: materials.length,
      materials: materials.map((m) => ({
        materialId: m.id,
        productId: m.productId,
        quantityToReserve: Number(m.quantityRequired),
      })),
      message: 'Inventory reservation is pending integration with inventory domain',
    };
  });

// ============================================================================
// CALCULATE JOB MATERIAL COST
// ============================================================================

/**
 * Calculate total material cost for a job.
 */
export const calculateJobMaterialCost = createServerFn({ method: 'GET' })
  .inputValidator(calculateJobMaterialCostSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.read ?? 'customer.read',
    });

    // Verify job access
    await verifyJobAccess(data.jobId, ctx.organizationId);

    // Get all materials for the job
    const materials = await db
      .select({
        quantityRequired: jobMaterials.quantityRequired,
        quantityUsed: jobMaterials.quantityUsed,
        unitCost: jobMaterials.unitCost,
      })
      .from(jobMaterials)
      .where(
        and(eq(jobMaterials.jobId, data.jobId), eq(jobMaterials.organizationId, ctx.organizationId))
      );

    // Calculate totals
    let totalQuantityRequired = 0;
    let totalQuantityUsed = 0;
    let estimatedCost = 0;
    let actualCost = 0;

    for (const m of materials) {
      const qtyRequired = Number(m.quantityRequired);
      const qtyUsed = Number(m.quantityUsed);
      const unitCost = Number(m.unitCost);

      totalQuantityRequired += qtyRequired;
      totalQuantityUsed += qtyUsed;
      estimatedCost += qtyRequired * unitCost;
      actualCost += qtyUsed * unitCost;
    }

    const summary: JobMaterialCostSummary = {
      jobId: data.jobId,
      totalMaterials: materials.length,
      totalQuantityRequired,
      totalQuantityUsed,
      estimatedCost: Number(estimatedCost.toFixed(2)),
      actualCost: Number(actualCost.toFixed(2)),
      variance: Number((estimatedCost - actualCost).toFixed(2)),
    };

    return summary;
  });

// ============================================================================
// GET JOB MATERIAL
// ============================================================================

/**
 * Get a single material entry by ID.
 */
export const getJobMaterial = createServerFn({ method: 'GET' })
  .inputValidator(getJobMaterialSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.read ?? 'customer.read',
    });

    // Verify material access
    await verifyMaterialAccess(data.materialId, ctx.organizationId);

    // Get material with product details
    const [material] = await db
      .select({
        id: jobMaterials.id,
        jobId: jobMaterials.jobId,
        productId: jobMaterials.productId,
        quantityRequired: jobMaterials.quantityRequired,
        quantityUsed: jobMaterials.quantityUsed,
        unitCost: jobMaterials.unitCost,
        notes: jobMaterials.notes,
        createdAt: jobMaterials.createdAt,
        updatedAt: jobMaterials.updatedAt,
        createdBy: jobMaterials.createdBy,
        updatedBy: jobMaterials.updatedBy,
        productSku: products.sku,
        productName: products.name,
        productDescription: products.description,
      })
      .from(jobMaterials)
      .leftJoin(products, eq(jobMaterials.productId, products.id))
      .where(eq(jobMaterials.id, data.materialId))
      .limit(1);

    const response: MaterialResponse = {
      id: material.id,
      jobId: material.jobId,
      productId: material.productId,
      quantityRequired: Number(material.quantityRequired),
      quantityUsed: Number(material.quantityUsed),
      unitCost: Number(material.unitCost),
      notes: material.notes,
      createdAt: material.createdAt,
      updatedAt: material.updatedAt,
      createdBy: material.createdBy,
      updatedBy: material.updatedBy,
      product: {
        id: material.productId,
        sku: material.productSku,
        name: material.productName ?? '',
        description: material.productDescription,
      },
    };

    return { material: response };
  });

// ============================================================================
// RECORD MATERIAL INSTALLATION
// ============================================================================

import { recordMaterialInstallationSchema } from '@/lib/schemas/jobs/job-materials';

/**
 * Record material installation with serial numbers, location, and photos.
 */
export const recordMaterialInstallation = createServerFn({ method: 'POST' })
  .inputValidator(recordMaterialInstallationSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.job?.update ?? 'customer.update',
    });
    const logger = createActivityLoggerWithContext(ctx);

    // Get existing material for change tracking
    const [existingMaterial] = await db
      .select()
      .from(jobMaterials)
      .where(eq(jobMaterials.id, data.materialId))
      .limit(1);

    if (!existingMaterial) {
      throw new NotFoundError('Material not found');
    }

    const before = existingMaterial;

    // Get product details for logging
    const [product] = await db
      .select({ name: products.name, sku: products.sku })
      .from(products)
      .where(eq(products.id, existingMaterial.productId))
      .limit(1);

    // Get customerId from job for activity logging
    const job = await verifyJobAccess(existingMaterial.jobId, ctx.organizationId);

    // Update the material with installation details
    const [material] = await db
      .update(jobMaterials)
      .set({
        quantityUsed: data.quantityUsed,
        notes: data.installedLocation
          ? `Installed at: ${data.installedLocation}${data.serialNumbers?.length ? ` | Serials: ${data.serialNumbers.join(', ')}` : ''}`
          : data.serialNumbers?.length
            ? `Serials: ${data.serialNumbers.join(', ')}`
            : null,
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
      })
      .where(eq(jobMaterials.id, data.materialId))
      .returning();

    // Log material installation
    const changes = computeChanges({
      before,
      after: material,
      excludeFields: JOB_MATERIAL_EXCLUDED_FIELDS as never[],
    });

    logger.logAsync({
      entityType: 'job_material',
      entityId: material.id,
      action: 'updated',
      description: `Recorded installation: ${product?.name ?? product?.sku ?? 'Unknown'} (qty: ${data.quantityUsed})`,
      changes,
      metadata: {
        customerId: job.customerId ?? undefined,
        materialId: material.id,
        jobAssignmentId: material.jobId,
        productId: material.productId,
        productName: product?.name ?? undefined,
        quantity: Number(data.quantityUsed),
        customFields: {
          installedLocation: data.installedLocation ?? null,
          serialNumbers: data.serialNumbers ?? null,
        },
      },
    });

    // TODO: Save serial numbers to a dedicated table if schema exists
    // TODO: Save photos to a dedicated table if schema exists

    const response: MaterialResponse = {
      id: material.id,
      jobId: material.jobId,
      productId: material.productId,
      quantityRequired: Number(material.quantityRequired),
      quantityUsed: Number(material.quantityUsed),
      unitCost: Number(material.unitCost),
      notes: material.notes,
      createdAt: material.createdAt,
      updatedAt: material.updatedAt,
      createdBy: material.createdBy,
      updatedBy: material.updatedBy,
      product: {
        id: material.productId,
        sku: product?.sku ?? '', // Now we have product details
        name: product?.name ?? '',
        description: null,
      },
    };

    return { material: response };
  });

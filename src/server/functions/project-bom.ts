/**
 * Project BOM Server Functions
 *
 * Server-side functions for project bill of materials.
 *
 * SPRINT-03: Real implementation for project BOM tab
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projectBom, projectBomItems, products } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { z } from 'zod';

/**
 * Get project BOM with items
 */
export const getProjectBom = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      projectId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });

    // Get the BOM header
    const [bom] = await db
      .select()
      .from(projectBom)
      .where(
        and(
          eq(projectBom.projectId, data.projectId),
          eq(projectBom.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!bom) {
      // Return empty BOM structure if none exists
      return {
        success: true,
        data: {
          bom: null,
          items: [],
        },
      };
    }

    // Get BOM items with product details
    const items = await db
      .select({
        item: projectBomItems,
        product: {
          id: products.id,
          name: products.name,
          sku: products.sku,
          basePrice: products.basePrice,
        },
      })
      .from(projectBomItems)
      .leftJoin(products, eq(projectBomItems.productId, products.id))
      .where(eq(projectBomItems.bomId, bom.id))
      .orderBy(projectBomItems.position);

    // Transform to flattened structure
    const itemsWithProduct = items.map(({ item, product }) => ({
      ...item,
      product: product || undefined,
    }));

    return {
      success: true,
      data: {
        bom,
        items: itemsWithProduct,
      },
    };
  });

/**
 * Create a project BOM (if not exists)
 */
export const createProjectBom = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      projectId: z.string().uuid(),
      title: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.create });

    // Check if BOM already exists
    const [existing] = await db
      .select({ id: projectBom.id })
      .from(projectBom)
      .where(
        and(
          eq(projectBom.projectId, data.projectId),
          eq(projectBom.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (existing) {
      throw new Error('BOM already exists for this project');
    }

    // Generate BOM number
    const bomNumber = `BOM-${Date.now().toString(36).toUpperCase()}`;

    const [bom] = await db
      .insert(projectBom)
      .values({
        organizationId: ctx.organizationId,
        projectId: data.projectId,
        bomNumber,
        title: data.title || 'Bill of Materials',
        status: 'draft',
        revision: 1,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    return {
      success: true,
      data: bom,
    };
  });

/**
 * Add item to BOM
 */
export const addBomItem = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      bomId: z.string().uuid(),
      productId: z.string().uuid(),
      quantity: z.number().positive(),
      unitCost: z.number().optional(),
      notes: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });

    // Get BOM to find projectId
    const [bom] = await db
      .select({ id: projectBom.id, projectId: projectBom.projectId })
      .from(projectBom)
      .where(eq(projectBom.id, data.bomId))
      .limit(1);

    if (!bom) {
      throw new Error('BOM not found');
    }

    // Get max position
    const [{ maxPosition }] = await db
      .select({ maxPosition: sql<number>`max(${projectBomItems.position})` })
      .from(projectBomItems)
      .where(eq(projectBomItems.bomId, data.bomId));

    const [item] = await db
      .insert(projectBomItems)
      .values({
        organizationId: ctx.organizationId,
        bomId: data.bomId,
        projectId: bom.projectId,
        productId: data.productId,
        quantityEstimated: data.quantity.toString(),
        unitCostEstimated: data.unitCost?.toString(),
        notes: data.notes,
        position: (maxPosition ?? -1) + 1,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    return {
      success: true,
      data: item,
    };
  });

/**
 * Update BOM item
 */
export const updateBomItem = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      itemId: z.string().uuid(),
      quantity: z.number().positive().optional(),
      unitCost: z.number().min(0).optional(),
      status: z.enum(['planned', 'ordered', 'received', 'allocated', 'installed']).optional(),
      notes: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });

    const [item] = await db
      .update(projectBomItems)
      .set({
        ...(data.quantity !== undefined && { quantityEstimated: data.quantity.toString() }),
        ...(data.unitCost !== undefined && { unitCostEstimated: data.unitCost.toString() }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
        updatedAt: new Date(),
        updatedBy: ctx.user.id,
      })
      .where(eq(projectBomItems.id, data.itemId))
      .returning();

    return {
      success: true,
      data: item,
    };
  });

/**
 * Remove item from BOM
 */
export const removeBomItem = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      itemId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    await withAuth({ permission: PERMISSIONS.job.update });

    await db
      .delete(projectBomItems)
      .where(eq(projectBomItems.id, data.itemId));

    return {
      success: true,
    };
  });

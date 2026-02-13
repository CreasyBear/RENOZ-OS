/**
 * Project BOM Server Functions
 *
 * Server-side functions for project bill of materials.
 *
 * SPRINT-03: Real implementation for project BOM tab
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, max, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projectBom, projectBomItems, products, projects, orderLineItems } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { z } from 'zod';
import type { BomItemWithProduct } from '@/lib/schemas/jobs/project-bom';

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

    // Get the BOM header (explicit columns)
    const [bom] = await db
      .select({
        id: projectBom.id,
        organizationId: projectBom.organizationId,
        projectId: projectBom.projectId,
        bomNumber: projectBom.bomNumber,
        revision: projectBom.revision,
        status: projectBom.status,
        title: projectBom.title,
        description: projectBom.description,
        estimatedMaterialCost: projectBom.estimatedMaterialCost,
        actualMaterialCost: projectBom.actualMaterialCost,
        metadata: projectBom.metadata,
        approvedBy: projectBom.approvedBy,
        approvedAt: projectBom.approvedAt,
        version: projectBom.version,
        createdAt: projectBom.createdAt,
        updatedAt: projectBom.updatedAt,
        createdBy: projectBom.createdBy,
        updatedBy: projectBom.updatedBy,
      })
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

    // Transform to flattened structure (matches BomItemWithProduct)
    const itemsWithProduct: BomItemWithProduct[] = items.map(({ item, product }) => ({
      ...item,
      product: product
        ? {
            id: product.id,
            name: product.name,
            sku: product.sku,
            basePrice: product.basePrice,
          }
        : undefined,
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
      .select({ maxPosition: max(projectBomItems.position) })
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

/**
 * Remove multiple BOM items (batch)
 */
export const removeBomItems = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      itemIds: z.array(z.string().uuid()).min(1),
    })
  )
  .handler(async ({ data }) => {
    await withAuth({ permission: PERMISSIONS.job.update });

    for (const itemId of data.itemIds) {
      await db
        .delete(projectBomItems)
        .where(eq(projectBomItems.id, itemId));
    }

    return {
      success: true,
      removed: data.itemIds.length,
    };
  });

const bomItemStatusSchema = z.enum([
  'planned',
  'ordered',
  'received',
  'allocated',
  'installed',
]);

/**
 * Update status for multiple BOM items
 */
export const updateBomItemsStatus = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      itemIds: z.array(z.string().uuid()).min(1),
      status: bomItemStatusSchema,
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });

    for (const itemId of data.itemIds) {
      await db
        .update(projectBomItems)
        .set({
          status: data.status,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(projectBomItems.id, itemId));
    }

    return {
      success: true,
      updated: data.itemIds.length,
    };
  });

/**
 * Import BOM items from CSV
 * CSV format: sku,quantity[,unitCost] (header row optional)
 * Matches products by SKU (case-insensitive)
 * Batch: single product lookup, single max position, single insert.
 */
export const importBomFromCsv = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      projectId: z.string().uuid(),
      csvContent: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });

    // Get or create BOM
    let [bom] = await db
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
      const bomNumber = `BOM-${Date.now().toString(36).toUpperCase()}`;
      [bom] = await db
        .insert(projectBom)
        .values({
          organizationId: ctx.organizationId,
          projectId: data.projectId,
          bomNumber,
          title: 'Bill of Materials',
          status: 'draft',
          revision: 1,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();
    }

    const lines = data.csvContent.split(/\r?\n/).filter((line) => line.trim());
    const results = { added: 0, skipped: 0, errors: [] as string[] };

    // Parse all rows, collect valid rows and unique SKUs
    interface ParsedRow {
      rowIndex: number;
      sku: string;
      skuLower: string;
      quantity: number;
      unitCost: number | undefined;
    }
    const parsedRows: ParsedRow[] = [];
    const skusLowerSet = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(',').map((p) => p.trim());
      if (parts.length < 2) {
        if (i === 0 && parts[0]?.toLowerCase() === 'sku') continue;
        results.errors.push(`Row ${i + 1}: Need sku,quantity[,unitCost]`);
        results.skipped++;
        continue;
      }
      const [skuRaw, qtyStr, unitCostStr] = parts;
      const sku = skuRaw ?? '';
      const quantity = parseFloat(qtyStr ?? '0');
      const unitCost = unitCostStr ? parseFloat(unitCostStr) : undefined;

      if (!sku || isNaN(quantity) || quantity <= 0) {
        results.errors.push(`Row ${i + 1}: Invalid sku or quantity`);
        results.skipped++;
        continue;
      }

      parsedRows.push({ rowIndex: i + 1, sku, skuLower: sku.toLowerCase(), quantity, unitCost });
      skusLowerSet.add(sku.toLowerCase());
    }

    if (parsedRows.length === 0) {
      return { success: true, ...results };
    }

    // Batch product lookup
    const skusLower = Array.from(skusLowerSet);
    const productRows = await db
      .select({ id: products.id, sku: products.sku })
      .from(products)
      .where(
        and(
          eq(products.organizationId, ctx.organizationId),
          sql`LOWER(${products.sku}) IN (${sql.join(skusLower.map((s) => sql`${s}`), sql`, `)})`
        )
      );

    const productMap = new Map<string, string>();
    for (const row of productRows) {
      if (row.sku) productMap.set(row.sku.toLowerCase(), row.id);
    }

    // Validate SKUs and collect errors for missing
    const validRows: ParsedRow[] = [];
    for (const row of parsedRows) {
      const productId = productMap.get(row.skuLower);
      if (!productId) {
        results.errors.push(`Row ${row.rowIndex}: Product not found for SKU "${row.sku}"`);
        results.skipped++;
        continue;
      }
      validRows.push(row);
    }

    if (validRows.length === 0) {
      return { success: true, ...results };
    }

    await db.transaction(async (tx) => {
      const [{ maxPosition }] = await tx
        .select({ maxPosition: max(projectBomItems.position) })
        .from(projectBomItems)
        .where(eq(projectBomItems.bomId, bom!.id));

      let basePosition = maxPosition ?? -1;
      const values = validRows.map((row) => {
        const productId = productMap.get(row.skuLower)!;
        basePosition += 1;
        return {
          organizationId: ctx.organizationId,
          bomId: bom!.id,
          projectId: data.projectId,
          productId,
          quantityEstimated: row.quantity.toString(),
          unitCostEstimated: row.unitCost?.toString(),
          position: basePosition,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        };
      });

      await tx.insert(projectBomItems).values(values);
      results.added = values.length;
    });

    return { success: true, ...results };
  });

/**
 * Import BOM items from linked project order
 * Batch: single max position, single insert.
 */
export const importBomFromOrder = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      projectId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.update });

    const [project] = await db
      .select({ orderId: projects.orderId })
      .from(projects)
      .where(
        and(
          eq(projects.id, data.projectId),
          eq(projects.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!project || !project.orderId) {
      throw new Error('Project has no linked order. Link an order to this project first.');
    }

    // Get or create BOM (reuse logic from importBomFromCsv)
    let [bom] = await db
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
      const bomNumber = `BOM-${Date.now().toString(36).toUpperCase()}`;
      [bom] = await db
        .insert(projectBom)
        .values({
          organizationId: ctx.organizationId,
          projectId: data.projectId,
          bomNumber,
          title: 'Bill of Materials',
          status: 'draft',
          revision: 1,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();
    }

    const results = { added: 0, skipped: 0, errors: [] as string[] };

    const lineItems = await db
      .select({
        id: orderLineItems.id,
        productId: orderLineItems.productId,
        quantity: orderLineItems.quantity,
        unitPrice: orderLineItems.unitPrice,
      })
      .from(orderLineItems)
      .where(
        and(
          eq(orderLineItems.orderId, project.orderId),
          eq(orderLineItems.organizationId, ctx.organizationId)
        )
      );

    const validLines: { productId: string; quantity: number; unitPrice: number | null }[] = [];
    for (const line of lineItems) {
      if (!line.productId) {
        results.errors.push(`Line item ${line.id}: No product linked`);
        results.skipped++;
        continue;
      }
      const quantity = Number(line.quantity) || 0;
      if (quantity <= 0) {
        results.errors.push(`Line item ${line.id}: Invalid quantity`);
        results.skipped++;
        continue;
      }
      validLines.push({
        productId: line.productId,
        quantity,
        unitPrice: line.unitPrice ? Number(line.unitPrice) : null,
      });
    }

    if (validLines.length === 0) {
      return { success: true, ...results };
    }

    await db.transaction(async (tx) => {
      const [{ maxPosition }] = await tx
        .select({ maxPosition: max(projectBomItems.position) })
        .from(projectBomItems)
        .where(eq(projectBomItems.bomId, bom!.id));

      let basePosition = maxPosition ?? -1;
      const values = validLines.map((line) => {
        basePosition += 1;
        return {
          organizationId: ctx.organizationId,
          bomId: bom!.id,
          projectId: data.projectId,
          productId: line.productId,
          quantityEstimated: line.quantity.toString(),
          unitCostEstimated: line.unitPrice != null ? line.unitPrice.toString() : undefined,
          position: basePosition,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        };
      });

      await tx.insert(projectBomItems).values(values);
      results.added = values.length;
    });

    return { success: true, ...results };
  });

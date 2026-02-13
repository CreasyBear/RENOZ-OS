/**
 * Quality Inspection Server Functions
 *
 * Server functions for managing quality inspections on inventory items.
 *
 * @see drizzle/schema/inventory/inventory.ts
 */

'use server';

import { createServerFn } from "@tanstack/react-start";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { qualityInspections } from "drizzle/schema";
import { withAuth } from "@/lib/server/protected";
import { PERMISSIONS } from "@/lib/auth/permissions";

// ============================================================================
// SCHEMAS
// ============================================================================

const listQualityInspectionsSchema = z.object({
  inventoryId: z.string().uuid(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
});

const createQualityInspectionSchema = z.object({
  inventoryId: z.string().uuid(),
  productId: z.string().uuid(),
  inspectionDate: z.string().datetime().optional(),
  inspectorName: z.string().min(1).max(255),
  result: z.enum(["pass", "fail", "conditional"]),
  notes: z.string().max(1000).optional(),
  defects: z.array(z.string()).optional(),
});

// ============================================================================
// SERVER FUNCTIONS
// ============================================================================

/**
 * List quality inspections for an inventory item
 */
export const listQualityInspections = createServerFn({ method: "GET" })
  .inputValidator(listQualityInspectionsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });

    const { inventoryId, page, pageSize } = data;
    const offset = (page - 1) * pageSize;

    const inspections = await db
      .select({
        id: qualityInspections.id,
        inventoryId: qualityInspections.inventoryId,
        productId: qualityInspections.productId,
        inspectionDate: qualityInspections.inspectionDate,
        inspectorName: qualityInspections.inspectorName,
        result: qualityInspections.result,
        notes: qualityInspections.notes,
        defects: qualityInspections.defects,
        createdAt: qualityInspections.createdAt,
      })
      .from(qualityInspections)
      .where(
        and(
          eq(qualityInspections.inventoryId, inventoryId),
          eq(qualityInspections.organizationId, ctx.organizationId)
        )
      )
      .orderBy(desc(qualityInspections.inspectionDate))
      .limit(pageSize)
      .offset(offset);

    return { inspections };
  });

/**
 * Create a new quality inspection
 */
export const createQualityInspection = createServerFn({ method: "POST" })
  .inputValidator(createQualityInspectionSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.manage });

    const [inspection] = await db
      .insert(qualityInspections)
      .values({
        organizationId: ctx.organizationId,
        inventoryId: data.inventoryId,
        productId: data.productId,
        inspectionDate: data.inspectionDate
          ? new Date(data.inspectionDate)
          : new Date(),
        inspectorName: data.inspectorName,
        result: data.result,
        notes: data.notes,
        defects: data.defects,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    return inspection;
  });

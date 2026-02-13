'use server'

/**
 * Packing Slip Generation Server Functions
 *
 * Server functions to trigger Packing Slip PDF generation via Trigger.dev.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/server/protected";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { orders, generatedDocuments } from "drizzle/schema";
import { client } from "@/trigger/client";
import { NotFoundError } from "@/lib/server/errors";

// ============================================================================
// SCHEMAS
// ============================================================================

const generatePackingSlipSchema = z.object({
  orderId: z.string().uuid(),
  /** Expected ship date */
  shipDate: z.string().datetime().optional(),
  /** Shipping method */
  shippingMethod: z.string().optional(),
  /** Carrier/shipping provider */
  carrier: z.string().optional(),
  /** Special packing instructions */
  specialInstructions: z.string().optional(),
  /** Number of packages */
  packageCount: z.number().int().min(1).optional(),
  /** Total weight in kg */
  totalWeight: z.number().positive().optional(),
  /** Show warehouse location column */
  showLocation: z.boolean().optional().default(false),
  regenerate: z.boolean().optional().default(false),
});

export type GeneratePackingSlipInput = z.infer<typeof generatePackingSlipSchema>;

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface GeneratePackingSlipDocumentPayload {
  orderId: string;
  orderNumber: string;
  organizationId: string;
  customerId: string;
  shipDate?: string;
  shippingMethod?: string;
  carrier?: string;
  specialInstructions?: string;
  packageCount?: number;
  totalWeight?: number;
  showLocation?: boolean;
  regenerate?: boolean;
  existingDocumentId?: string;
}

// ============================================================================
// GENERATE PACKING SLIP PDF
// ============================================================================

/**
 * Generate a Packing Slip PDF for an order
 *
 * Triggers a background job to generate the PDF.
 * The PDF URL will be available once generation completes.
 */
export const generatePackingSlipPdf = createServerFn({ method: "POST" })
  .inputValidator(generatePackingSlipSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.order.read });

    // Fetch order to validate ownership and get details
    const [order] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerId: orders.customerId,
        organizationId: orders.organizationId,
      })
      .from(orders)
      .where(
        and(
          eq(orders.id, data.orderId),
          eq(orders.organizationId, ctx.organizationId),
          sql`${orders.deletedAt} IS NULL`
        )
      )
      .limit(1);

    if (!order) {
      throw new NotFoundError("Order not found", "order");
    }

    // Send event to Trigger.dev
    const payload: GeneratePackingSlipDocumentPayload = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      organizationId: order.organizationId,
      customerId: order.customerId,
      shipDate: data.shipDate,
      shippingMethod: data.shippingMethod,
      carrier: data.carrier,
      specialInstructions: data.specialInstructions,
      packageCount: data.packageCount,
      totalWeight: data.totalWeight,
      showLocation: data.showLocation,
      regenerate: data.regenerate,
    };

    await client.sendEvent({
      name: "document.generate_packing_slip",
      payload,
    });

    return {
      success: true,
      orderId: order.id,
      message: "Packing Slip PDF generation started",
    };
  });

// ============================================================================
// GET PACKING SLIP STATUS
// ============================================================================

const getPackingSlipStatusSchema = z.object({
  orderId: z.string().uuid(),
});

/**
 * Get the status/URL of a generated packing slip
 *
 * Queries generated_documents by (organizationId, entityType='order', entityId=orderId, documentType='packing-slip').
 * No row = status "pending" (document not yet generated).
 */
export const getPackingSlipStatus = createServerFn({ method: "GET" })
  .inputValidator(getPackingSlipStatusSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.order.read });

    // Validate order ownership
    const [order] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
      })
      .from(orders)
      .where(
        and(
          eq(orders.id, data.orderId),
          eq(orders.organizationId, ctx.organizationId),
          sql`${orders.deletedAt} IS NULL`
        )
      )
      .limit(1);

    if (!order) {
      throw new NotFoundError("Order not found", "order");
    }

    const [doc] = await db
      .select({
        storageUrl: generatedDocuments.storageUrl,
        generatedAt: generatedDocuments.generatedAt,
      })
      .from(generatedDocuments)
      .where(
        and(
          eq(generatedDocuments.organizationId, ctx.organizationId),
          eq(generatedDocuments.entityType, "order"),
          eq(generatedDocuments.entityId, order.id),
          eq(generatedDocuments.documentType, "packing-slip")
        )
      )
      .limit(1);

    if (!doc) {
      return {
        orderId: order.id,
        documentType: "packing-slip" as const,
        status: "pending" as const,
        url: null,
      };
    }

    return {
      orderId: order.id,
      documentType: "packing-slip" as const,
      status: "completed" as const,
      url: doc.storageUrl,
    };
  });

/**
 * Pro Forma Invoice Generation Server Functions
 *
 * Server functions to trigger Pro Forma Invoice PDF generation via Trigger.dev.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/server/protected";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { orders } from "drizzle/schema";
import { client } from "@/trigger/client";
import { NotFoundError } from "@/lib/server/errors";

// ============================================================================
// SCHEMAS
// ============================================================================

const generateProFormaSchema = z.object({
  orderId: z.string().uuid(),
  /** Validity period in days (default 30) */
  validityDays: z.number().int().min(1).max(365).optional().default(30),
  /** Optional reference (e.g., customer PO number) */
  reference: z.string().optional(),
  /** Optional notes */
  notes: z.string().optional(),
  regenerate: z.boolean().optional().default(false),
});

export type GenerateProFormaInput = z.infer<typeof generateProFormaSchema>;

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface GenerateProFormaDocumentPayload {
  orderId: string;
  orderNumber: string;
  organizationId: string;
  customerId: string;
  validUntil: string;
  reference?: string;
  notes?: string;
  regenerate?: boolean;
  existingDocumentId?: string;
}

// ============================================================================
// GENERATE PRO FORMA PDF
// ============================================================================

/**
 * Generate a Pro Forma Invoice PDF for an order
 *
 * Triggers a background job to generate the PDF.
 * The PDF URL will be available once generation completes.
 */
export const generateProFormaPdf = createServerFn({ method: "POST" })
  .inputValidator(generateProFormaSchema)
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

    // Calculate validity date
    const validUntil = new Date(
      Date.now() + data.validityDays * 24 * 60 * 60 * 1000
    ).toISOString();

    // Send event to Trigger.dev
    const payload: GenerateProFormaDocumentPayload = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      organizationId: order.organizationId,
      customerId: order.customerId,
      validUntil,
      reference: data.reference,
      notes: data.notes,
      regenerate: data.regenerate,
    };

    await client.sendEvent({
      name: "document.generate_pro_forma",
      payload,
    });

    return {
      success: true,
      orderId: order.id,
      message: "Pro Forma Invoice PDF generation started",
    };
  });

// ============================================================================
// GET PRO FORMA STATUS
// ============================================================================

const getProFormaStatusSchema = z.object({
  orderId: z.string().uuid(),
});

/**
 * Get the status/URL of a generated pro forma invoice
 */
export const getProFormaStatus = createServerFn({ method: "GET" })
  .inputValidator(getProFormaStatusSchema)
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

    // TODO: Once we have generated_documents table, query it here
    return {
      orderId: order.id,
      documentType: "pro-forma" as const,
      status: "pending", // TODO: Return actual status once migration is done
      url: null, // TODO: Return actual URL once migration is done
    };
  });

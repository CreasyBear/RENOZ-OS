'use server'

/**
 * Document Generation Server Functions
 *
 * Server functions to trigger PDF document generation via Trigger.dev.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/server/protected";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { orders } from "drizzle/schema";
import {
  client,
  documentEvents,
  type GenerateQuoteDocumentPayload,
  type GenerateInvoiceDocumentPayload,
} from "@/trigger/client";
import { NotFoundError } from "@/lib/server/errors";

// ============================================================================
// SCHEMAS
// ============================================================================

const generateQuoteSchema = z.object({
  orderId: z.string().uuid(),
  regenerate: z.boolean().optional().default(false),
});

const generateInvoiceSchema = z.object({
  orderId: z.string().uuid(),
  dueDate: z.string().datetime().optional(),
  regenerate: z.boolean().optional().default(false),
});

// ============================================================================
// GENERATE QUOTE PDF
// ============================================================================

/**
 * Generate a Quote PDF for an order
 *
 * Triggers a background job to generate the PDF.
 * The PDF URL will be stored on the order record.
 */
export const generateQuotePdf = createServerFn({ method: "POST" })
  .inputValidator(generateQuoteSchema)
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
    const payload: GenerateQuoteDocumentPayload = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      organizationId: order.organizationId,
      customerId: order.customerId,
      regenerate: data.regenerate,
    };

    await client.sendEvent({
      name: documentEvents.generateQuote,
      payload,
    });

    return {
      success: true,
      orderId: order.id,
      message: "Quote PDF generation started",
    };
  });

// ============================================================================
// GENERATE INVOICE PDF
// ============================================================================

/**
 * Generate an Invoice PDF for an order
 *
 * Triggers a background job to generate the PDF.
 * The PDF URL will be stored on the order record.
 */
export const generateInvoicePdf = createServerFn({ method: "POST" })
  .inputValidator(generateInvoiceSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.order.read });

    // Fetch order to validate ownership and get details
    const [order] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerId: orders.customerId,
        organizationId: orders.organizationId,
        dueDate: orders.dueDate,
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

    // Use provided due date, order due date, or calculate from current date
    const dueDate =
      data.dueDate ||
      (order.dueDate ? new Date(order.dueDate).toISOString() : undefined) ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now

    // Send event to Trigger.dev
    const payload: GenerateInvoiceDocumentPayload = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      organizationId: order.organizationId,
      customerId: order.customerId,
      dueDate,
      regenerate: data.regenerate,
    };

    await client.sendEvent({
      name: documentEvents.generateInvoice,
      payload,
    });

    return {
      success: true,
      orderId: order.id,
      message: "Invoice PDF generation started",
    };
  });

// ============================================================================
// GET DOCUMENT STATUS
// ============================================================================

const getDocumentStatusSchema = z.object({
  orderId: z.string().uuid(),
  documentType: z.enum(["quote", "invoice"]),
});

/**
 * Get the status/URL of a generated document
 */
export const getDocumentStatus = createServerFn({ method: "GET" })
  .inputValidator(getDocumentStatusSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.order.read });

    // TODO: Once we have generated_documents table, query it here
    // For now, check if PDF URL exists on the order
    const [order] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        // quotePdfUrl: orders.quotePdfUrl, // TODO: Add after migration
        // invoicePdfUrl: orders.invoicePdfUrl, // TODO: Add after migration
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

    return {
      orderId: order.id,
      documentType: data.documentType,
      status: "pending", // TODO: Return actual status once migration is done
      url: null, // TODO: Return actual URL once migration is done
    };
  });

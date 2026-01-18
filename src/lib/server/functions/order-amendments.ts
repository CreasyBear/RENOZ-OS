/**
 * Order Amendments Server Functions
 *
 * Amendment workflow: request -> approve/reject -> apply changes.
 *
 * @see drizzle/schema/order-amendments.ts for database schema
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-AMENDMENTS-API)
 */

import { createServerFn } from "@tanstack/react-start";
import { eq, and, desc, asc, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  orderAmendments,
  orders,
  orderLineItems,
  products,
} from "drizzle/schema";
import { withAuth } from "../protected";
import { ValidationError, NotFoundError, ConflictError } from "../errors";
import {
  requestAmendmentSchema,
  approveAmendmentSchema,
  rejectAmendmentSchema,
  applyAmendmentSchema,
  cancelAmendmentSchema,
  amendmentParamsSchema,
  amendmentListQuerySchema,
  type ItemChange,
} from "@/lib/schemas/order-amendments";

// ============================================================================
// TYPES
// ============================================================================

type OrderAmendment = typeof orderAmendments.$inferSelect;

interface ListAmendmentsResult {
  amendments: OrderAmendment[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const GST_RATE = 0.1; // Australian GST 10%

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calculate line item totals including tax.
 */
function calculateLineItemTotals(lineItem: {
  quantity: number;
  unitPrice: number;
  discountPercent?: number | null;
  discountAmount?: number | null;
  taxType?: string;
}): { taxAmount: number; lineTotal: number } {
  const subtotal = lineItem.quantity * lineItem.unitPrice;

  // Apply discount
  let discountedAmount = subtotal;
  if (lineItem.discountPercent) {
    discountedAmount -= subtotal * (lineItem.discountPercent / 100);
  }
  if (lineItem.discountAmount) {
    discountedAmount -= lineItem.discountAmount;
  }
  discountedAmount = Math.max(0, discountedAmount);

  // Calculate tax
  const taxAmount =
    lineItem.taxType === "exempt" ? 0 : discountedAmount * GST_RATE;

  // Round to 2 decimal places
  const lineTotal = Math.round((discountedAmount + taxAmount) * 100) / 100;

  return {
    taxAmount: Math.round(taxAmount * 100) / 100,
    lineTotal,
  };
}

/**
 * Recalculate order totals from line items.
 */
async function recalculateOrderTotals(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  orderId: string,
  organizationId: string
): Promise<{
  subtotal: number;
  taxAmount: number;
  total: number;
}> {
  const lineItems = await tx
    .select({
      lineTotal: orderLineItems.lineTotal,
      taxAmount: orderLineItems.taxAmount,
    })
    .from(orderLineItems)
    .where(
      and(
        eq(orderLineItems.orderId, orderId),
        eq(orderLineItems.organizationId, organizationId)
      )
    );

  const lineSubtotal = lineItems.reduce(
    (sum, item) => sum + (item.lineTotal ?? 0),
    0
  );
  const lineTaxTotal = lineItems.reduce(
    (sum, item) => sum + (item.taxAmount ?? 0),
    0
  );

  // The subtotal is line totals minus their tax
  const subtotal = lineSubtotal - lineTaxTotal;
  const taxAmount = lineTaxTotal;
  const total = lineSubtotal;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

// ============================================================================
// LIST AMENDMENTS
// ============================================================================

export const listAmendments = createServerFn({ method: "GET" })
  .inputValidator(amendmentListQuerySchema)
  .handler(async ({ data }): Promise<ListAmendmentsResult> => {
    const ctx = await withAuth();
    const {
      orderId,
      status,
      amendmentType,
      requestedBy,
      page,
      pageSize,
      sortBy,
      sortOrder,
    } = data;

    // Build conditions
    const conditions = [
      eq(orderAmendments.organizationId, ctx.organizationId),
      isNull(orderAmendments.deletedAt),
    ];

    if (orderId) {
      conditions.push(eq(orderAmendments.orderId, orderId));
    }
    if (status) {
      conditions.push(eq(orderAmendments.status, status));
    }
    if (amendmentType) {
      conditions.push(eq(orderAmendments.amendmentType, amendmentType));
    }
    if (requestedBy) {
      conditions.push(eq(orderAmendments.requestedBy, requestedBy));
    }

    // FIX #2: Use proper count query instead of selecting ID
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orderAmendments)
      .where(and(...conditions));

    const total = countResult?.count ?? 0;

    // Sort
    const sortColumn = {
      requestedAt: orderAmendments.requestedAt,
      reviewedAt: orderAmendments.reviewedAt,
      appliedAt: orderAmendments.appliedAt,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    // Fetch amendments
    const amendments = await db
      .select()
      .from(orderAmendments)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      amendments,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  });

// ============================================================================
// GET AMENDMENT
// ============================================================================

export const getAmendment = createServerFn({ method: "GET" })
  .inputValidator(amendmentParamsSchema)
  .handler(async ({ data }): Promise<OrderAmendment> => {
    const ctx = await withAuth();

    const [amendment] = await db
      .select()
      .from(orderAmendments)
      .where(
        and(
          eq(orderAmendments.id, data.id),
          eq(orderAmendments.organizationId, ctx.organizationId),
          isNull(orderAmendments.deletedAt)
        )
      )
      .limit(1);

    if (!amendment) {
      throw new NotFoundError("Amendment not found");
    }

    return amendment;
  });

// ============================================================================
// REQUEST AMENDMENT
// ============================================================================

export const requestAmendment = createServerFn({ method: "POST" })
  .inputValidator(requestAmendmentSchema)
  .handler(async ({ data }): Promise<OrderAmendment> => {
    const ctx = await withAuth();

    // Verify order exists and belongs to org
    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, data.orderId),
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt)
        )
      )
      .limit(1);

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    // Cannot amend cancelled or delivered orders
    if (order.status === "cancelled" || order.status === "delivered") {
      throw new ValidationError("Cannot amend completed order", {
        status: [`Order is ${order.status}`],
      });
    }

    // Create amendment
    const [amendment] = await db
      .insert(orderAmendments)
      .values({
        organizationId: ctx.organizationId,
        orderId: data.orderId,
        amendmentType: data.amendmentType,
        reason: data.reason,
        changes: data.changes,
        status: "pending",
        requestedBy: ctx.user.id,
        orderVersionBefore: order.version ?? 1,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    return amendment;
  });

// ============================================================================
// APPROVE AMENDMENT
// ============================================================================

export const approveAmendment = createServerFn({ method: "POST" })
  .inputValidator(approveAmendmentSchema)
  .handler(async ({ data }): Promise<OrderAmendment> => {
    const ctx = await withAuth();

    // Verify amendment exists and is pending
    const [existing] = await db
      .select()
      .from(orderAmendments)
      .where(
        and(
          eq(orderAmendments.id, data.amendmentId),
          eq(orderAmendments.organizationId, ctx.organizationId),
          isNull(orderAmendments.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Amendment not found");
    }

    if (existing.status !== "pending") {
      throw new ValidationError("Amendment is not pending", {
        status: [`Current status is ${existing.status}`],
      });
    }

    // Update amendment
    const [amendment] = await db
      .update(orderAmendments)
      .set({
        status: "approved",
        reviewedAt: new Date(),
        reviewedBy: ctx.user.id,
        approvalNotes: data.notes,
        updatedBy: ctx.user.id,
      })
      .where(eq(orderAmendments.id, data.amendmentId))
      .returning();

    return amendment;
  });

// ============================================================================
// REJECT AMENDMENT
// ============================================================================

export const rejectAmendment = createServerFn({ method: "POST" })
  .inputValidator(rejectAmendmentSchema)
  .handler(async ({ data }): Promise<OrderAmendment> => {
    const ctx = await withAuth();

    // Verify amendment exists and is pending
    const [existing] = await db
      .select()
      .from(orderAmendments)
      .where(
        and(
          eq(orderAmendments.id, data.amendmentId),
          eq(orderAmendments.organizationId, ctx.organizationId),
          isNull(orderAmendments.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Amendment not found");
    }

    if (existing.status !== "pending") {
      throw new ValidationError("Amendment is not pending", {
        status: [`Current status is ${existing.status}`],
      });
    }

    // Update amendment
    const [amendment] = await db
      .update(orderAmendments)
      .set({
        status: "rejected",
        reviewedAt: new Date(),
        reviewedBy: ctx.user.id,
        approvalNotes: { note: data.reason },
        updatedBy: ctx.user.id,
      })
      .where(eq(orderAmendments.id, data.amendmentId))
      .returning();

    return amendment;
  });

// ============================================================================
// APPLY AMENDMENT
// ============================================================================

export const applyAmendment = createServerFn({ method: "POST" })
  .inputValidator(applyAmendmentSchema)
  .handler(async ({ data }): Promise<OrderAmendment> => {
    const ctx = await withAuth();

    // Verify amendment exists and is approved
    const [existing] = await db
      .select()
      .from(orderAmendments)
      .where(
        and(
          eq(orderAmendments.id, data.amendmentId),
          eq(orderAmendments.organizationId, ctx.organizationId),
          isNull(orderAmendments.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Amendment not found");
    }

    if (existing.status !== "approved") {
      throw new ValidationError("Amendment must be approved before applying", {
        status: [`Current status is ${existing.status}`],
      });
    }

    // Get order for version check
    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, existing.orderId),
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt)
        )
      )
      .limit(1);

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    // Check version unless force apply
    if (!data.forceApply && order.version !== existing.orderVersionBefore) {
      throw new ConflictError(
        "Order has been modified since amendment was created"
      );
    }

    // FIX #4: Wrap entire apply operation in transaction
    const amendment = await db.transaction(async (tx) => {
      // Apply item changes
      const changes = existing.changes as { itemChanges?: ItemChange[] };
      if (changes.itemChanges) {
        for (const itemChange of changes.itemChanges) {
          if (itemChange.action === "add" && itemChange.productId) {
            // Add new line item
            const [product] = await tx
              .select()
              .from(products)
              .where(eq(products.id, itemChange.productId))
              .limit(1);

            if (!product) continue;

            // Get next line number
            const [maxLine] = await tx
              .select({ max: sql<number>`COALESCE(MAX(${orderLineItems.lineNumber}), 0)` })
              .from(orderLineItems)
              .where(
                and(
                  eq(orderLineItems.orderId, order.id),
                  eq(orderLineItems.organizationId, ctx.organizationId)
                )
              );

            const lineNumber = (maxLine?.max ?? 0) + 1;
            const quantity = itemChange.after?.quantity ?? 1;
            const unitPrice = itemChange.after?.unitPrice ?? (product.basePrice ?? 0);
            const { taxAmount, lineTotal } = calculateLineItemTotals({
              quantity,
              unitPrice,
              discountPercent: itemChange.after?.discountPercent,
              discountAmount: itemChange.after?.discountAmount,
            });

            await tx.insert(orderLineItems).values({
              organizationId: ctx.organizationId,
              orderId: order.id,
              productId: itemChange.productId,
              lineNumber: String(lineNumber),
              sku: product.sku,
              description: itemChange.after?.description ?? product.name,
              quantity,
              unitPrice,
              discountPercent: itemChange.after?.discountPercent,
              discountAmount: itemChange.after?.discountAmount,
              taxType: "gst",
              taxAmount,
              lineTotal,
            });
          } else if (
            itemChange.action === "modify" &&
            itemChange.orderLineItemId
          ) {
            // FIX #3: Add orderId check to prevent IDOR
            const quantity = itemChange.after?.quantity ?? 1;
            const unitPrice = itemChange.after?.unitPrice ?? 0;
            const { taxAmount, lineTotal } = calculateLineItemTotals({
              quantity,
              unitPrice,
              discountPercent: itemChange.after?.discountPercent,
              discountAmount: itemChange.after?.discountAmount,
            });

            await tx
              .update(orderLineItems)
              .set({
                quantity,
                unitPrice,
                discountPercent: itemChange.after?.discountPercent,
                discountAmount: itemChange.after?.discountAmount,
                description: itemChange.after?.description,
                taxAmount,
                lineTotal,
              })
              .where(
                and(
                  eq(orderLineItems.id, itemChange.orderLineItemId),
                  eq(orderLineItems.organizationId, ctx.organizationId),
                  eq(orderLineItems.orderId, order.id) // IDOR fix
                )
              );
          } else if (
            itemChange.action === "remove" &&
            itemChange.orderLineItemId
          ) {
            // FIX #3: Add orderId check to prevent IDOR
            await tx
              .delete(orderLineItems)
              .where(
                and(
                  eq(orderLineItems.id, itemChange.orderLineItemId),
                  eq(orderLineItems.organizationId, ctx.organizationId),
                  eq(orderLineItems.orderId, order.id) // IDOR fix
                )
              );
          }
        }
      }

      // Recalculate order totals
      const totals = await recalculateOrderTotals(
        tx,
        order.id,
        ctx.organizationId
      );

      // Update order with new totals and increment version
      await tx
        .update(orders)
        .set({
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          total: totals.total,
          balanceDue: totals.total - (order.paidAmount ?? 0),
          version: (order.version ?? 1) + 1,
          updatedBy: ctx.user.id,
        })
        .where(eq(orders.id, order.id));

      // Update amendment status
      const [updatedAmendment] = await tx
        .update(orderAmendments)
        .set({
          status: "applied",
          appliedAt: new Date(),
          appliedBy: ctx.user.id,
          orderVersionAfter: (order.version ?? 1) + 1,
          updatedBy: ctx.user.id,
        })
        .where(eq(orderAmendments.id, data.amendmentId))
        .returning();

      return updatedAmendment;
    });

    return amendment;
  });

// ============================================================================
// CANCEL AMENDMENT
// ============================================================================

export const cancelAmendment = createServerFn({ method: "POST" })
  .inputValidator(cancelAmendmentSchema)
  .handler(async ({ data }): Promise<OrderAmendment> => {
    const ctx = await withAuth();

    // Verify amendment exists and is pending or approved
    const [existing] = await db
      .select()
      .from(orderAmendments)
      .where(
        and(
          eq(orderAmendments.id, data.amendmentId),
          eq(orderAmendments.organizationId, ctx.organizationId),
          isNull(orderAmendments.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Amendment not found");
    }

    if (!["pending", "approved"].includes(existing.status)) {
      throw new ValidationError("Amendment cannot be cancelled", {
        status: [`Current status is ${existing.status}`],
      });
    }

    // Update amendment
    const [amendment] = await db
      .update(orderAmendments)
      .set({
        status: "cancelled",
        approvalNotes: data.reason
          ? { note: data.reason }
          : existing.approvalNotes,
        updatedBy: ctx.user.id,
      })
      .where(eq(orderAmendments.id, data.amendmentId))
      .returning();

    return amendment;
  });

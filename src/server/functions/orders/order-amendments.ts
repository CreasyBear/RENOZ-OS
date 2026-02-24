/**
 * Order Amendments Server Functions
 *
 * Amendment workflow: request -> approve/reject -> apply changes.
 *
 * @see drizzle/schema/order-amendments.ts for database schema
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-AMENDMENTS-API)
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, desc, asc, isNull, sql, inArray } from 'drizzle-orm';
import { decodeCursor, buildCursorCondition, buildStandardCursorResponse } from '@/lib/db/pagination';
import { db } from '@/lib/db';
import { orderAmendments, orders, orderLineItems, products } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { ValidationError, NotFoundError, ConflictError } from '@/lib/server/errors';
import {
  requestAmendmentSchema,
  approveAmendmentSchema,
  rejectAmendmentSchema,
  applyAmendmentSchema,
  cancelAmendmentSchema,
  amendmentParamsSchema,
  amendmentListQuerySchema,
  amendmentListCursorQuerySchema,
  type ItemChange,
} from '@/lib/schemas';
import { calculateLineItemTotals, calculateOrderTotals } from '@/server/functions/orders/orders';

interface ListAmendmentsResult {
  amendments: (typeof orderAmendments.$inferSelect)[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Recalculate order totals from line items with optional shipping and discount overrides.
 * Used when applying shipping_change or discount_change amendments.
 */
async function recalculateOrderTotalsForAmendment(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  orderId: string,
  organizationId: string,
  opts: {
    shippingAmount: number;
    discountPercent?: number | null;
    discountAmount?: number | null;
  }
): Promise<{
  subtotal: number;
  discountAmount: number;
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
      and(eq(orderLineItems.orderId, orderId), eq(orderLineItems.organizationId, organizationId))
    );

  const lineItemTotals = lineItems.map((item) => ({
    lineTotal: Number(item.lineTotal ?? 0),
    taxAmount: Number(item.taxAmount ?? 0),
  }));

  return calculateOrderTotals(
    lineItemTotals,
    opts.discountPercent ?? null,
    opts.discountAmount ?? null,
    opts.shippingAmount
  );
}

// ============================================================================
// LIST AMENDMENTS
// ============================================================================

export const listAmendments = createServerFn({ method: 'GET' })
  .inputValidator(amendmentListQuerySchema)
  .handler(async ({ data }): Promise<ListAmendmentsResult> => {
    const ctx = await withAuth();
    const { orderId, status, amendmentType, requestedBy, page, pageSize, sortBy, sortOrder } = data;

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

    const orderFn = sortOrder === 'asc' ? asc : desc;

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

/**
 * List amendments with cursor pagination (recommended for large datasets).
 */
export const listAmendmentsCursor = createServerFn({ method: 'GET' })
  .inputValidator(amendmentListCursorQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const { cursor, pageSize = 20, sortOrder = 'desc', orderId, status, amendmentType, requestedBy } = data;

    const conditions = [
      eq(orderAmendments.organizationId, ctx.organizationId),
      isNull(orderAmendments.deletedAt),
    ];
    if (orderId) conditions.push(eq(orderAmendments.orderId, orderId));
    if (status) conditions.push(eq(orderAmendments.status, status));
    if (amendmentType) conditions.push(eq(orderAmendments.amendmentType, amendmentType));
    if (requestedBy) conditions.push(eq(orderAmendments.requestedBy, requestedBy));

    if (cursor) {
      const cursorPosition = decodeCursor(cursor);
      if (cursorPosition) {
        conditions.push(
          buildCursorCondition(orderAmendments.createdAt, orderAmendments.id, cursorPosition, sortOrder)
        );
      }
    }

    const orderDir = sortOrder === 'asc' ? asc : desc;

    const amendments = await db
      .select()
      .from(orderAmendments)
      .where(and(...conditions))
      .orderBy(orderDir(orderAmendments.createdAt), orderDir(orderAmendments.id))
      .limit(pageSize + 1);

    return buildStandardCursorResponse(amendments, pageSize);
  });

// ============================================================================
// GET AMENDMENT
// ============================================================================

export const getAmendment = createServerFn({ method: 'GET' })
  .inputValidator(amendmentParamsSchema)
  .handler(async ({ data }) => {
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
      throw new NotFoundError('Amendment not found');
    }

    return amendment;
  });

// ============================================================================
// REQUEST AMENDMENT
// ============================================================================

export const requestAmendment = createServerFn({ method: 'POST' })
  .inputValidator(requestAmendmentSchema)
  .handler(async ({ data }) => {
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
      throw new NotFoundError('Order not found');
    }

    // Cannot amend cancelled orders
    if (order.status === 'cancelled') {
      throw new ValidationError('Cannot amend cancelled order', {
        status: ['Order is cancelled'],
      });
    }

    // Cannot amend delivered orders that are fully paid
    const isDelivered = order.status === 'delivered';
    const isPaid = order.paymentStatus === 'paid' || Number(order.balanceDue) <= 0;
    if (isDelivered && isPaid) {
      throw new ValidationError('Cannot amend completed and paid order', {
        status: ['Order is delivered and fully paid'],
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
        status: 'requested',
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

export const approveAmendment = createServerFn({ method: 'POST' })
  .inputValidator(approveAmendmentSchema)
  .handler(async ({ data }) => {
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
      throw new NotFoundError('Amendment not found');
    }

    if (existing.status !== 'requested') {
      throw new ValidationError('Amendment is not pending', {
        status: [`Current status is ${existing.status}`],
      });
    }

    // Update amendment
    const [amendment] = await db
      .update(orderAmendments)
      .set({
        status: 'approved',
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

export const rejectAmendment = createServerFn({ method: 'POST' })
  .inputValidator(rejectAmendmentSchema)
  .handler(async ({ data }) => {
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
      throw new NotFoundError('Amendment not found');
    }

    if (existing.status !== 'requested') {
      throw new ValidationError('Amendment is not pending', {
        status: [`Current status is ${existing.status}`],
      });
    }

    // Update amendment
    const [amendment] = await db
      .update(orderAmendments)
      .set({
        status: 'rejected',
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

export const applyAmendment = createServerFn({ method: 'POST' })
  .inputValidator(applyAmendmentSchema)
  .handler(async ({ data }) => {
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
      throw new NotFoundError('Amendment not found');
    }

    if (existing.status !== 'approved') {
      throw new ValidationError('Amendment must be approved before applying', {
        status: [`Current status is ${existing.status}`],
      });
    }

    // FIX #4: Wrap entire apply operation in transaction
    // Version check moved inside transaction with row lock to prevent race conditions
    const amendment = await db.transaction(async (tx) => {
      // Set RLS context (matches pattern used by orders.ts, order-picking.ts, order-shipments.ts)
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      // Re-fetch order with row lock for version check
      const [order] = await tx
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.id, existing.orderId),
            eq(orders.organizationId, ctx.organizationId),
            isNull(orders.deletedAt)
          )
        )
        .limit(1)
        .for('update');

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      // Check version unless force apply (inside transaction with row lock)
      if (!data.forceApply && order.version !== existing.orderVersionBefore) {
        throw new ConflictError('Order has been modified since amendment was created');
      }
      // Apply item changes
      const changes = existing.changes as { itemChanges?: ItemChange[]; shippingAmount?: number };
      if (changes.itemChanges) {
        // Batch fetch all products needed for 'add' actions upfront
        const addProductIds = changes.itemChanges
          .filter((ic) => ic.action === 'add' && ic.productId)
          .map((ic) => ic.productId!);
        const productMap = new Map<string, typeof products.$inferSelect>();
        if (addProductIds.length > 0) {
          const fetchedProducts = await tx
            .select()
            .from(products)
            .where(and(
              inArray(products.id, addProductIds),
              eq(products.organizationId, ctx.organizationId),
              isNull(products.deletedAt)
            ));
          for (const p of fetchedProducts) {
            productMap.set(p.id, p);
          }
        }

        // Get max line number once before the loop (lineNumber is text, e.g. "1", "2", "001")
        const [maxLine] = await tx
          .select({ max: sql<string>`MAX(${orderLineItems.lineNumber})` })
          .from(orderLineItems)
          .where(
            and(
              eq(orderLineItems.orderId, order.id),
              eq(orderLineItems.organizationId, ctx.organizationId)
            )
          );
        let lineNumber = (parseInt(maxLine?.max ?? '0', 10) || 0);

        for (const itemChange of changes.itemChanges) {
          if (itemChange.action === 'add' && itemChange.productId) {
            // Add new line item
            const product = productMap.get(itemChange.productId);

            if (!product) continue;

            lineNumber += 1;
            const quantity = itemChange.after?.quantity ?? 1;
            const unitPrice = itemChange.after?.unitPrice ?? product.basePrice ?? 0;
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
              taxType: 'gst',
              taxAmount,
              lineTotal,
            });
          } else if (itemChange.action === 'modify' && itemChange.orderLineItemId) {
            // FIX #3: Add orderId check to prevent IDOR
            const quantity = itemChange.after?.quantity ?? 1;
            const unitPrice = itemChange.after?.unitPrice ?? 0;

            // Guard: block when reducing quantity below qtyPicked — user must unpick first
            const [existingLine] = await tx
              .select({ qtyPicked: orderLineItems.qtyPicked, description: orderLineItems.description })
              .from(orderLineItems)
              .where(
                and(
                  eq(orderLineItems.id, itemChange.orderLineItemId),
                  eq(orderLineItems.organizationId, ctx.organizationId),
                  eq(orderLineItems.orderId, order.id)
                )
              )
              .limit(1);
            if (existingLine) {
              const qtyPicked = Number(existingLine.qtyPicked) || 0;
              if (qtyPicked > quantity) {
                throw new ValidationError('Unpick excess items first', {
                  quantity: [
                    `Line has ${qtyPicked} picked, new quantity is ${quantity}. Unpick excess items before applying amendment.`,
                  ],
                });
              }
            }

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
          } else if (itemChange.action === 'remove' && itemChange.orderLineItemId) {
            // FIX #3: Add orderId check to prevent IDOR
            await tx.delete(orderLineItems).where(
              and(
                eq(orderLineItems.id, itemChange.orderLineItemId),
                eq(orderLineItems.organizationId, ctx.organizationId),
                eq(orderLineItems.orderId, order.id) // IDOR fix
              )
            );
          }
        }
      }

      // Apply shipping amount change if this is a shipping_change amendment
      let newShippingAmount = Number(order.shippingAmount ?? 0);
      if (existing.amendmentType === 'shipping_change' && changes.shippingAmount !== undefined) {
        newShippingAmount = changes.shippingAmount;
      }

      // Apply discount change if this is a discount_change amendment
      let newDiscountPercent = order.discountPercent;
      let newDiscountAmount = order.discountAmount;
      if (existing.amendmentType === 'discount_change') {
        const changesWithDiscount = changes as {
          discountPercent?: number;
          discountAmount?: number;
        };
        if (changesWithDiscount.discountPercent !== undefined) {
          newDiscountPercent = changesWithDiscount.discountPercent;
        }
        if (changesWithDiscount.discountAmount !== undefined) {
          newDiscountAmount = changesWithDiscount.discountAmount;
        }
      }

      // Recalculate order totals with shipping and discount
      const totals = await recalculateOrderTotalsForAmendment(
        tx,
        order.id,
        ctx.organizationId,
        {
          shippingAmount: newShippingAmount,
          discountPercent: newDiscountPercent ?? null,
          discountAmount: newDiscountAmount ?? null,
        }
      );

      // Update order with new totals, shipping, discount, and increment version
      await tx
        .update(orders)
        .set({
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          total: totals.total,
          balanceDue: totals.total - Number(order.paidAmount ?? 0),
          ...(existing.amendmentType === 'shipping_change' && { shippingAmount: newShippingAmount }),
          ...(existing.amendmentType === 'discount_change' && {
            discountPercent: newDiscountPercent,
            discountAmount: newDiscountAmount,
          }),
          version: (order.version ?? 1) + 1,
          updatedBy: ctx.user.id,
        })
        .where(eq(orders.id, order.id));

      // Update amendment status
      const [updatedAmendment] = await tx
        .update(orderAmendments)
        .set({
          status: 'applied',
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

export const cancelAmendment = createServerFn({ method: 'POST' })
  .inputValidator(cancelAmendmentSchema)
  .handler(async ({ data }) => {
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
      throw new NotFoundError('Amendment not found');
    }

    if (!['requested', 'approved'].includes(existing.status)) {
      throw new ValidationError('Amendment cannot be cancelled', {
        status: [`Current status is ${existing.status}`],
      });
    }

    // Update amendment
    const [amendment] = await db
      .update(orderAmendments)
      .set({
        status: 'cancelled',
        approvalNotes: data.reason ? { note: data.reason } : existing.approvalNotes,
        updatedBy: ctx.user.id,
      })
      .where(eq(orderAmendments.id, data.amendmentId))
      .returning();

    return amendment;
  });

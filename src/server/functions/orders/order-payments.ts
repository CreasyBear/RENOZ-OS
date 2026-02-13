/**
 * Order Payment Server Functions
 *
 * Server-side functions for managing order payments.
 * Uses createServerFn pattern per project standards.
 *
 * @see src/lib/schemas/orders/order-payments.ts for validation schemas
 */

import { createServerFn } from "@tanstack/react-start";
import { eq, and, desc, sql, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { orderPayments, orders } from "drizzle/schema";
import {
  insertOrderPaymentSchema,
  updateOrderPaymentSchema,
  deleteOrderPaymentSchema,
} from "@/lib/schemas/orders/order-payments";
import { withAuth } from "@/lib/server/protected";
import { NotFoundError, ValidationError } from "@/lib/server/errors";

// ============================================================================
// HELPERS
// ============================================================================

async function updateOrderPaymentStatus(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  orderId: string,
  organizationId: string,
  userId: string
) {
  const [summary] = await tx
    .select({
      netAmount: sql<number>`COALESCE(SUM(CASE WHEN ${orderPayments.isRefund} = true THEN -${orderPayments.amount} ELSE ${orderPayments.amount} END), 0)`,
    })
    .from(orderPayments)
    .where(
      and(
        eq(orderPayments.orderId, orderId),
        eq(orderPayments.organizationId, organizationId),
        isNull(orderPayments.deletedAt)
      )
    );

  const [order] = await tx
    .select({
      total: orders.total,
      paidAt: orders.paidAt,
    })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.organizationId, organizationId)))
    .limit(1);

  if (!order) {
    throw new NotFoundError("Order not found");
  }

  const paidAmount = Number(summary?.netAmount ?? 0);
  const total = Number(order.total ?? 0);
  const balanceDue = total - paidAmount;
  const paymentStatus =
    balanceDue <= 0 ? "paid" : paidAmount > 0 ? "partial" : "pending";

  await tx
    .update(orders)
    .set({
      paidAmount,
      balanceDue,
      paymentStatus,
      paidAt: balanceDue <= 0 ? order.paidAt ?? new Date() : null,
      updatedAt: new Date(),
      updatedBy: userId,
    })
    .where(eq(orders.id, orderId));
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all payments for an order
 */
export const getOrderPayments = createServerFn({ method: "GET" })
  .inputValidator(insertOrderPaymentSchema.pick({ orderId: true }))
  .handler(async ({ data: { orderId } }) => {
    const ctx = await withAuth();

    const payments = await db
      .select({
        id: orderPayments.id,
        orderId: orderPayments.orderId,
        amount: orderPayments.amount,
        paymentMethod: orderPayments.paymentMethod,
        paymentDate: orderPayments.paymentDate,
        reference: orderPayments.reference,
        notes: orderPayments.notes,
        isRefund: orderPayments.isRefund,
        relatedPaymentId: orderPayments.relatedPaymentId,
        createdAt: orderPayments.createdAt,
        updatedAt: orderPayments.updatedAt,
        recordedBy: orderPayments.recordedBy,
      })
      .from(orderPayments)
      .where(
        and(
          eq(orderPayments.orderId, orderId),
          eq(orderPayments.organizationId, ctx.organizationId),
          isNull(orderPayments.deletedAt)
        )
      )
      .orderBy(desc(orderPayments.paymentDate));

    return payments;
  });

/**
 * Get a single payment by ID
 */
export const getOrderPayment = createServerFn({ method: "GET" })
  .inputValidator(z.object({
    paymentId: z.string().uuid(),
  }))
  .handler(async ({ data: { paymentId } }) => {
    const ctx = await withAuth();

    const [payment] = await db
      .select({
        id: orderPayments.id,
        orderId: orderPayments.orderId,
        amount: orderPayments.amount,
        paymentMethod: orderPayments.paymentMethod,
        paymentDate: orderPayments.paymentDate,
        reference: orderPayments.reference,
        notes: orderPayments.notes,
        isRefund: orderPayments.isRefund,
        relatedPaymentId: orderPayments.relatedPaymentId,
        createdAt: orderPayments.createdAt,
        updatedAt: orderPayments.updatedAt,
        recordedBy: orderPayments.recordedBy,
      })
      .from(orderPayments)
      .where(
        and(
          eq(orderPayments.id, paymentId),
          eq(orderPayments.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    return payment ?? null;
  });

/**
 * Get payment summary for an order (total paid, refunds, etc.)
 */
export const getOrderPaymentSummary = createServerFn({ method: "GET" })
  .inputValidator(insertOrderPaymentSchema.pick({ orderId: true }))
  .handler(async ({ data: { orderId } }) => {
    const ctx = await withAuth();

    const result = await db
      .select({
        totalPayments: sql<number>`count(*)::int`,
        totalPaid: sql<number>`COALESCE(SUM(CASE WHEN ${orderPayments.isRefund} = false THEN ${orderPayments.amount} ELSE 0 END), 0)`,
        totalRefunds: sql<number>`COALESCE(SUM(CASE WHEN ${orderPayments.isRefund} = true THEN ${orderPayments.amount} ELSE 0 END), 0)`,
        netAmount: sql<number>`COALESCE(SUM(CASE WHEN ${orderPayments.isRefund} = true THEN -${orderPayments.amount} ELSE ${orderPayments.amount} END), 0)`,
      })
      .from(orderPayments)
      .where(
        and(
          eq(orderPayments.orderId, orderId),
          eq(orderPayments.organizationId, ctx.organizationId),
          isNull(orderPayments.deletedAt)
        )
      );

    return result[0] ?? {
      totalPayments: 0,
      totalPaid: 0,
      totalRefunds: 0,
      netAmount: 0,
    };
  });

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new payment record
 */
export const createOrderPayment = createServerFn({ method: "POST" })
  .inputValidator(insertOrderPaymentSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    return db.transaction(async (tx) => {
      const [payment] = await tx
        .insert(orderPayments)
        .values({
          ...data,
          organizationId: ctx.organizationId,
          recordedBy: ctx.user.id,
        })
        .returning({
          id: orderPayments.id,
          orderId: orderPayments.orderId,
          amount: orderPayments.amount,
          paymentMethod: orderPayments.paymentMethod,
          paymentDate: orderPayments.paymentDate,
          reference: orderPayments.reference,
          notes: orderPayments.notes,
          isRefund: orderPayments.isRefund,
          createdAt: orderPayments.createdAt,
        });

      await updateOrderPaymentStatus(
        tx,
        data.orderId,
        ctx.organizationId,
        ctx.user.id
      );

      return payment;
    });
  });

/**
 * Update an existing payment
 */
export const updateOrderPayment = createServerFn({ method: "POST" })
  .inputValidator(updateOrderPaymentSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const { id, ...updates } = data;

    // Check ownership
    const [existing] = await db
      .select({ id: orderPayments.id, orderId: orderPayments.orderId })
      .from(orderPayments)
      .where(
        and(
          eq(orderPayments.id, id),
          eq(orderPayments.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Payment not found");
    }

    return db.transaction(async (tx) => {
      const [payment] = await tx
        .update(orderPayments)
        .set({
          ...updates,
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(orderPayments.id, id))
        .returning({
          id: orderPayments.id,
          orderId: orderPayments.orderId,
          amount: orderPayments.amount,
          paymentMethod: orderPayments.paymentMethod,
          paymentDate: orderPayments.paymentDate,
          reference: orderPayments.reference,
          notes: orderPayments.notes,
          isRefund: orderPayments.isRefund,
          updatedAt: orderPayments.updatedAt,
        });

      if (payment?.orderId) {
        await updateOrderPaymentStatus(
          tx,
          payment.orderId,
          ctx.organizationId,
          ctx.user.id
        );
      }

      return payment;
    });
  });

/**
 * Delete a payment (soft delete)
 */
export const deleteOrderPayment = createServerFn({ method: "POST" })
  .inputValidator(deleteOrderPaymentSchema)
  .handler(async ({ data: { id } }) => {
    const ctx = await withAuth();

    // Check ownership
    const [existing] = await db
      .select({ id: orderPayments.id, orderId: orderPayments.orderId })
      .from(orderPayments)
      .where(
        and(
          eq(orderPayments.id, id),
          eq(orderPayments.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Payment not found");
    }

    await db.transaction(async (tx) => {
      await tx
        .update(orderPayments)
        .set({
          deletedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(orderPayments.id, id));

      await updateOrderPaymentStatus(
        tx,
        existing.orderId,
        ctx.organizationId,
        ctx.user.id
      );
    });

    return { success: true };
  });

/**
 * Create a refund payment linked to an original payment
 */
export const createRefundPayment = createServerFn({ method: "POST" })
  .inputValidator(
    insertOrderPaymentSchema
      .pick({ orderId: true })
      .extend({
        originalPaymentId: insertOrderPaymentSchema.shape.orderId,
        amount: insertOrderPaymentSchema.shape.amount,
        notes: insertOrderPaymentSchema.shape.notes,
      })
  )
  .handler(async ({ data: { orderId, originalPaymentId, amount, notes } }) => {
    const ctx = await withAuth();

    // Get original payment
    const [original] = await db
      .select({
        id: orderPayments.id,
        amount: orderPayments.amount,
        paymentMethod: orderPayments.paymentMethod,
      })
      .from(orderPayments)
      .where(
        and(
          eq(orderPayments.id, originalPaymentId),
          eq(orderPayments.orderId, orderId),
          eq(orderPayments.organizationId, ctx.organizationId),
          eq(orderPayments.isRefund, false)
        )
      )
      .limit(1);

    if (!original) {
      throw new NotFoundError("Original payment not found");
    }

    if (amount > original.amount) {
      throw new ValidationError("Refund amount cannot exceed original payment", {
        amount: [`Refund amount (${amount}) exceeds original payment (${original.amount})`],
      });
    }

    const today = new Date().toISOString().split("T")[0];

    return db.transaction(async (tx) => {
      const [refund] = await tx
        .insert(orderPayments)
        .values({
          orderId,
          amount,
          paymentMethod: original.paymentMethod,
          paymentDate: today,
          notes: notes ?? `Refund for payment ${originalPaymentId}`,
          isRefund: true,
          relatedPaymentId: originalPaymentId,
          organizationId: ctx.organizationId,
          recordedBy: ctx.user.id,
        })
        .returning({
          id: orderPayments.id,
          orderId: orderPayments.orderId,
          amount: orderPayments.amount,
          paymentMethod: orderPayments.paymentMethod,
          paymentDate: orderPayments.paymentDate,
          notes: orderPayments.notes,
          isRefund: orderPayments.isRefund,
          relatedPaymentId: orderPayments.relatedPaymentId,
          createdAt: orderPayments.createdAt,
        });

      await updateOrderPaymentStatus(
        tx,
        orderId,
        ctx.organizationId,
        ctx.user.id
      );

      return refund;
    });
  });

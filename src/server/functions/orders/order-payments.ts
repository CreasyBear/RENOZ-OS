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
import { db, type TransactionExecutor } from "@/lib/db";
import { normalizeObjectInput } from "@/lib/schemas/_shared/patterns";
import { orderPayments } from "drizzle/schema";
import {
  insertOrderPaymentSchema,
  updateOrderPaymentSchema,
  deleteOrderPaymentSchema,
} from "@/lib/schemas/orders/order-payments";
import { withAuth } from "@/lib/server/protected";
import { NotFoundError, ValidationError } from "@/lib/server/errors";
import { recalculateOrderFinancialProjection } from "@/server/functions/financial/_shared/order-financial-projection";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * @deprecated Use recalculateOrderFinancialProjection directly for new finance flows.
 * Kept as a compatibility wrapper for existing order-domain callers.
 */
export async function updateOrderPaymentStatus(
  tx: TransactionExecutor,
  orderId: string,
  organizationId: string,
  userId: string
) {
  return recalculateOrderFinancialProjection(tx, {
    orderId,
    organizationId,
    userId,
  });
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all payments for an order
 */
export const getOrderPayments = createServerFn({ method: "GET" })
  .inputValidator(normalizeObjectInput(insertOrderPaymentSchema.pick({ orderId: true })))
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
  .inputValidator(
    normalizeObjectInput(
      z.object({
        paymentId: z.string().uuid(),
      })
    )
  )
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
  .inputValidator(normalizeObjectInput(insertOrderPaymentSchema.pick({ orderId: true })))
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
          eq(orderPayments.isRefund, false),
          isNull(orderPayments.deletedAt)
        )
      )
      .limit(1);

    if (!original) {
      throw new NotFoundError("Original payment not found");
    }

    const [refundTotals] = await db
      .select({
        totalRefunded: sql<number>`coalesce(sum(${orderPayments.amount}), 0)::numeric`,
      })
      .from(orderPayments)
      .where(
        and(
          eq(orderPayments.orderId, orderId),
          eq(orderPayments.organizationId, ctx.organizationId),
          eq(orderPayments.isRefund, true),
          eq(orderPayments.relatedPaymentId, originalPaymentId),
          isNull(orderPayments.deletedAt)
        )
      )
      .limit(1);

    const totalRefunded = Number(refundTotals?.totalRefunded ?? 0);
    const remainingRefundable = Math.max(0, Number(original.amount) - totalRefunded);

    if (amount > remainingRefundable) {
      throw new ValidationError("Refund amount cannot exceed remaining refundable balance", {
        amount: [
          `Refund amount (${amount}) exceeds remaining refundable balance (${remainingRefundable})`,
        ],
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

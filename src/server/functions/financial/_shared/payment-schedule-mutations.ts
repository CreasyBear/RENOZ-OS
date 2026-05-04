import { and, count, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import type { SessionContext } from '@/lib/server/protected';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/server/errors';
import { formatAmount } from '@/lib/currency';
import { calculateGst } from '@/lib/utils/financial';
import { computeChanges } from '@/lib/activity-logger';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import { orders, orderPayments, paymentSchedulePayments, paymentSchedules } from 'drizzle/schema';
import { recalculateOrderFinancialProjection } from './order-financial-projection';
import type { DeletePaymentPlanInput, RecordInstallmentPaymentInput, UpdateInstallmentInput } from '@/lib/schemas';

const PAYMENT_SCHEDULE_EXCLUDED_FIELDS: string[] = [
  'updatedAt',
  'updatedBy',
  'createdAt',
  'createdBy',
  'organizationId',
];

type PaymentScheduleRecord = typeof paymentSchedules.$inferSelect;

export async function recordPaymentScheduleInstallmentPayment(
  ctx: SessionContext,
  data: RecordInstallmentPaymentInput
): Promise<PaymentScheduleRecord> {
    // Get installment
    const installment = await db
      .select()
      .from(paymentSchedules)
      .where(
        and(
          eq(paymentSchedules.id, data.installmentId),
          eq(paymentSchedules.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (installment.length === 0) {
      throw new NotFoundError('Installment not found', 'installment');
    }

    if (installment[0].status === 'paid') {
      throw new ConflictError('Installment is already paid');
    }

    // Validate payment doesn't exceed remaining amount
    const currentPaid = installment[0].paidAmount || 0;
    const remainingDue = installment[0].amount - currentPaid;

    if (data.paidAmount > remainingDue + 0.01) {
      throw new ValidationError(
        `Payment amount (${formatAmount({ currency: 'AUD', amount: data.paidAmount })}) exceeds remaining due (${formatAmount({ currency: 'AUD', amount: remainingDue })})`
      );
    }

    // Calculate new paid amount
    const newPaidAmount = currentPaid + data.paidAmount;
    const isPaid = newPaidAmount >= installment[0].amount - 0.01;
    const orderId = installment[0].orderId;

    // Wrap all updates in a transaction for atomicity
    const updated = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      const paymentReference =
        data.reference ?? data.paymentReference ?? `Installment ${installment[0].installmentNo}`;

      const [payment] = await tx
        .insert(orderPayments)
        .values({
          orderId,
          amount: data.paidAmount,
          paymentMethod: data.paymentMethod,
          paymentDate: data.paymentDate,
          reference: paymentReference,
          notes: data.notes,
          isRefund: false,
          organizationId: ctx.organizationId,
          recordedBy: ctx.user.id,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning({
          id: orderPayments.id,
          orderId: orderPayments.orderId,
        });

      if (!payment) {
        throw new ValidationError('Payment could not be recorded');
      }

      await tx.insert(paymentSchedulePayments).values({
        organizationId: ctx.organizationId,
        paymentScheduleId: data.installmentId,
        orderPaymentId: payment.id,
        amount: data.paidAmount,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      });

      // Update installment promise state after the real payment ledger row exists.
      const [updatedInstallment] = await tx
        .update(paymentSchedules)
        .set({
          paidAmount: newPaidAmount,
          status: isPaid ? 'paid' : 'due',
          paidAt: isPaid ? new Date() : null,
          paymentReference,
          notes: data.notes
            ? installment[0].notes
              ? `${installment[0].notes}\n${data.notes}`
              : data.notes
            : installment[0].notes,
          updatedBy: ctx.user.id,
        })
        .where(eq(paymentSchedules.id, data.installmentId))
        .returning();

      if (!updatedInstallment) {
        throw new NotFoundError('Payment installment not found or already modified', 'paymentSchedule');
      }

      await recalculateOrderFinancialProjection(tx, {
        orderId,
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
      });

      // Get order for customerId (inside transaction to avoid extra query) — scoped by organizationId
      const [orderRecord] = await tx
        .select({ customerId: orders.customerId })
        .from(orders)
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      return { updatedInstallment, customerId: orderRecord?.customerId };
    });

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'order',
      entityId: orderId,
      action: 'updated',
      description: `Recorded payment of ${formatAmount({ currency: 'AUD', amount: data.paidAmount })} for installment`,
      changes: computeChanges({
        before: installment[0],
        after: updated.updatedInstallment,
        excludeFields: PAYMENT_SCHEDULE_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        orderId,
        customerId: updated.customerId, // Include for customer timeline visibility
        installmentId: data.installmentId,
        installmentNo: installment[0].installmentNo,
        paidAmount: newPaidAmount, // Total paid amount after this payment
        amount: data.paidAmount,   // This specific payment amount
      },
    });

    return updated.updatedInstallment;
}

export async function updatePaymentScheduleInstallment(
  ctx: SessionContext,
  data: UpdateInstallmentInput
): Promise<PaymentScheduleRecord> {
    const { installmentId, ...updateData } = data;

    // Get existing
    const existing = await db
      .select()
      .from(paymentSchedules)
      .where(
        and(
          eq(paymentSchedules.id, installmentId),
          eq(paymentSchedules.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundError('Installment not found', 'installment');
    }

    if (existing[0].status === 'paid') {
      throw new ConflictError('Paid installments cannot be updated');
    }

    // Update
    const updates: Partial<PaymentScheduleRecord> = {
      updatedBy: ctx.user.id,
    };

    if (updateData.dueDate) {
      updates.dueDate = updateData.dueDate; // Already a string in YYYY-MM-DD format
    }
    if (updateData.amount !== undefined) {
      updates.amount = updateData.amount;
      if (!updateData.gstAmount) {
        updates.gstAmount = calculateGst(updateData.amount);
      }
    }
    if (updateData.gstAmount !== undefined) {
      updates.gstAmount = updateData.gstAmount;
    }
    if (updateData.description !== undefined) {
      updates.description = updateData.description;
    }
    if (updateData.notes !== undefined) {
      updates.notes = updateData.notes;
    }

    const [updated] = await db
      .update(paymentSchedules)
      .set(updates)
      .where(eq(paymentSchedules.id, installmentId))
      .returning();

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'order',
      entityId: existing[0].orderId,
      action: 'updated',
      description: `Updated installment ${existing[0].installmentNo}`,
      changes: computeChanges({
        before: existing[0],
        after: updated,
        excludeFields: PAYMENT_SCHEDULE_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        orderId: updated.orderId,
        installmentId: updated.id,
        installmentNo: updated.installmentNo,
        changedFields: Object.keys(updateData),
      },
    });

    return updated;
}

export async function deletePaymentPlanForOrder(
  ctx: SessionContext,
  data: DeletePaymentPlanInput
): Promise<{ deleted: number }> {

    // Get plan type before deleting for logging
    const [existingPlan] = await db
      .select({ planType: paymentSchedules.planType })
      .from(paymentSchedules)
      .where(
        and(
          eq(paymentSchedules.orderId, data.orderId),
          eq(paymentSchedules.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    // Wrap in transaction to prevent race condition between check and delete
    const result = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      // Check for any paid installments
      const paidInstallments = await tx
        .select()
        .from(paymentSchedules)
        .where(
          and(
            eq(paymentSchedules.orderId, data.orderId),
            eq(paymentSchedules.organizationId, ctx.organizationId),
            eq(paymentSchedules.status, 'paid')
          )
        )
        .limit(1);

      if (paidInstallments.length > 0) {
        throw new ConflictError('Cannot delete payment plan with paid installments');
      }

      // Count before delete
      const countResult = await tx
        .select({ count: count() })
        .from(paymentSchedules)
        .where(
          and(
            eq(paymentSchedules.orderId, data.orderId),
            eq(paymentSchedules.organizationId, ctx.organizationId)
          )
        );

      const deleteCount = countResult[0]?.count ?? 0;

      // Delete all installments
      await tx
        .delete(paymentSchedules)
        .where(
          and(
            eq(paymentSchedules.orderId, data.orderId),
            eq(paymentSchedules.organizationId, ctx.organizationId)
          )
        );

      return { deleted: deleteCount };
    });

    // Get order for customerId — scoped by organizationId for multi-tenant safety
    const [order] = await db
      .select({ customerId: orders.customerId })
      .from(orders)
      .where(
        and(
          eq(orders.id, data.orderId),
          eq(orders.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'order',
      entityId: data.orderId,
      action: 'deleted',
      description: `Deleted payment plan (${result.deleted} installments)`,
      metadata: {
        orderId: data.orderId,
        customerId: order?.customerId, // Include for customer timeline visibility
        planType: existingPlan?.planType,
        deletedCount: result.deleted,
      },
    });

    return result;
}

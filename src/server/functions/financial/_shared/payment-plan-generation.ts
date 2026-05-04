import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import type { SessionContext } from '@/lib/server/protected';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/server/errors';
import { formatAmount } from '@/lib/currency';
import { safeNumber } from '@/lib/numeric';
import { calculateGst } from '@/lib/utils/financial';
import { orders, paymentSchedules } from 'drizzle/schema';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import type { CreatePaymentPlanInput, PaymentPlanType, PaymentScheduleResponse } from '@/lib/schemas';

/**
 * Add days to a date.
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Generate installments for a preset plan type.
 */
function generatePresetInstallments(
  planType: PaymentPlanType,
  totalAmount: number,
  orderDate: Date,
  paymentTermsDays: number,
  numberOfPayments?: number
): Array<{
  installmentNo: number;
  description: string;
  dueDate: Date;
  amount: number;
  gstAmount: number;
}> {
  const installments: Array<{
    installmentNo: number;
    description: string;
    dueDate: Date;
    amount: number;
    gstAmount: number;
  }> = [];

  switch (planType) {
    case 'fifty_fifty': {
      // 50% deposit (due on order date or payment terms), 50% on completion
      const halfAmount = Math.round(totalAmount * 0.5 * 100) / 100;
      const secondHalf = totalAmount - halfAmount; // Handle rounding

      installments.push({
        installmentNo: 1,
        description: 'Deposit (50%)',
        dueDate: addDays(orderDate, paymentTermsDays),
        amount: halfAmount,
        gstAmount: calculateGst(halfAmount),
      });

      installments.push({
        installmentNo: 2,
        description: 'Final payment (50%)',
        dueDate: addDays(orderDate, paymentTermsDays + 30), // 30 days after deposit
        amount: secondHalf,
        gstAmount: calculateGst(secondHalf),
      });
      break;
    }

    case 'thirds': {
      // 33/33/34 split
      const thirdAmount = Math.round(totalAmount * 0.33 * 100) / 100;
      const finalAmount = totalAmount - thirdAmount * 2; // Handle rounding

      installments.push({
        installmentNo: 1,
        description: 'Initial payment (33%)',
        dueDate: addDays(orderDate, paymentTermsDays),
        amount: thirdAmount,
        gstAmount: calculateGst(thirdAmount),
      });

      installments.push({
        installmentNo: 2,
        description: 'Progress payment (33%)',
        dueDate: addDays(orderDate, paymentTermsDays + 30),
        amount: thirdAmount,
        gstAmount: calculateGst(thirdAmount),
      });

      installments.push({
        installmentNo: 3,
        description: 'Final payment (34%)',
        dueDate: addDays(orderDate, paymentTermsDays + 60),
        amount: finalAmount,
        gstAmount: calculateGst(finalAmount),
      });
      break;
    }

    case 'monthly': {
      // Equal monthly payments
      const payments = numberOfPayments || 3;
      const monthlyAmount = Math.round((totalAmount / payments) * 100) / 100;
      let remaining = totalAmount;

      for (let i = 1; i <= payments; i++) {
        const isLast = i === payments;
        const amount = isLast ? remaining : monthlyAmount;
        remaining -= amount;

        installments.push({
          installmentNo: i,
          description: `Payment ${i} of ${payments}`,
          dueDate: addDays(orderDate, paymentTermsDays + (i - 1) * 30),
          amount,
          gstAmount: calculateGst(amount),
        });
      }
      break;
    }

    default:
      throw new ValidationError(`Unknown plan type: ${planType}`);
  }

  return installments;
}


export async function createPaymentPlanForOrder(
  ctx: SessionContext,
  data: CreatePaymentPlanInput
): Promise<PaymentScheduleResponse> {
    // Get order (outside transaction - read-only)
    const order = await db
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

    if (order.length === 0) {
      throw new NotFoundError('Order not found', 'order');
    }

    const totalAmount = safeNumber(order[0].total);
    const orderDate = order[0].orderDate ? new Date(order[0].orderDate) : new Date();

    // Generate installments based on plan type (outside transaction - pure computation)
    let installments: Array<{
      installmentNo: number;
      description: string;
      dueDate: Date;
      amount: number;
      gstAmount: number;
    }>;

    if (data.planType === 'custom' && data.customInstallments) {
      // Validate custom installments total matches order total
      const customTotal = data.customInstallments.reduce((sum, i) => sum + i.amount, 0);
      if (Math.abs(customTotal - totalAmount) > 0.01) {
        throw new ValidationError(
          `Custom installments total (${formatAmount({ currency: 'AUD', amount: customTotal })}) does not match order total (${formatAmount({ currency: 'AUD', amount: totalAmount })})`
        );
      }

      installments = data.customInstallments.map((ci, index) => ({
        installmentNo: index + 1,
        description: ci.description || `Installment ${index + 1}`,
        dueDate: new Date(ci.dueDate), // Convert string to Date
        amount: ci.amount,
        gstAmount: ci.gstAmount ?? calculateGst(ci.amount),
      }));
    } else {
      installments = generatePresetInstallments(
        data.planType,
        totalAmount,
        orderDate,
        data.paymentTermsDays,
        data.numberOfPayments
      );
    }

    // Wrap check-and-insert in transaction for atomicity
    const insertedInstallments = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      // Check if plan already exists INSIDE transaction to prevent race conditions
      const existingPlan = await tx
        .select()
        .from(paymentSchedules)
        .where(
          and(
            eq(paymentSchedules.orderId, data.orderId),
            eq(paymentSchedules.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (existingPlan.length > 0) {
        throw new ConflictError(
          'Payment plan already exists for this order. Delete the existing plan first.'
        );
      }

      // Insert all installments atomically
      const inserted = await tx
        .insert(paymentSchedules)
        .values(
          installments.map((inst) => ({
            organizationId: ctx.organizationId,
            orderId: data.orderId,
            planType: data.planType,
            installmentNo: inst.installmentNo,
            description: inst.description,
            dueDate: inst.dueDate.toISOString().split('T')[0],
            amount: inst.amount,
            gstAmount: inst.gstAmount,
            status: 'pending' as const,
            paidAmount: 0,
            notes: data.notes,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          }))
        )
        .returning();

      return inserted;
    });

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'order',
      entityId: data.orderId,
      action: 'created',
      description: `Created ${data.planType} payment plan for order`,
      metadata: {
        orderId: data.orderId,
        orderNumber: order[0].orderNumber ?? undefined,
        customerId: order[0].customerId, // Include for customer timeline visibility
        planType: data.planType,
        total: totalAmount,
        installmentCount: insertedInstallments.length,
      },
    });

    // Return summary (matches PaymentScheduleResponse structure)
    return {
      orderId: data.orderId,
      planType: data.planType,
      totalAmount,
      paidAmount: 0,
      remainingAmount: totalAmount,
      installmentCount: insertedInstallments.length,
      paidCount: 0,
      overdueCount: 0,
      nextDueDate: insertedInstallments[0]?.dueDate
        ? new Date(insertedInstallments[0].dueDate)
        : null,
      nextDueAmount: insertedInstallments[0]?.amount ?? null,
      installments: insertedInstallments.map((inst) => ({
        id: inst.id,
        organizationId: inst.organizationId,
        orderId: inst.orderId,
        planType: inst.planType,
        installmentNo: inst.installmentNo,
        description: inst.description,
        dueDate: new Date(inst.dueDate), // Convert string to Date
        amount: safeNumber(inst.amount),
        gstAmount: safeNumber(inst.gstAmount),
        status: inst.status,
        paidAmount: inst.paidAmount,
        paidAt: inst.paidAt ? new Date(inst.paidAt) : null,
        paymentReference: inst.paymentReference,
        notes: inst.notes,
        createdBy: inst.createdBy ?? '', // Ensure non-null for schema compliance
        updatedBy: inst.updatedBy ?? '', // Ensure non-null for schema compliance
        createdAt: inst.createdAt,
        updatedAt: inst.updatedAt,
      })),
    };
}

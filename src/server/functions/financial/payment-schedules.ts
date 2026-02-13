/**
 * Payment Schedules Server Functions
 *
 * Create payment plans, track installments, and record payments.
 * Supports preset plans (50/50, thirds, monthly) and custom schedules.
 *
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json for DOM-FIN-002b
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, asc, isNull, lte, inArray, count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { paymentSchedules, orders, customers } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { formatAmount } from '@/lib/currency';
import { NotFoundError, ValidationError, ConflictError } from '@/lib/server/errors';
import { calculateGst } from '@/lib/utils/financial';
import {
  createPaymentPlanSchema,
  recordInstallmentPaymentSchema,
  getPaymentScheduleSchema,
  overdueInstallmentsQuerySchema,
  updateInstallmentSchema,
  deletePaymentPlanSchema,
  paymentPlanTypeSchema,
  installmentStatusSchema,
  type PaymentPlanType,
  type PaymentScheduleResponse,
} from '@/lib/schemas';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import { computeChanges } from '@/lib/activity-logger';

// Excluded fields for activity logging (system-managed fields)
const PAYMENT_SCHEDULE_EXCLUDED_FIELDS: string[] = [
  'updatedAt',
  'updatedBy',
  'createdAt',
  'createdBy',
  'organizationId',
];

// ============================================================================
// TYPES
// ============================================================================

type PaymentScheduleRecord = typeof paymentSchedules.$inferSelect;

interface OverdueInstallmentWithRelations extends PaymentScheduleRecord {
  order: { id: string; orderNumber: string | null; total: number; status: string } | null;
  customer: { id: string; name: string; email: string | null } | null;
  daysOverdue: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================


/**
 * Add days to a date.
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Mark installments as overdue (internal helper).
 * Used by listOverdueInstallments lazy-update. Idempotent.
 */
async function markInstallmentsOverdueInternal(
  organizationId: string,
  installmentIds: string[],
  updatedBy: string
): Promise<void> {
  if (installmentIds.length === 0) return;
  await db
    .update(paymentSchedules)
    .set({ status: 'overdue', updatedBy })
    .where(
      and(
        inArray(paymentSchedules.id, installmentIds),
        eq(paymentSchedules.organizationId, organizationId)
      )
    );
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

// ============================================================================
// CREATE PAYMENT PLAN
// ============================================================================

/**
 * Create a payment plan for an order.
 */
export const createPaymentPlan = createServerFn({ method: 'POST' })
  .inputValidator(createPaymentPlanSchema)
  .handler(async ({ data }): Promise<PaymentScheduleResponse> => {
    const ctx = await withAuth({ permission: PERMISSIONS.financial.create });

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

    const totalAmount = order[0].total || 0;
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
        total: Number(totalAmount),
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
        amount: Number(inst.amount),
        gstAmount: Number(inst.gstAmount),
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
  });

// ============================================================================
// GET PAYMENT SCHEDULE
// ============================================================================

/**
 * Get the payment schedule for an order.
 */
export const getPaymentSchedule = createServerFn({ method: 'GET' })
  .inputValidator(getPaymentScheduleSchema)
  .handler(async ({ data }): Promise<PaymentScheduleResponse | null> => {
    const ctx = await withAuth();

    // Get installments
    const installments = await db
      .select()
      .from(paymentSchedules)
      .where(
        and(
          eq(paymentSchedules.orderId, data.orderId),
          eq(paymentSchedules.organizationId, ctx.organizationId)
        )
      )
      .orderBy(asc(paymentSchedules.installmentNo));

    if (installments.length === 0) {
      return null;
    }

    // Get order for total — scoped by organizationId for multi-tenant safety
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

    const totalAmount = order[0]?.total || 0;
    const paidAmount = installments.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
    const paidCount = installments.filter((i) => i.status === 'paid').length;

    // Find overdue installments
    const today = new Date();
    const overdueCount = installments.filter(
      (i) => i.status !== 'paid' && new Date(i.dueDate) < today
    ).length;

    // Find next due installment
    const nextDue = installments.find((i) => i.status !== 'paid');

    // Validate enum values from database
    const planType = paymentPlanTypeSchema.parse(installments[0].planType);

    return {
      orderId: data.orderId,
      planType,
      totalAmount,
      paidAmount,
      remainingAmount: totalAmount - paidAmount,
      installmentCount: installments.length,
      paidCount,
      overdueCount,
      nextDueDate: nextDue ? new Date(nextDue.dueDate) : null,
      nextDueAmount: nextDue?.amount ?? null,
      installments: installments.map((inst) => {
        // Validate enum values from database
        const validatedPlanType = paymentPlanTypeSchema.parse(inst.planType);
        const validatedStatus = installmentStatusSchema.parse(inst.status);

        return {
          id: inst.id,
          organizationId: inst.organizationId,
          orderId: inst.orderId,
          planType: validatedPlanType,
          installmentNo: inst.installmentNo,
          description: inst.description,
          dueDate: new Date(inst.dueDate),
          amount: Number(inst.amount),
          gstAmount: Number(inst.gstAmount),
          status: validatedStatus,
          paidAmount: inst.paidAmount ? Number(inst.paidAmount) : null,
          paidAt: inst.paidAt,
          paymentReference: inst.paymentReference,
          notes: inst.notes,
          createdBy: inst.createdBy ?? '', // Ensure non-null for schema compliance
          updatedBy: inst.updatedBy ?? '', // Ensure non-null for schema compliance
          createdAt: inst.createdAt,
          updatedAt: inst.updatedAt,
        };
      }),
    };
  });

// ============================================================================
// RECORD INSTALLMENT PAYMENT
// ============================================================================

/**
 * Record a payment against an installment.
 */
export const recordInstallmentPayment = createServerFn({ method: 'POST' })
  .inputValidator(recordInstallmentPaymentSchema)
  .handler(async ({ data }): Promise<PaymentScheduleRecord> => {
    const ctx = await withAuth({ permission: PERMISSIONS.financial.update });

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
      // Update installment
      const [updatedInstallment] = await tx
        .update(paymentSchedules)
        .set({
          paidAmount: newPaidAmount,
          status: isPaid ? 'paid' : 'due',
          paidAt: isPaid ? new Date() : null,
          paymentReference: data.paymentReference || installment[0].paymentReference,
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

      // Get all installments for order to calculate total paid — scoped by organizationId
      const allInstallments = await tx
        .select({ paidAmount: paymentSchedules.paidAmount })
        .from(paymentSchedules)
        .where(
          and(
            eq(paymentSchedules.orderId, orderId),
            eq(paymentSchedules.organizationId, ctx.organizationId)
          )
        );

      const totalPaid = allInstallments.reduce((sum, i) => sum + (i.paidAmount || 0), 0);

      // Update order's paid amount and balance — scoped by organizationId for multi-tenant safety
      const order = await tx
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.organizationId, ctx.organizationId),
            isNull(orders.deletedAt)
          )
        )
        .limit(1);

      if (order.length > 0) {
        const orderTotal = order[0].total || 0;
        const balanceDue = Math.max(0, orderTotal - totalPaid);

        await tx
          .update(orders)
          .set({
            paidAmount: totalPaid,
            balanceDue,
            paymentStatus: balanceDue <= 0 ? 'paid' : 'partial',
            updatedBy: ctx.user.id,
          })
          .where(
            and(
              eq(orders.id, orderId),
              eq(orders.organizationId, ctx.organizationId)
            )
          );
      }

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
  });

// ============================================================================
// GET OVERDUE INSTALLMENTS
// ============================================================================

/**
 * Get overdue installments for alerting.
 */
export const getOverdueInstallments = createServerFn({ method: 'GET' })
  .inputValidator(overdueInstallmentsQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const { page = 1, pageSize = 20, customerId, minDaysOverdue = 1 } = data;

    const limit = pageSize;
    const offset = (page - 1) * limit;

    // Calculate cutoff date
    const today = new Date();
    const cutoffDate = addDays(today, -minDaysOverdue);

    // Build where conditions
    const conditions = [
      eq(paymentSchedules.organizationId, ctx.organizationId),
      inArray(paymentSchedules.status, ['pending', 'due', 'overdue']),
      lte(paymentSchedules.dueDate, cutoffDate.toISOString().split('T')[0]),
    ];
    if (customerId) {
      conditions.push(eq(customers.id, customerId));
    }
    const whereClause = and(...conditions);

    // Build count conditions (without customer join)
    const countConditions = [
      eq(paymentSchedules.organizationId, ctx.organizationId),
      inArray(paymentSchedules.status, ['pending', 'due', 'overdue']),
      lte(paymentSchedules.dueDate, cutoffDate.toISOString().split('T')[0]),
    ];
    if (customerId) {
      countConditions.push(eq(orders.customerId, customerId));
    }
    const countWhereClause = and(...countConditions);

    // Build base query with joins — select explicit columns instead of full table objects
    // to avoid over-fetching all columns from orders and customers
    const results = await db
      .select({
        installment: paymentSchedules,
        orderNumber: orders.orderNumber,
        orderId: orders.id,
        orderTotal: orders.total,
        orderStatus: orders.status,
        customerId: customers.id,
        customerName: customers.name,
        customerEmail: customers.email,
      })
      .from(paymentSchedules)
      .innerJoin(orders, eq(paymentSchedules.orderId, orders.id))
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(whereClause)
      .orderBy(asc(paymentSchedules.dueDate))
      .limit(limit)
      .offset(offset);

    // Get total count
    const countResult = await db
      .select({ count: count() })
      .from(paymentSchedules)
      .innerJoin(orders, eq(paymentSchedules.orderId, orders.id))
      .where(countWhereClause);

    const total = Number(countResult[0]?.count ?? 0);

    // Calculate days overdue for each
    const items = results.map((row) => {
      const dueDate = new Date(row.installment.dueDate);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        ...row.installment,
        order: {
          id: row.orderId,
          orderNumber: row.orderNumber,
          total: row.orderTotal,
          status: row.orderStatus,
        },
        customer: {
          id: row.customerId,
          name: row.customerName,
          email: row.customerEmail,
        },
        daysOverdue,
      };
    }) as OverdueInstallmentWithRelations[];

    // Lazy-update: mark as overdue (same transaction boundary as read).
    const overdueIds = items.filter((i) => i.status !== 'overdue').map((i) => i.id);
    if (overdueIds.length > 0) {
      await markInstallmentsOverdueInternal(ctx.organizationId, overdueIds, ctx.user.id);
    }

    // Calculate totals
    const totalOverdue = items.reduce((sum, i) => sum + (i.amount - (i.paidAmount || 0)), 0);

    return {
      items,
      total,
      page,
      limit,
      hasMore: offset + items.length < total,
      summary: {
        totalOverdue,
        itemCount: total,
      },
    };
  });

// ============================================================================
// UPDATE INSTALLMENT
// ============================================================================

/**
 * Update an installment (only pending status).
 */
export const updateInstallment = createServerFn({ method: 'POST' })
  .inputValidator(updateInstallmentSchema)
  .handler(async ({ data }): Promise<PaymentScheduleRecord> => {
    const ctx = await withAuth({ permission: PERMISSIONS.financial.update });
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
  });

// ============================================================================
// DELETE PAYMENT PLAN
// ============================================================================

/**
 * Delete a payment plan (only if no payments have been made).
 */
export const deletePaymentPlan = createServerFn({ method: 'POST' })
  .inputValidator(deletePaymentPlanSchema)
  .handler(async ({ data }): Promise<{ deleted: number }> => {
    const ctx = await withAuth({ permission: PERMISSIONS.financial.delete });

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
  });

import { and, asc, count, eq, inArray, isNull, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import type { SessionContext } from '@/lib/server/protected';
import { safeNumber } from '@/lib/numeric';
import { customers, orders, paymentSchedules } from 'drizzle/schema';
import { getOverdueCutoffDate } from './payment-schedule-overdue';
import { installmentStatusSchema, paymentPlanTypeSchema, type GetPaymentScheduleInput, type OverdueInstallmentsQuery, type PaymentScheduleResponse } from '@/lib/schemas';

type PaymentScheduleRecord = typeof paymentSchedules.$inferSelect;

interface OverdueInstallmentWithRelations extends PaymentScheduleRecord {
  order: { id: string; orderNumber: string | null; total: number; status: string } | null;
  customer: { id: string; name: string; email: string | null } | null;
  daysOverdue: number;
}

export async function readPaymentScheduleForOrder(
  ctx: SessionContext,
  data: GetPaymentScheduleInput
): Promise<PaymentScheduleResponse | null> {
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
          amount: safeNumber(inst.amount),
          gstAmount: safeNumber(inst.gstAmount),
          status: validatedStatus,
          paidAmount: inst.paidAmount != null ? safeNumber(inst.paidAmount) : null,
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
}

export async function readOverdueInstallments(
  ctx: SessionContext,
  data: OverdueInstallmentsQuery
) {
    const { page = 1, pageSize = 20, customerId, minDaysOverdue = 1 } = data;

    const limit = pageSize;
    const offset = (page - 1) * limit;

    // Calculate cutoff date
    const today = new Date();
    const cutoffDate = getOverdueCutoffDate(minDaysOverdue, today);

    // Build where conditions
    const conditions = [
      eq(paymentSchedules.organizationId, ctx.organizationId),
      inArray(paymentSchedules.status, ['pending', 'due', 'overdue']),
      lte(paymentSchedules.dueDate, cutoffDate),
    ];
    if (customerId) {
      conditions.push(eq(customers.id, customerId));
    }
    const whereClause = and(...conditions);

    // Build count conditions (without customer join)
    const countConditions = [
      eq(paymentSchedules.organizationId, ctx.organizationId),
      inArray(paymentSchedules.status, ['pending', 'due', 'overdue']),
      lte(paymentSchedules.dueDate, cutoffDate),
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

    const total = Math.floor(safeNumber(countResult[0]?.count));

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
}

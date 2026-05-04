import { and, eq, isNull, sql } from 'drizzle-orm';
import type { TransactionExecutor } from '@/lib/db';
import { NotFoundError } from '@/lib/server/errors';
import { creditNotes, orderPayments, orders } from 'drizzle/schema';

export interface OrderFinancialProjection {
  orderId: string;
  cashPaidAmount: number;
  creditAppliedAmount: number;
  settledAmount: number;
  balanceDue: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded' | 'overdue';
  paidAt: Date | null;
}

export async function recalculateOrderFinancialProjection(
  tx: TransactionExecutor,
  params: {
    orderId: string;
    organizationId: string;
    userId: string;
    asOf?: Date;
  }
): Promise<OrderFinancialProjection> {
  const asOf = params.asOf ?? new Date();

  const [order] = await tx
    .select({
      id: orders.id,
      total: orders.total,
      dueDate: orders.dueDate,
      invoiceDueDate: orders.invoiceDueDate,
      paidAt: orders.paidAt,
    })
    .from(orders)
    .where(
      and(
        eq(orders.id, params.orderId),
        eq(orders.organizationId, params.organizationId),
        isNull(orders.deletedAt)
      )
    )
    .limit(1);

  if (!order) {
    throw new NotFoundError('Order not found', 'order');
  }

  const [paymentSummary] = await tx
    .select({
      netCash: sql<number>`COALESCE(SUM(CASE WHEN ${orderPayments.isRefund} = true THEN -${orderPayments.amount} ELSE ${orderPayments.amount} END), 0)::numeric`,
    })
    .from(orderPayments)
    .where(
      and(
        eq(orderPayments.orderId, params.orderId),
        eq(orderPayments.organizationId, params.organizationId),
        isNull(orderPayments.deletedAt)
      )
    );

  const [creditSummary] = await tx
    .select({
      appliedCredit: sql<number>`COALESCE(SUM(${creditNotes.amount}), 0)::numeric`,
    })
    .from(creditNotes)
    .where(
      and(
        eq(creditNotes.appliedToOrderId, params.orderId),
        eq(creditNotes.organizationId, params.organizationId),
        eq(creditNotes.status, 'applied'),
        isNull(creditNotes.deletedAt)
      )
    );

  const total = Number(order.total ?? 0);
  const cashPaidAmount = Number(paymentSummary?.netCash ?? 0);
  const creditAppliedAmount = Number(creditSummary?.appliedCredit ?? 0);
  const settledAmount = cashPaidAmount + creditAppliedAmount;
  const balanceDue = Math.max(0, Number((total - settledAmount).toFixed(2)));
  const dueDate = order.invoiceDueDate ?? order.dueDate;
  const asOfDate = asOf.toISOString().split('T')[0];
  const dueDateValue = dueDate ? String(dueDate).split('T')[0] : null;
  const isOverdue = balanceDue > 0 && dueDateValue != null && dueDateValue < asOfDate;
  const paymentStatus =
    balanceDue <= 0
      ? 'paid'
      : cashPaidAmount < 0
        ? 'refunded'
        : isOverdue
          ? 'overdue'
          : settledAmount > 0
            ? 'partial'
            : 'pending';
  const paidAt = balanceDue <= 0 ? order.paidAt ?? asOf : null;

  await tx
    .update(orders)
    .set({
      paidAmount: cashPaidAmount,
      balanceDue,
      paymentStatus,
      paidAt,
      updatedAt: asOf,
      updatedBy: params.userId,
    })
    .where(
      and(
        eq(orders.id, params.orderId),
        eq(orders.organizationId, params.organizationId)
      )
    );

  return {
    orderId: params.orderId,
    cashPaidAmount,
    creditAppliedAmount,
    settledAmount,
    balanceDue,
    paymentStatus,
    paidAt,
  };
}

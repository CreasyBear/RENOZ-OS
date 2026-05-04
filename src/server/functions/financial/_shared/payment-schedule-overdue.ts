import { and, eq, inArray, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { paymentSchedules } from 'drizzle/schema';

export interface RefreshPaymentScheduleOverdueParams {
  organizationId: string;
  updatedBy?: string | null;
  minDaysOverdue?: number;
  installmentIds?: string[];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function getOverdueCutoffDate(minDaysOverdue = 1, today = new Date()): string {
  return addDays(today, -minDaysOverdue).toISOString().split('T')[0];
}

export async function markPaymentScheduleInstallmentsOverdue(params: {
  organizationId: string;
  installmentIds: string[];
  updatedBy?: string | null;
}): Promise<number> {
  if (params.installmentIds.length === 0) {
    return 0;
  }

  const updated = await db
    .update(paymentSchedules)
    .set({ status: 'overdue', updatedBy: params.updatedBy ?? null })
    .where(
      and(
        inArray(paymentSchedules.id, params.installmentIds),
        eq(paymentSchedules.organizationId, params.organizationId)
      )
    )
    .returning({ id: paymentSchedules.id });

  return updated.length;
}

export async function refreshPaymentScheduleOverdueStatuses(
  params: RefreshPaymentScheduleOverdueParams
): Promise<{ updatedCount: number; installmentIds: string[] }> {
  const cutoffDate = getOverdueCutoffDate(params.minDaysOverdue);

  const conditions = [
    eq(paymentSchedules.organizationId, params.organizationId),
    inArray(paymentSchedules.status, ['pending', 'due']),
    lte(paymentSchedules.dueDate, cutoffDate),
  ];

  if (params.installmentIds?.length) {
    conditions.push(inArray(paymentSchedules.id, params.installmentIds));
  }

  const candidates = await db
    .select({ id: paymentSchedules.id })
    .from(paymentSchedules)
    .where(and(...conditions));

  const installmentIds = candidates.map((candidate) => candidate.id);
  const updatedCount = await markPaymentScheduleInstallmentsOverdue({
    organizationId: params.organizationId,
    installmentIds,
    updatedBy: params.updatedBy,
  });

  return { updatedCount, installmentIds };
}

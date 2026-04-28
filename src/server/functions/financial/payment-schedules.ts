/**
 * Payment Schedules Server Functions
 *
 * Facades only: auth + validation + delegation to payment schedule helpers.
 */

import { createServerFn } from '@tanstack/react-start';
import { withAuth } from '@/lib/server/protected';
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  createPaymentPlanSchema,
  deletePaymentPlanSchema,
  getPaymentScheduleSchema,
  overdueInstallmentsQuerySchema,
  recordInstallmentPaymentSchema,
  updateInstallmentSchema,
} from '@/lib/schemas';
import { createPaymentPlanForOrder } from './_shared/payment-plan-generation';
import { readOverdueInstallments, readPaymentScheduleForOrder } from './_shared/payment-schedule-read';
import { refreshPaymentScheduleOverdueStatuses } from './_shared/payment-schedule-overdue';
import {
  deletePaymentPlanForOrder,
  recordPaymentScheduleInstallmentPayment,
  updatePaymentScheduleInstallment,
} from './_shared/payment-schedule-mutations';

export const createPaymentPlan = createServerFn({ method: 'POST' })
  .inputValidator(createPaymentPlanSchema)
  .handler(async ({ data }) => createPaymentPlanForOrder(await withAuth({ permission: PERMISSIONS.financial.create }), data));

export const getPaymentSchedule = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(getPaymentScheduleSchema))
  .handler(async ({ data }) => readPaymentScheduleForOrder(await withAuth(), data));

export const recordInstallmentPayment = createServerFn({ method: 'POST' })
  .inputValidator(recordInstallmentPaymentSchema)
  .handler(async ({ data }) => recordPaymentScheduleInstallmentPayment(await withAuth({ permission: PERMISSIONS.financial.update }), data));

export const getOverdueInstallments = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(overdueInstallmentsQuerySchema))
  .handler(async ({ data }) => readOverdueInstallments(await withAuth(), data));

export const refreshOverdueInstallments = createServerFn({ method: 'POST' })
  .inputValidator(normalizeObjectInput(overdueInstallmentsQuerySchema.pick({ minDaysOverdue: true })))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.financial.update });
    return refreshPaymentScheduleOverdueStatuses({
      organizationId: ctx.organizationId,
      updatedBy: ctx.user.id,
      minDaysOverdue: data.minDaysOverdue,
    });
  });

export const updateInstallment = createServerFn({ method: 'POST' })
  .inputValidator(updateInstallmentSchema)
  .handler(async ({ data }) => updatePaymentScheduleInstallment(await withAuth({ permission: PERMISSIONS.financial.update }), data));

export const deletePaymentPlan = createServerFn({ method: 'POST' })
  .inputValidator(deletePaymentPlanSchema)
  .handler(async ({ data }) => deletePaymentPlanForOrder(await withAuth({ permission: PERMISSIONS.financial.delete }), data));

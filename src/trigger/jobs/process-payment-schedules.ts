'use server'

/**
 * Process Payment Schedules Job (Trigger.dev v3)
 *
 * Persists overdue installment state. Payment schedule read paths intentionally
 * stay pure, so this scheduled command owns the status transition.
 */

import { schedules, logger } from '@trigger.dev/sdk/v3';
import { isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { organizations } from 'drizzle/schema/settings/organizations';
import { refreshPaymentScheduleOverdueStatuses } from '@/server/functions/financial/_shared/payment-schedule-overdue';

export interface ProcessPaymentSchedulesResult {
  organizationsChecked: number;
  installmentsMarkedOverdue: number;
  errors: number;
}

export const processPaymentSchedulesTask = schedules.task({
  id: 'process-payment-schedules',
  cron: '15 1 * * *',
  run: async (): Promise<ProcessPaymentSchedulesResult> => {
    logger.info('Starting payment schedule overdue processing');

    const orgs = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(isNull(organizations.deletedAt));

    let installmentsMarkedOverdue = 0;
    let errors = 0;

    for (const org of orgs) {
      try {
        const result = await refreshPaymentScheduleOverdueStatuses({
          organizationId: org.id,
          updatedBy: null,
          minDaysOverdue: 1,
        });

        installmentsMarkedOverdue += result.updatedCount;
      } catch (error) {
        errors += 1;
        logger.error('Failed to process payment schedules for organization', {
          organizationId: org.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      organizationsChecked: orgs.length,
      installmentsMarkedOverdue,
      errors,
    };
  },
});

export const processPaymentSchedulesJob = processPaymentSchedulesTask;

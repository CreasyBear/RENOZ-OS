'use server';

/**
 * Process Scheduled Emails Job (Trigger.dev v3)
 *
 * Polls due scheduled emails and delegates claim/send/finalize behavior to the
 * communications scheduled-email processing helper.
 */

import { logger, schedules } from '@trigger.dev/sdk/v3';
import {
  processDueScheduledEmails,
  type ProcessScheduledEmailsResult,
} from '@/server/functions/communications/_shared/scheduled-email-processing';

export const processScheduledEmailsTask = schedules.task({
  id: 'process-scheduled-emails',
  cron: '* * * * *',
  run: async (): Promise<ProcessScheduledEmailsResult> =>
    processDueScheduledEmails({ logger, limit: 50 }),
});

export const processScheduledEmailsJob = processScheduledEmailsTask;

/**
 * Payment Reminders Server Functions
 *
 * Facades only: auth + schema + delegation to reminder helpers.
 */

import { createServerFn } from '@tanstack/react-start';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { idParamQuerySchema } from '@/lib/schemas/_shared/patterns';
import {
  createReminderTemplateSchema,
  idParamSchema,
  overdueOrdersForRemindersQuerySchema,
  reminderHistoryQuerySchema,
  reminderTemplateListQuerySchema,
  sendReminderSchema,
  updateReminderTemplateSchema,
} from '@/lib/schemas';
import { readPaymentReminderHistory } from './_shared/payment-reminder-read';
import { queueManualPaymentReminder } from './_shared/payment-reminder-queue';
import { readOrdersForPaymentReminders } from './_shared/payment-reminder-selection';
import {
  createPaymentReminderTemplate,
  deletePaymentReminderTemplate,
  listPaymentReminderTemplates,
  readPaymentReminderTemplate,
  updatePaymentReminderTemplate,
} from './_shared/payment-reminder-templates';

export const createReminderTemplate = createServerFn({ method: 'POST' })
  .inputValidator(createReminderTemplateSchema)
  .handler(async ({ data }) =>
    createPaymentReminderTemplate(
      await withAuth({ permission: PERMISSIONS.settings.update }),
      data,
    ),
  );

export const updateReminderTemplate = createServerFn({ method: 'POST' })
  .inputValidator(updateReminderTemplateSchema)
  .handler(async ({ data }) =>
    updatePaymentReminderTemplate(
      await withAuth({ permission: PERMISSIONS.settings.update }),
      data,
    ),
  );

export const deleteReminderTemplate = createServerFn({ method: 'POST' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }) =>
    deletePaymentReminderTemplate(
      await withAuth({ permission: PERMISSIONS.settings.update }),
      data,
    ),
  );

export const getReminderTemplate = createServerFn({ method: 'GET' })
  .inputValidator(idParamQuerySchema)
  .handler(async ({ data }) =>
    readPaymentReminderTemplate(await withAuth(), data),
  );

export const listReminderTemplates = createServerFn({ method: 'GET' })
  .inputValidator(reminderTemplateListQuerySchema)
  .handler(async ({ data }) =>
    listPaymentReminderTemplates(await withAuth(), data),
  );

export const sendReminder = createServerFn({ method: 'POST' })
  .inputValidator(sendReminderSchema)
  .handler(async ({ data }) =>
    queueManualPaymentReminder(await withAuth(), data),
  );

export const getOrdersForReminders = createServerFn({ method: 'GET' })
  .inputValidator(overdueOrdersForRemindersQuerySchema)
  .handler(async ({ data }) =>
    readOrdersForPaymentReminders(await withAuth(), data),
  );

export const getReminderHistory = createServerFn({ method: 'GET' })
  .inputValidator(reminderHistoryQuerySchema)
  .handler(async ({ data }) =>
    readPaymentReminderHistory(await withAuth(), data),
  );

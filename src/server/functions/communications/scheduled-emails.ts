/**
 * Scheduled Emails Server Functions
 *
 * Facades only: auth + schema + delegation to scheduled email helpers.
 */

import { createServerFn } from '@tanstack/react-start';
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  cancelScheduledEmailSchema,
  getScheduledEmailByIdSchema,
  getScheduledEmailsCursorSchema,
  getScheduledEmailsSchema,
  scheduleEmailSchema,
  updateScheduledEmailSchema,
} from '@/lib/schemas/communications';
import {
  cancelScheduledEmailRecord,
  createScheduledEmail,
  markScheduledEmailAsSent,
  updateScheduledEmailRecord,
} from './_shared/scheduled-email-mutations';
import {
  getDueScheduledEmails,
  getEmailsToSend,
  readScheduledEmailById,
  readScheduledEmails,
  readScheduledEmailsCursor,
} from './_shared/scheduled-email-read';

export const scheduleEmail = createServerFn({ method: 'POST' })
  .inputValidator(scheduleEmailSchema)
  .handler(async ({ data }) =>
    createScheduledEmail(
      await withAuth({ permission: PERMISSIONS.email.create }),
      data,
    ),
  );

export const getScheduledEmails = createServerFn({ method: 'GET' })
  .inputValidator(getScheduledEmailsSchema)
  .handler(async ({ data }) =>
    readScheduledEmails(
      await withAuth({ permission: PERMISSIONS.email.read }),
      data,
    ),
  );

export const getScheduledEmailsCursor = createServerFn({ method: 'GET' })
  .inputValidator(getScheduledEmailsCursorSchema)
  .handler(async ({ data }) =>
    readScheduledEmailsCursor(
      await withAuth({ permission: PERMISSIONS.email.read }),
      data,
    ),
  );

export const getScheduledEmailById = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(getScheduledEmailByIdSchema))
  .handler(async ({ data }) =>
    readScheduledEmailById(
      await withAuth({ permission: PERMISSIONS.email.read }),
      data,
    ),
  );

export const updateScheduledEmail = createServerFn({ method: 'POST' })
  .inputValidator(updateScheduledEmailSchema)
  .handler(async ({ data }) =>
    updateScheduledEmailRecord(
      await withAuth({ permission: PERMISSIONS.email.update }),
      data,
    ),
  );

export const cancelScheduledEmail = createServerFn({ method: 'POST' })
  .inputValidator(cancelScheduledEmailSchema)
  .handler(async ({ data }) =>
    cancelScheduledEmailRecord(
      await withAuth({ permission: PERMISSIONS.email.update }),
      data,
    ),
  );

export { getDueScheduledEmails, getEmailsToSend, markScheduledEmailAsSent };

/**
 * Scheduled email mutation helpers.
 */

import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  scheduledEmails,
  type ScheduledEmailTemplateData,
  type ScheduledEmailTemplateType,
} from 'drizzle/schema/communications';
import { ConflictError, NotFoundError } from '@/lib/server/errors';
import type { SessionContext } from '@/lib/server/protected';
import {
  cancelScheduledEmailSchema,
  scheduleEmailSchema,
  updateScheduledEmailSchema,
} from '@/lib/schemas/communications';
import type { z } from 'zod';

export async function createScheduledEmail(
  ctx: SessionContext,
  data: z.infer<typeof scheduleEmailSchema>,
) {
  const [scheduled] = await db
    .insert(scheduledEmails)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      recipientEmail: data.recipientEmail,
      recipientName: data.recipientName,
      customerId: data.customerId,
      subject: data.subject,
      templateType: data.templateType as ScheduledEmailTemplateType,
      templateData: {
        ...((data.templateData || {}) as ScheduledEmailTemplateData),
        validationError: undefined,
      },
      scheduledAt: data.scheduledAt,
      timezone: data.timezone,
      status: 'pending',
      attemptCount: 0,
      lastError: null,
    })
    .returning();

  return scheduled;
}

export async function updateScheduledEmailRecord(
  ctx: SessionContext,
  data: z.infer<typeof updateScheduledEmailSchema>,
) {
  // Check if scheduled email exists
  const [existing] = await db
    .select()
    .from(scheduledEmails)
    .where(
      and(
        eq(scheduledEmails.id, data.id),
        eq(scheduledEmails.organizationId, ctx.organizationId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Scheduled email not found', 'scheduled_email');
  }

  if (existing.status !== 'pending') {
    throw new ConflictError(
      `Cannot update scheduled email with status "${existing.status}". Only pending emails can be updated.`,
    );
  }

  // M03: Add status='pending' to UPDATE WHERE to prevent updating non-pending emails
  const [updated] = await db
    .update(scheduledEmails)
    .set({
      recipientEmail: data.recipientEmail,
      recipientName: data.recipientName,
      subject: data.subject,
      templateData: {
        ...(data.templateData as ScheduledEmailTemplateData),
        validationError: undefined,
      },
      scheduledAt: data.scheduledAt,
      timezone: data.timezone,
      lastError: null,
    })
    .where(
      and(
        eq(scheduledEmails.id, data.id),
        eq(scheduledEmails.organizationId, ctx.organizationId),
        eq(scheduledEmails.status, 'pending'),
      ),
    )
    .returning();

  if (!updated) {
    throw new NotFoundError(
      'Scheduled email not found or no longer pending',
      'scheduled_email',
    );
  }

  return updated;
}

export async function cancelScheduledEmailRecord(
  ctx: SessionContext,
  data: z.infer<typeof cancelScheduledEmailSchema>,
) {
  // Check if scheduled email exists
  const [existing] = await db
    .select()
    .from(scheduledEmails)
    .where(
      and(
        eq(scheduledEmails.id, data.id),
        eq(scheduledEmails.organizationId, ctx.organizationId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Scheduled email not found', 'scheduled_email');
  }

  if (existing.status !== 'pending') {
    throw new ConflictError(
      `Cannot cancel scheduled email with status "${existing.status}". Only pending emails can be cancelled.`,
    );
  }

  // M04: Add status='pending' to UPDATE WHERE to prevent cancelling non-pending emails
  const [updated] = await db
    .update(scheduledEmails)
    .set({
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelReason: data.reason,
    })
    .where(
      and(
        eq(scheduledEmails.id, data.id),
        eq(scheduledEmails.organizationId, ctx.organizationId),
        eq(scheduledEmails.status, 'pending'),
      ),
    )
    .returning();

  if (!updated) {
    throw new NotFoundError(
      'Scheduled email not found or no longer pending',
      'scheduled_email',
    );
  }

  return updated;
}

export async function markScheduledEmailAsSent(params: {
  scheduledEmailId: string;
  emailHistoryId: string;
  organizationId: string;
}): Promise<void> {
  await db
    .update(scheduledEmails)
    .set({
      status: 'sent',
      sentAt: new Date(),
      emailHistoryId: params.emailHistoryId,
      lastError: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(scheduledEmails.id, params.scheduledEmailId),
        eq(scheduledEmails.organizationId, params.organizationId),
        eq(scheduledEmails.status, 'processing'),
      ),
    );
}

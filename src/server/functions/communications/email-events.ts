/**
 * Email Events Server Functions
 *
 * Handles email tracking webhooks and bridges to activity timeline.
 */

import { createServerFn } from '@tanstack/react-start';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { activities, emailHistory } from 'drizzle/schema';
import { withInternalAuth } from '@/lib/server/protected';
import { emailEventSchema } from '@/lib/schemas/communications';
import {
  createEmailOpenedActivity,
  createEmailClickedActivity,
} from '@/lib/server/activity-bridge';
import { NotFoundError, ValidationError } from '@/lib/server/errors';

export const handleEmailEvent = createServerFn({ method: 'POST' })
  .inputValidator(emailEventSchema)
  .handler(async ({ data }) => {
    await withInternalAuth();

    const { emailId, eventType, occurredAt, linkId, clickedUrl, bounceReason } = data;
    const eventTime = occurredAt ?? new Date();

    const [email] = await db
      .select()
      .from(emailHistory)
      .where(eq(emailHistory.id, emailId))
      .limit(1);

    if (!email) {
      throw new NotFoundError('Email not found', 'email');
    }

    // Validate organizationId from the email record for tenant isolation
    const orgId = email.organizationId;
    if (!orgId) {
      throw new ValidationError('Email record missing organizationId');
    }

    // Wrap all event processing in a transaction for atomicity
    await db.transaction(async (tx) => {
      const baseUpdate = {
        status: eventType,
      } as const;

      if (eventType === 'delivered') {
        await tx
          .update(emailHistory)
          .set({
            ...baseUpdate,
            deliveredAt: email.deliveredAt ?? eventTime,
          })
          .where(eq(emailHistory.id, emailId));
      }

      if (eventType === 'opened') {
        await tx
          .update(emailHistory)
          .set({
            ...baseUpdate,
            openedAt: email.openedAt ?? eventTime,
          })
          .where(eq(emailHistory.id, emailId));

        const existing = await tx
          .select({ id: activities.id })
          .from(activities)
          .where(and(eq(activities.sourceRef, emailId), eq(activities.action, 'email_opened')))
          .limit(1);

        if (existing.length === 0) {
          await createEmailOpenedActivity({
            emailId,
            organizationId: email.organizationId,
            customerId: email.customerId,
            subject: email.subject,
            recipientEmail: email.toAddress,
            recipientName: email.metadata?.fromName ?? null,
          });
        }
      }

      if (eventType === 'clicked') {
        if (!linkId || !clickedUrl) {
          throw new ValidationError('Clicked events require linkId and clickedUrl');
        }

        await tx
          .update(emailHistory)
          .set({
            ...baseUpdate,
            clickedAt: email.clickedAt ?? eventTime,
          })
          .where(eq(emailHistory.id, emailId));

        const existing = await tx
          .select({ id: activities.id })
          .from(activities)
          .where(
            and(
              eq(activities.sourceRef, emailId),
              eq(activities.action, 'email_clicked'),
              // NOTE: JSONB operator (->>) is PostgreSQL-specific
              // Drizzle ORM doesn't provide a direct abstraction for JSONB path queries
              // This is acceptable raw SQL for PostgreSQL-specific JSONB operations
              sql`${activities.metadata} ->> 'linkId' = ${linkId}`
            )
          )
          .limit(1);

        if (existing.length === 0) {
          await createEmailClickedActivity({
            emailId,
            organizationId: email.organizationId,
            customerId: email.customerId,
            subject: email.subject,
            recipientEmail: email.toAddress,
            recipientName: email.metadata?.fromName ?? null,
            clickedUrl,
            linkId,
          });
        }
      }

      if (eventType === 'bounced') {
        await tx
          .update(emailHistory)
          .set({
            ...baseUpdate,
            bouncedAt: email.bouncedAt ?? eventTime,
            bounceReason: bounceReason ?? email.bounceReason,
          })
          .where(eq(emailHistory.id, emailId));
      }
    });

    return { success: true };
  });

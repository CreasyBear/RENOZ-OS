/**
 * Process Resend Webhook Job
 *
 * Background job that processes Resend webhook events with full data integrity:
 * - DI-001: Idempotency via webhook_events table
 * - DI-002: Status state machine enforcement
 * - DI-003: Race condition prevention with conditional UPDATEs
 *
 * Event Types Handled:
 * - email.sent: Email accepted by Resend
 * - email.delivered: Email delivered to recipient server
 * - email.opened: Recipient opened email
 * - email.clicked: Recipient clicked link
 * - email.bounced: Email bounced (Permanent/Transient)
 * - email.complained: Recipient marked as spam
 *
 * @see _Initiation/_prd/3-integrations/resend/resend.prd.json
 * @see todos/resend-integration/004-pending-p1-webhook-idempotency.md
 * @see todos/resend-integration/005-pending-p1-status-state-machine.md
 * @see todos/resend-integration/006-pending-p1-race-condition-prevention.md
 */

import { eventTrigger } from '@trigger.dev/sdk';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { client } from '../client';
import { db } from '@/lib/db';
import {
  emailHistory,
  webhookEvents,
  type LinkClick,
  type WebhookEventPayload,
} from 'drizzle/schema';
import {
  resendWebhookEvent,
  type ResendWebhookPayload,
  type ResendWebhookEventType,
} from '@/routes/api/webhooks/resend';
import {
  addSuppressionDirect,
  trackSoftBounce,
} from '@/server/functions/communications/email-suppression';
import {
  createEmailDeliveredActivity,
  createEmailOpenedActivity,
  createEmailClickedActivity,
} from '@/lib/server/activity-bridge';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Result of processing a webhook event
 */
interface ProcessingResult {
  success: boolean;
  eventType: ResendWebhookEventType;
  emailId: string;
  duplicate?: boolean;
  wasFirstEvent?: boolean;
  error?: string;
  details?: Record<string, unknown>;
}

/**
 * Email status state machine - defines valid transitions
 * @see DI-002 in PROMPT.md
 *
 * State transitions are enforced in SQL WHERE clauses for atomicity:
 * - pending -> sent
 * - sent -> delivered, bounced
 * - delivered -> opened, bounced, complained
 * - opened -> clicked, bounced, complained
 * - bounced, complained (terminal states, no further transitions)
 *
 * The hierarchy is documented here for reference but enforcement
 * is done directly in the handleEmail* functions' SQL queries.
 */

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Note: isValidTransition helper is documented here for reference but
// validation is done directly in SQL WHERE clauses for atomicity.
// See DI-002 in PROMPT.md for state machine rules.

/**
 * Email details needed for activity creation
 */
interface EmailDetails {
  id: string;
  organizationId: string;
  customerId: string | null;
  subject: string;
  toAddress: string;
}

/**
 * Fetch email details by email history ID for activity creation
 */
async function getEmailDetails(emailHistoryId: string): Promise<EmailDetails | null> {
  const email = await db.query.emailHistory?.findFirst({
    where: eq(emailHistory.id, emailHistoryId),
    columns: {
      id: true,
      organizationId: true,
      customerId: true,
      subject: true,
      toAddress: true,
    },
  });

  return email ?? null;
}

/**
 * Check if event was already processed (idempotency)
 * @see DI-001 in PROMPT.md
 */
async function isEventProcessed(
  eventId: string,
  eventType: string
): Promise<boolean> {
  const existing = await db.query.webhookEvents?.findFirst({
    where: and(
      eq(webhookEvents.eventId, eventId),
      eq(webhookEvents.eventType, eventType)
    ),
    columns: { id: true },
  });

  return !!existing;
}

/**
 * Record that an event has been processed
 */
async function recordProcessedEvent(
  eventId: string,
  eventType: string,
  emailId: string,
  payload: WebhookEventPayload,
  result: Record<string, unknown>,
  errorMessage?: string
): Promise<void> {
  await db.insert(webhookEvents).values({
    eventId,
    eventType,
    emailId,
    payload,
    result,
    errorMessage,
  });
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handle email.sent event
 * Updates status to 'sent' and sets sentAt timestamp
 */
async function handleEmailSent(
  emailId: string
): Promise<{ updated: boolean; emailHistoryId?: string }> {
  const result = await db
    .update(emailHistory)
    .set({
      status: 'sent',
      sentAt: new Date(),
    })
    .where(
      and(
        eq(emailHistory.resendMessageId, emailId),
        // Only update if not already in a later state (DI-002)
        sql`${emailHistory.status} IN ('pending')`
      )
    )
    .returning({ id: emailHistory.id });

  return {
    updated: result.length > 0,
    emailHistoryId: result[0]?.id,
  };
}

/**
 * Handle email.delivered event
 * Updates status to 'delivered' and sets deliveredAt timestamp
 * Only updates if not already bounced/complained (state machine)
 */
async function handleEmailDelivered(
  emailId: string
): Promise<{ updated: boolean; emailHistoryId?: string }> {
  const result = await db
    .update(emailHistory)
    .set({
      status: 'delivered',
      deliveredAt: new Date(),
    })
    .where(
      and(
        eq(emailHistory.resendMessageId, emailId),
        // Only update if in valid prior state (DI-002)
        sql`${emailHistory.status} IN ('pending', 'sent')`,
        // Never overwrite bounce/complaint (DI-002)
        isNull(emailHistory.bouncedAt),
        isNull(emailHistory.complainedAt)
      )
    )
    .returning({ id: emailHistory.id });

  return {
    updated: result.length > 0,
    emailHistoryId: result[0]?.id,
  };
}

/**
 * Handle email.opened event
 * Sets openedAt ONLY if not already set (first open wins - DI-003)
 */
async function handleEmailOpened(
  emailId: string
): Promise<{ updated: boolean; wasFirstOpen: boolean; emailHistoryId?: string }> {
  // Use conditional UPDATE to prevent race conditions (DI-003)
  const result = await db
    .update(emailHistory)
    .set({
      status: 'opened',
      openedAt: new Date(),
    })
    .where(
      and(
        eq(emailHistory.resendMessageId, emailId),
        // Only set if not already opened (first open wins - DI-003)
        isNull(emailHistory.openedAt),
        // Never update if bounced/complained
        isNull(emailHistory.bouncedAt),
        isNull(emailHistory.complainedAt)
      )
    )
    .returning({ id: emailHistory.id });

  const wasFirstOpen = result.length > 0;

  return {
    updated: wasFirstOpen,
    wasFirstOpen,
    emailHistoryId: result[0]?.id,
  };
}

/**
 * Handle email.clicked event
 * Sets clickedAt ONLY if not already set (first click wins - DI-003)
 * Appends click data to linkClicks JSONB atomically
 */
async function handleEmailClicked(
  emailId: string,
  link: string | undefined,
  clickTimestamp: string | undefined
): Promise<{
  updated: boolean;
  wasFirstClick: boolean;
  emailHistoryId?: string;
}> {
  const clickData: LinkClick = {
    linkId: link ? Buffer.from(link).toString('base64').slice(0, 16) : 'unknown',
    url: link ?? 'unknown',
    clickedAt: clickTimestamp ?? new Date().toISOString(),
  };

  // Use conditional UPDATE to prevent race conditions (DI-003)
  // Set clickedAt only if not already set (first click wins)
  const result = await db
    .update(emailHistory)
    .set({
      status: 'clicked',
      clickedAt: sql`COALESCE(${emailHistory.clickedAt}, NOW())`,
      // Atomically append to linkClicks JSONB array (DI-003)
      linkClicks: sql`
        jsonb_build_object(
          'clicks',
          COALESCE(${emailHistory.linkClicks}->'clicks', '[]'::jsonb) || ${JSON.stringify(clickData)}::jsonb,
          'totalClicks',
          COALESCE((${emailHistory.linkClicks}->>'totalClicks')::int, 0) + 1,
          'uniqueLinksClicked',
          CASE
            WHEN ${emailHistory.linkClicks}->'clicks' @> ${JSON.stringify([{ url: link }])}::jsonb
            THEN COALESCE((${emailHistory.linkClicks}->>'uniqueLinksClicked')::int, 0)
            ELSE COALESCE((${emailHistory.linkClicks}->>'uniqueLinksClicked')::int, 0) + 1
          END
        )
      `,
    })
    .where(
      and(
        eq(emailHistory.resendMessageId, emailId),
        // Never update if bounced/complained
        isNull(emailHistory.bouncedAt),
        isNull(emailHistory.complainedAt)
      )
    )
    .returning({
      id: emailHistory.id,
      previousClickedAt: emailHistory.clickedAt,
    });

  const wasFirstClick = result.length > 0 && !result[0]?.previousClickedAt;

  return {
    updated: result.length > 0,
    wasFirstClick,
    emailHistoryId: result[0]?.id,
  };
}

/**
 * Handle email.bounced event
 * This is a terminal state - always sets bounce info
 */
async function handleEmailBounced(
  emailId: string,
  bounceType: 'Permanent' | 'Transient' | undefined,
  bounceMessage: string | undefined
): Promise<{ updated: boolean; emailHistoryId?: string; organizationId?: string; toAddress?: string }> {
  // Bounce is terminal state - always update (DI-002)
  const result = await db
    .update(emailHistory)
    .set({
      status: 'bounced',
      bouncedAt: new Date(),
      bounceReason: bounceMessage ?? 'Unknown bounce reason',
      bounceType: bounceType === 'Permanent' ? 'hard' : 'soft',
    })
    .where(eq(emailHistory.resendMessageId, emailId))
    .returning({
      id: emailHistory.id,
      organizationId: emailHistory.organizationId,
      toAddress: emailHistory.toAddress,
    });

  return {
    updated: result.length > 0,
    emailHistoryId: result[0]?.id,
    organizationId: result[0]?.organizationId,
    toAddress: result[0]?.toAddress,
  };
}

/**
 * Handle email.complained event (spam complaint)
 * This is a terminal state - always sets complaint info
 */
async function handleEmailComplained(
  emailId: string
): Promise<{ updated: boolean; emailHistoryId?: string; organizationId?: string; toAddress?: string }> {
  // Complaint is terminal state - always update (DI-002)
  const result = await db
    .update(emailHistory)
    .set({
      status: 'failed', // Use 'failed' as the status for complaints
      complainedAt: new Date(),
    })
    .where(eq(emailHistory.resendMessageId, emailId))
    .returning({
      id: emailHistory.id,
      organizationId: emailHistory.organizationId,
      toAddress: emailHistory.toAddress,
    });

  return {
    updated: result.length > 0,
    emailHistoryId: result[0]?.id,
    organizationId: result[0]?.organizationId,
    toAddress: result[0]?.toAddress,
  };
}

// ============================================================================
// JOB DEFINITION
// ============================================================================

/**
 * Process Resend Webhook Job
 *
 * Handles async processing of Resend webhook events with full data integrity:
 * - Idempotency check before processing
 * - State machine enforcement for status transitions
 * - Race-safe conditional updates
 */
export const processResendWebhookJob = client.defineJob({
  id: 'process-resend-webhook',
  name: 'Process Resend Webhook Event',
  version: '2.0.0', // Bumped for INT-RES-002 implementation
  trigger: eventTrigger({
    name: resendWebhookEvent,
  }),
  run: async (payload: ResendWebhookPayload, io): Promise<ProcessingResult> => {
    const { event, receivedAt } = payload;
    const { type, data } = event;
    const emailId = data.email_id;

    await io.logger.info('Processing Resend webhook event', {
      eventType: type,
      emailId,
      receivedAt,
    });

    // -------------------------------------------------------------------------
    // Step 1: Idempotency Check (DI-001)
    // -------------------------------------------------------------------------
    const alreadyProcessed = await isEventProcessed(emailId, type);

    if (alreadyProcessed) {
      await io.logger.info('Skipping duplicate event', {
        eventType: type,
        emailId,
      });

      return {
        success: true,
        eventType: type,
        emailId,
        duplicate: true,
      };
    }

    // -------------------------------------------------------------------------
    // Step 2: Process event based on type
    // -------------------------------------------------------------------------
    let result: Record<string, unknown> = {};
    let errorMessage: string | undefined;

    try {
      switch (type) {
        case 'email.sent': {
          await io.logger.info('Processing email.sent event', { emailId });
          const sentResult = await handleEmailSent(emailId);
          result = {
            updated: sentResult.updated,
            emailHistoryId: sentResult.emailHistoryId,
          };

          if (!sentResult.updated) {
            await io.logger.warn('email.sent: No matching email found or already in later state', {
              emailId,
            });
          }
          break;
        }

        case 'email.delivered': {
          await io.logger.info('Processing email.delivered event', { emailId });
          const deliveredResult = await handleEmailDelivered(emailId);
          result = {
            updated: deliveredResult.updated,
            emailHistoryId: deliveredResult.emailHistoryId,
          };

          if (!deliveredResult.updated) {
            await io.logger.warn(
              'email.delivered: No matching email found or invalid state transition',
              { emailId }
            );
          } else if (deliveredResult.emailHistoryId) {
            // INT-RES-002: Create activity record for delivery
            try {
              const emailDetails = await getEmailDetails(deliveredResult.emailHistoryId);
              if (emailDetails) {
                const activityResult = await createEmailDeliveredActivity({
                  emailId: emailDetails.id,
                  organizationId: emailDetails.organizationId,
                  customerId: emailDetails.customerId,
                  subject: emailDetails.subject,
                  recipientEmail: emailDetails.toAddress,
                  recipientName: null,
                });
                if (activityResult.success) {
                  await io.logger.info('Created delivery activity', {
                    emailId,
                    activityId: activityResult.activityId,
                  });
                  (result as Record<string, unknown>).activityId = activityResult.activityId;
                }
              }
            } catch (activityError) {
              await io.logger.error('Failed to create delivery activity', {
                emailId,
                error: activityError instanceof Error ? activityError.message : 'Unknown error',
              });
            }
          }
          break;
        }

        case 'email.opened': {
          await io.logger.info('Processing email.opened event', { emailId });
          const openedResult = await handleEmailOpened(emailId);
          result = {
            updated: openedResult.updated,
            wasFirstOpen: openedResult.wasFirstOpen,
            emailHistoryId: openedResult.emailHistoryId,
          };

          if (openedResult.wasFirstOpen && openedResult.emailHistoryId) {
            await io.logger.info('First open recorded', { emailId });
            // INT-RES-002: Create activity record for first open
            try {
              const emailDetails = await getEmailDetails(openedResult.emailHistoryId);
              if (emailDetails) {
                const activityResult = await createEmailOpenedActivity({
                  emailId: emailDetails.id,
                  organizationId: emailDetails.organizationId,
                  customerId: emailDetails.customerId,
                  subject: emailDetails.subject,
                  recipientEmail: emailDetails.toAddress,
                  recipientName: null,
                });
                if (activityResult.success) {
                  await io.logger.info('Created email opened activity', {
                    emailId,
                    activityId: activityResult.activityId,
                  });
                  (result as Record<string, unknown>).activityId = activityResult.activityId;
                }
              }
            } catch (activityError) {
              await io.logger.error('Failed to create email opened activity', {
                emailId,
                error: activityError instanceof Error ? activityError.message : 'Unknown error',
              });
            }
          }
          break;
        }

        case 'email.clicked': {
          const link = data.click?.link;
          const timestamp = data.click?.timestamp;

          await io.logger.info('Processing email.clicked event', {
            emailId,
            link,
          });

          const clickedResult = await handleEmailClicked(
            emailId,
            link,
            timestamp
          );
          result = {
            updated: clickedResult.updated,
            wasFirstClick: clickedResult.wasFirstClick,
            emailHistoryId: clickedResult.emailHistoryId,
            link,
          };

          if (clickedResult.wasFirstClick && clickedResult.emailHistoryId) {
            await io.logger.info('First click recorded', { emailId, link });
            // INT-RES-002: Create activity record for first click
            try {
              const emailDetails = await getEmailDetails(clickedResult.emailHistoryId);
              if (emailDetails) {
                const activityResult = await createEmailClickedActivity({
                  emailId: emailDetails.id,
                  organizationId: emailDetails.organizationId,
                  customerId: emailDetails.customerId,
                  subject: emailDetails.subject,
                  recipientEmail: emailDetails.toAddress,
                  recipientName: null,
                  clickedUrl: link ?? 'unknown',
                  linkId: link ? Buffer.from(link).toString('base64').slice(0, 16) : 'unknown',
                });
                if (activityResult.success) {
                  await io.logger.info('Created email clicked activity', {
                    emailId,
                    link,
                    activityId: activityResult.activityId,
                  });
                  (result as Record<string, unknown>).activityId = activityResult.activityId;
                }
              }
            } catch (activityError) {
              await io.logger.error('Failed to create email clicked activity', {
                emailId,
                error: activityError instanceof Error ? activityError.message : 'Unknown error',
              });
            }
          }
          break;
        }

        case 'email.bounced': {
          const bounceType = data.bounce?.type;
          const bounceMessage = data.bounce?.message;

          await io.logger.warn('Processing email.bounced event', {
            emailId,
            bounceType,
            bounceMessage,
          });

          const bouncedResult = await handleEmailBounced(
            emailId,
            bounceType,
            bounceMessage
          );
          result = {
            updated: bouncedResult.updated,
            emailHistoryId: bouncedResult.emailHistoryId,
            bounceType,
            isHardBounce: bounceType === 'Permanent',
          };

          // INT-RES-004: Auto-add hard bounces to suppression list immediately
          if (
            bouncedResult.updated &&
            bounceType === 'Permanent' &&
            bouncedResult.toAddress &&
            bouncedResult.organizationId
          ) {
            try {
              const suppressionResult = await addSuppressionDirect({
                organizationId: bouncedResult.organizationId,
                email: bouncedResult.toAddress,
                reason: 'bounce',
                bounceType: 'hard',
                source: 'webhook',
                resendEventId: emailId,
                metadata: {
                  bounceMessage: bounceMessage ?? undefined,
                },
              });

              await io.logger.info('Added email to suppression list for hard bounce', {
                emailId,
                toAddress: bouncedResult.toAddress,
                suppressionId: suppressionResult.id,
                isNew: suppressionResult.isNew,
              });

              (result as Record<string, unknown>).suppressionAdded = true;
              (result as Record<string, unknown>).suppressionId = suppressionResult.id;
            } catch (suppressionError) {
              await io.logger.error('Failed to add email to suppression list', {
                emailId,
                toAddress: bouncedResult.toAddress,
                error:
                  suppressionError instanceof Error
                    ? suppressionError.message
                    : 'Unknown error',
              });
            }
          }

          // INT-RES-004: Track soft bounces with 3-strike rule
          if (
            bouncedResult.updated &&
            bounceType === 'Transient' &&
            bouncedResult.toAddress &&
            bouncedResult.organizationId
          ) {
            try {
              const softBounceResult = await trackSoftBounce({
                organizationId: bouncedResult.organizationId,
                email: bouncedResult.toAddress,
                resendEventId: emailId,
                metadata: {
                  bounceMessage: bounceMessage ?? undefined,
                },
              });

              await io.logger.info('Tracked soft bounce', {
                emailId,
                toAddress: bouncedResult.toAddress,
                suppressionId: softBounceResult.id,
                bounceCount: softBounceResult.bounceCount,
                suppressed: softBounceResult.suppressed,
                isNewRecord: softBounceResult.isNew,
              });

              (result as Record<string, unknown>).softBounceTracked = true;
              (result as Record<string, unknown>).bounceCount = softBounceResult.bounceCount;
              (result as Record<string, unknown>).suppressionTriggered = softBounceResult.suppressed;

              if (softBounceResult.suppressed) {
                await io.logger.warn('Email auto-suppressed after 3 soft bounces', {
                  emailId,
                  toAddress: bouncedResult.toAddress,
                  bounceCount: softBounceResult.bounceCount,
                });
              }
            } catch (softBounceError) {
              await io.logger.error('Failed to track soft bounce', {
                emailId,
                toAddress: bouncedResult.toAddress,
                error:
                  softBounceError instanceof Error
                    ? softBounceError.message
                    : 'Unknown error',
              });
            }
          }
          break;
        }

        case 'email.complained': {
          await io.logger.warn('Processing email.complained (spam) event', {
            emailId,
          });

          const complainedResult = await handleEmailComplained(emailId);
          result = {
            updated: complainedResult.updated,
            emailHistoryId: complainedResult.emailHistoryId,
          };

          // INT-RES-004: Immediately add complaints to suppression list
          if (
            complainedResult.updated &&
            complainedResult.toAddress &&
            complainedResult.organizationId
          ) {
            try {
              const suppressionResult = await addSuppressionDirect({
                organizationId: complainedResult.organizationId,
                email: complainedResult.toAddress,
                reason: 'complaint',
                source: 'webhook',
                resendEventId: emailId,
              });

              await io.logger.info('Added email to suppression list for spam complaint', {
                emailId,
                toAddress: complainedResult.toAddress,
                suppressionId: suppressionResult.id,
                isNew: suppressionResult.isNew,
              });

              (result as Record<string, unknown>).suppressionAdded = true;
              (result as Record<string, unknown>).suppressionId = suppressionResult.id;
            } catch (suppressionError) {
              await io.logger.error('Failed to add email to suppression list', {
                emailId,
                toAddress: complainedResult.toAddress,
                error:
                  suppressionError instanceof Error
                    ? suppressionError.message
                    : 'Unknown error',
              });
            }
          }
          break;
        }

        default: {
          await io.logger.warn('Unknown event type received', {
            eventType: type,
            emailId,
          });
          errorMessage = `Unknown event type: ${type}`;
          result = { unknownType: true };
        }
      }
    } catch (error) {
      errorMessage =
        error instanceof Error ? error.message : 'Unknown processing error';
      await io.logger.error('Error processing webhook event', {
        eventType: type,
        emailId,
        error: errorMessage,
      });
      result = { processingError: true, error: errorMessage };
    }

    // -------------------------------------------------------------------------
    // Step 3: Record processed event for idempotency (DI-001)
    // -------------------------------------------------------------------------
    try {
      // Convert event to WebhookEventPayload format for storage
      const payloadToStore: WebhookEventPayload = {
        type: event.type,
        created_at: event.created_at,
        data: {
          email_id: event.data.email_id,
          from: event.data.from,
          to: event.data.to,
          subject: event.data.subject,
          bounce: event.data.bounce
            ? { type: event.data.bounce.type, message: event.data.bounce.message }
            : undefined,
          click: event.data.click
            ? { link: event.data.click.link, timestamp: event.data.click.timestamp }
            : undefined,
        },
      };

      await recordProcessedEvent(
        emailId,
        type,
        emailId,
        payloadToStore,
        result,
        errorMessage
      );
    } catch (recordError) {
      // Log but don't fail - the main processing succeeded
      await io.logger.error('Failed to record processed event', {
        emailId,
        eventType: type,
        error:
          recordError instanceof Error ? recordError.message : 'Unknown error',
      });
    }

    // -------------------------------------------------------------------------
    // Step 4: Return result
    // -------------------------------------------------------------------------
    return {
      success: !errorMessage,
      eventType: type,
      emailId,
      wasFirstEvent: (result as { wasFirstOpen?: boolean; wasFirstClick?: boolean })
        .wasFirstOpen || (result as { wasFirstClick?: boolean }).wasFirstClick,
      error: errorMessage,
      details: result,
    };
  },
});

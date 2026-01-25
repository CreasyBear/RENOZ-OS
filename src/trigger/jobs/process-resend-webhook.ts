/**
 * Process Resend Webhook Job
 *
 * Background job that processes Resend webhook events.
 * Dispatched from the /api/webhooks/resend endpoint after signature verification.
 *
 * Event Types Handled:
 * - email.sent: Email accepted by Resend
 * - email.delivered: Email delivered to recipient server
 * - email.opened: Recipient opened email
 * - email.clicked: Recipient clicked link
 * - email.bounced: Email bounced (Permanent/Transient)
 * - email.complained: Recipient marked as spam
 *
 * Implementation Note:
 * This is a placeholder job for INT-RES-001. Full processing logic will be
 * implemented in INT-RES-002 (Webhook Event Processing).
 *
 * @see _Initiation/_prd/3-integrations/resend/resend.prd.json
 */

import { eventTrigger } from '@trigger.dev/sdk';
import { client } from '../client';
import {
  resendWebhookEvent,
  type ResendWebhookPayload,
} from '@/routes/api/webhooks/resend';

// ============================================================================
// JOB DEFINITION
// ============================================================================

/**
 * Process Resend Webhook Job
 *
 * Handles async processing of Resend webhook events.
 * This job is triggered by the webhook endpoint after signature verification.
 */
export const processResendWebhookJob = client.defineJob({
  id: 'process-resend-webhook',
  name: 'Process Resend Webhook Event',
  version: '1.0.0',
  trigger: eventTrigger({
    name: resendWebhookEvent,
  }),
  run: async (payload: ResendWebhookPayload, io) => {
    const { event, receivedAt } = payload;
    const { type, data } = event;

    await io.logger.info('Processing Resend webhook event', {
      eventType: type,
      emailId: data.email_id,
      receivedAt,
    });

    // -------------------------------------------------------------------------
    // Route to appropriate handler based on event type
    // -------------------------------------------------------------------------
    switch (type) {
      case 'email.sent':
        await io.logger.info('Email sent event received', {
          emailId: data.email_id,
          to: data.to,
          subject: data.subject,
        });
        // TODO (INT-RES-002): Update email_history.status to 'sent'
        // TODO (INT-RES-002): Set email_history.sentAt timestamp
        return {
          success: true,
          eventType: 'email.sent' as const,
          emailId: data.email_id,
          processed: false, // Will be true after INT-RES-002
        };

      case 'email.delivered':
        await io.logger.info('Email delivered event received', {
          emailId: data.email_id,
          to: data.to,
        });
        // TODO (INT-RES-002): Update email_history.status to 'delivered'
        // TODO (INT-RES-002): Set email_history.deliveredAt timestamp
        // TODO (INT-RES-002): Create activity record
        return {
          success: true,
          eventType: 'email.delivered' as const,
          emailId: data.email_id,
          processed: false,
        };

      case 'email.opened':
        await io.logger.info('Email opened event received', {
          emailId: data.email_id,
          to: data.to,
        });
        // TODO (INT-RES-002): Update email_history.openedAt (only if null - first open)
        // TODO (INT-RES-002): Increment open count
        // TODO (INT-RES-002): Create activity record
        return {
          success: true,
          eventType: 'email.opened' as const,
          emailId: data.email_id,
          processed: false,
        };

      case 'email.clicked':
        await io.logger.info('Email clicked event received', {
          emailId: data.email_id,
          to: data.to,
          link: data.click?.link,
        });
        // TODO (INT-RES-002): Update email_history.clickedAt (only if null - first click)
        // TODO (INT-RES-002): Record click details (link, timestamp)
        // TODO (INT-RES-002): Create activity record
        return {
          success: true,
          eventType: 'email.clicked' as const,
          emailId: data.email_id,
          link: data.click?.link,
          processed: false,
        };

      case 'email.bounced': {
        const bounceType = data.bounce?.type;
        const bounceMessage = data.bounce?.message;
        await io.logger.warn('Email bounced event received', {
          emailId: data.email_id,
          to: data.to,
          bounceType,
          bounceMessage,
        });
        // TODO (INT-RES-002): Update email_history.bouncedAt
        // TODO (INT-RES-002): Set email_history.bounceReason
        // TODO (INT-RES-002): Set email_history.bounceType (hard/soft based on Permanent/Transient)
        // TODO (INT-RES-004): Auto-suppress on hard bounce
        return {
          success: true,
          eventType: 'email.bounced' as const,
          emailId: data.email_id,
          bounceType,
          bounceMessage,
          processed: false,
        };
      }

      case 'email.complained':
        await io.logger.warn('Email complained (spam) event received', {
          emailId: data.email_id,
          to: data.to,
        });
        // TODO (INT-RES-002): Update email_history.status to 'complained'
        // TODO (INT-RES-004): Immediately suppress email address with reason=complaint
        return {
          success: true,
          eventType: 'email.complained' as const,
          emailId: data.email_id,
          processed: false,
        };

      default:
        await io.logger.warn('Unknown event type received', {
          eventType: type,
          emailId: data.email_id,
        });
        return { success: false, reason: 'unknown_event_type' };
    }
  },
});

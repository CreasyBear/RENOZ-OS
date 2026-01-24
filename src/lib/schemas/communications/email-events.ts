/**
 * Email Events Schemas
 *
 * Validation schemas for email tracking webhooks.
 */

import { z } from 'zod';
import { idSchema } from '../_shared/patterns';

export const emailEventTypeSchema = z.enum(['delivered', 'opened', 'clicked', 'bounced']);

export const emailEventSchema = z.object({
  emailId: idSchema,
  eventType: emailEventTypeSchema,
  occurredAt: z.coerce.date().optional(),
  linkId: z.string().max(100).optional(),
  clickedUrl: z.string().url().optional(),
  bounceReason: z.string().max(500).optional(),
});

export type EmailEventInput = z.infer<typeof emailEventSchema>;

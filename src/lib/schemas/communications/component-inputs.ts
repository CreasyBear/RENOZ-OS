/**
 * Component-Level Input Schemas
 *
 * Validation schemas for UI component inputs before mapping to API format.
 * These schemas validate data from presenters/forms before transformation.
 *
 * @see src/components/domain/customers/containers/communications-container.tsx
 */

import { z } from 'zod';

// ============================================================================
// TEMPLATE INPUT SCHEMA
// ============================================================================

/**
 * Component-level template input schema
 * Validates template data from UI components before mapping to API format
 */
export const templateInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Template name is required').max(200, 'Name cannot exceed 200 characters'),
  category: z.enum(['welcome', 'follow_up', 'complaint_resolution', 'upsell', 'reactivation', 'general'], {
    message: 'Please select a valid category',
  }),
  type: z.enum(['email', 'sms', 'note']).optional().default('email'),
  subject: z.string().max(500, 'Subject cannot exceed 500 characters').optional(),
  body: z.string().min(1, 'Template body is required'),
  variables: z.array(z.string()).default([]),
  isActive: z.boolean().optional().default(true),
});

export type TemplateInput = z.infer<typeof templateInputSchema>;

// ============================================================================
// CAMPAIGN INPUT SCHEMA
// ============================================================================

/**
 * Component-level campaign input schema
 * Validates campaign data from UI components before mapping to API format
 */
export const campaignInputSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(200, 'Name cannot exceed 200 characters'),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
  audienceType: z.enum(['segment', 'filter', 'all']).optional().default('all'),
  templateId: z.string().uuid().optional(),
  scheduleType: z.enum(['now', 'scheduled']).optional().default('now'),
  scheduledAt: z.string().datetime().optional(),
});

export type CampaignInput = z.infer<typeof campaignInputSchema>;

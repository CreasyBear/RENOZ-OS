/**
 * Opportunity Detail Extended Schemas
 *
 * Schemas for opportunity alerts and active items used in the detail view.
 * These support the 5-zone layout pattern from DETAIL-VIEW-STANDARDS.md.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see docs/design-system/DETAIL-VIEW-MIGRATION.md
 */

import { z } from 'zod';
import { opportunityActivityTypeSchema } from './pipeline';

// ============================================================================
// ALERT TYPES
// ============================================================================

/**
 * Alert types that can surface in Zone 3 of the opportunity detail view.
 *
 * - expired_quote: Quote has passed its expiration date
 * - expiring_quote: Quote will expire within warning threshold (7 days)
 * - overdue_followup: Scheduled follow-up date has passed
 * - stale_deal: No activity logged in threshold period (14 days)
 * - approaching_close: Expected close date is within warning threshold (7 days)
 */
export const opportunityAlertTypeSchema = z.enum([
  'expired_quote',
  'expiring_quote',
  'overdue_followup',
  'stale_deal',
  'approaching_close',
]);

export type OpportunityAlertType = z.infer<typeof opportunityAlertTypeSchema>;

/**
 * Alert severity levels for visual styling.
 * - critical: Red - requires immediate action
 * - warning: Amber - needs attention soon
 * - info: Blue - informational reminder
 *
 * Note: Using opportunityAlertSeveritySchema to avoid name collision with
 * customers/customer-detail-extended.ts AlertSeverity export.
 */
export const opportunityAlertSeveritySchema = z.enum(['critical', 'warning', 'info']);

export type OpportunityAlertSeverity = z.infer<typeof opportunityAlertSeveritySchema>;

/**
 * Individual alert with actionable information.
 */
export const opportunityAlertSchema = z.object({
  id: z.string(), // Unique ID for this alert instance
  type: opportunityAlertTypeSchema,
  severity: opportunityAlertSeveritySchema,
  title: z.string(), // Short title (e.g., "Quote Expired")
  message: z.string(), // Descriptive message (e.g., "Quote expired 3 days ago")
  actionLabel: z.string().optional(), // Button label (e.g., "Extend Quote")
  actionType: z.string().optional(), // Action identifier for handler
  metadata: z.record(z.string(), z.any()).optional(), // Additional data (e.g., { daysOverdue: 3 })
  dismissable: z.boolean().default(true),
  createdAt: z.coerce.date(),
});

export type OpportunityAlert = z.infer<typeof opportunityAlertSchema>;

/**
 * Response from getOpportunityAlerts server function.
 */
export const opportunityAlertsResponseSchema = z.object({
  opportunityId: z.string().uuid(),
  hasAlerts: z.boolean(),
  alerts: z.array(opportunityAlertSchema),
  counts: z.object({
    critical: z.number(),
    warning: z.number(),
    info: z.number(),
    total: z.number(),
  }),
});

export type OpportunityAlertsResponse = z.infer<typeof opportunityAlertsResponseSchema>;

// ============================================================================
// ACTIVE ITEMS TYPES
// ============================================================================

/**
 * Pending activity that hasn't been completed.
 */
export const pendingActivitySchema = z.object({
  id: z.string().uuid(),
  type: opportunityActivityTypeSchema,
  description: z.string(),
  scheduledAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  createdByName: z.string().nullable(),
  isOverdue: z.boolean(),
  daysUntilDue: z.number().nullable(), // Negative if overdue
});

export type PendingActivity = z.infer<typeof pendingActivitySchema>;

/**
 * Recent quote version for quick reference.
 */
export const recentQuoteVersionSchema = z.object({
  id: z.string().uuid(),
  versionNumber: z.number(),
  total: z.number(),
  itemCount: z.number(),
  createdAt: z.coerce.date(),
  createdByName: z.string().nullable(),
});

export type RecentQuoteVersion = z.infer<typeof recentQuoteVersionSchema>;

/**
 * Active items data for the opportunity detail view.
 * Surfaces pending work and recent history in the Overview tab.
 */
export const opportunityActiveItemsSchema = z.object({
  opportunityId: z.string().uuid(),

  // Pending activities (not completed)
  pendingActivities: z.array(pendingActivitySchema),

  // Scheduled follow-ups (future scheduledAt)
  scheduledFollowUps: z.array(pendingActivitySchema),

  // Recent quote versions (last 3)
  recentQuoteVersions: z.array(recentQuoteVersionSchema),

  // Counts for UI badges
  counts: z.object({
    pendingActivities: z.number(),
    scheduledFollowUps: z.number(),
    overdueFollowUps: z.number(),
    quoteVersions: z.number(),
  }),

  // Last activity timestamp for staleness check
  lastActivityAt: z.coerce.date().nullable(),
  daysSinceLastActivity: z.number().nullable(),
});

export type OpportunityActiveItems = z.infer<typeof opportunityActiveItemsSchema>;

// ============================================================================
// QUERY PARAMS
// ============================================================================

export const opportunityAlertsQuerySchema = z.object({
  opportunityId: z.string().uuid(),
  // Thresholds can be customized per request
  quoteExpiryWarningDays: z.number().int().positive().default(7),
  stalenessDays: z.number().int().positive().default(14),
  closeWarningDays: z.number().int().positive().default(7),
});

export type OpportunityAlertsQuery = z.infer<typeof opportunityAlertsQuerySchema>;

export const opportunityActiveItemsQuerySchema = z.object({
  opportunityId: z.string().uuid(),
  // Limits for each category
  pendingActivitiesLimit: z.number().int().positive().default(5),
  quoteVersionsLimit: z.number().int().positive().default(3),
});

export type OpportunityActiveItemsQuery = z.infer<typeof opportunityActiveItemsQuerySchema>;

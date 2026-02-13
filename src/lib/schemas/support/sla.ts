/**
 * SLA Validation Schemas
 *
 * Zod schemas for SLA configuration, tracking, and operations.
 *
 * @see drizzle/schema/support/sla-configurations.ts
 * @see _Initiation/_prd/_meta/remediation-sla-engine.md
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const slaDomainSchema = z.enum(['support', 'warranty', 'jobs']);
export type SlaDomain = z.infer<typeof slaDomainSchema>;

export const slaTargetUnitSchema = z.enum([
  'minutes',
  'hours',
  'business_hours',
  'days',
  'business_days',
]);
export type SlaTargetUnit = z.infer<typeof slaTargetUnitSchema>;

export const slaTrackingStatusSchema = z.enum([
  'active',
  'paused',
  'responded',
  'resolved',
  'breached',
]);
export type SlaTrackingStatus = z.infer<typeof slaTrackingStatusSchema>;

export const slaEventTypeSchema = z.enum([
  'started',
  'paused',
  'resumed',
  'response_due_warning',
  'response_breached',
  'responded',
  'resolution_due_warning',
  'resolution_breached',
  'resolved',
  'escalated',
  'config_changed',
]);
export type SlaEventType = z.infer<typeof slaEventTypeSchema>;

// ============================================================================
// BUSINESS HOURS
// ============================================================================

export const slaDayScheduleSchema = z
  .object({
    start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
    end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  })
  .refine(
    (data) => {
      const [startH, startM] = data.start.split(':').map(Number);
      const [endH, endM] = data.end.split(':').map(Number);
      return startH * 60 + startM < endH * 60 + endM;
    },
    { message: 'End time must be after start time' }
  );

export const slaWeeklyScheduleSchema = z.object({
  monday: slaDayScheduleSchema.nullable().optional(),
  tuesday: slaDayScheduleSchema.nullable().optional(),
  wednesday: slaDayScheduleSchema.nullable().optional(),
  thursday: slaDayScheduleSchema.nullable().optional(),
  friday: slaDayScheduleSchema.nullable().optional(),
  saturday: slaDayScheduleSchema.nullable().optional(),
  sunday: slaDayScheduleSchema.nullable().optional(),
});

export const slaCreateBusinessHoursSchema = z.object({
  name: z.string().min(1).max(100).default('Standard Hours'),
  weeklySchedule: slaWeeklyScheduleSchema,
  timezone: z.string().min(1).max(50).default('Australia/Sydney'),
  isDefault: z.boolean().default(true),
});

export const slaUpdateBusinessHoursSchema = slaCreateBusinessHoursSchema.partial();

// ============================================================================
// ORGANIZATION HOLIDAYS
// ============================================================================

export const slaCreateHolidaySchema = z.object({
  name: z.string().min(1).max(255),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  isRecurring: z.boolean().default(false),
  description: z.string().max(500).nullable().optional(),
});

export const slaUpdateHolidaySchema = slaCreateHolidaySchema.partial();

// ============================================================================
// SLA CONFIGURATION
// ============================================================================

// Base schema without refinements (can be used with .omit())
export const baseSlaConfigurationSchema = z.object({
  domain: slaDomainSchema,
  name: z.string().min(1).max(255),
  description: z.string().max(1000).nullable().optional(),
  responseTargetValue: z.number().int().positive().nullable().optional(),
  responseTargetUnit: slaTargetUnitSchema.nullable().optional(),
  resolutionTargetValue: z.number().int().positive().nullable().optional(),
  resolutionTargetUnit: slaTargetUnitSchema.nullable().optional(),
  atRiskThresholdPercent: z.number().int().min(1).max(99).default(25),
  escalateOnBreach: z.boolean().default(false),
  escalateToUserId: z.string().uuid().nullable().optional(),
  businessHoursConfigId: z.string().uuid().nullable().optional(),
  isDefault: z.boolean().default(false),
  priorityOrder: z.number().int().default(100),
  isActive: z.boolean().default(true),
});

// Full schema with refinements
export const createSlaConfigurationSchema = baseSlaConfigurationSchema
  .refine(
    (data) => {
      // If response target value is set, unit must be set too
      if (data.responseTargetValue && !data.responseTargetUnit) {
        return false;
      }
      if (!data.responseTargetValue && data.responseTargetUnit) {
        return false;
      }
      return true;
    },
    { message: 'Response target value and unit must both be set or both be null' }
  )
  .refine(
    (data) => {
      // If resolution target value is set, unit must be set too
      if (data.resolutionTargetValue && !data.resolutionTargetUnit) {
        return false;
      }
      if (!data.resolutionTargetValue && data.resolutionTargetUnit) {
        return false;
      }
      return true;
    },
    { message: 'Resolution target value and unit must both be set or both be null' }
  );

// Update schema - can use .omit() on base schema since it has no refinements
export const updateSlaConfigurationSchema = baseSlaConfigurationSchema
  .omit({ domain: true })
  .partial();

// ============================================================================
// SLA TRACKING OPERATIONS
// ============================================================================

export const startSlaTrackingSchema = z.object({
  domain: slaDomainSchema,
  entityType: z.string().min(1).max(50),
  entityId: z.string().uuid(),
  configurationId: z.string().uuid(),
  startedAt: z.date().optional(),
});

export const pauseSlaSchema = z.object({
  trackingId: z.string().uuid(),
  reason: z.string().min(1).max(255),
});

export const resumeSlaSchema = z.object({
  trackingId: z.string().uuid(),
});

export const recordResponseSchema = z.object({
  trackingId: z.string().uuid(),
  respondedAt: z.date().optional(),
});

export const recordResolutionSchema = z.object({
  trackingId: z.string().uuid(),
  resolvedAt: z.date().optional(),
});

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const getSlaConfigurationsSchema = z.object({
  domain: slaDomainSchema.optional(),
  isActive: z.boolean().optional(),
  includeDefaults: z.boolean().default(true),
});

export const getSlaTrackingSchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  status: slaTrackingStatusSchema.optional(),
  includeBreached: z.boolean().default(true),
});

export const getSlaTrackingByIdSchema = z.object({
  trackingId: z.string().uuid(),
});

// ============================================================================
// UI / COMPONENT TYPES (per SCHEMA-TRACE.md)
// ============================================================================

export type SlaStatusType =
  | 'on_track'
  | 'at_risk'
  | 'breached'
  | 'paused'
  | 'resolved'
  | 'responded';

export interface SlaBadgeProps {
  status: SlaStatusType;
  label?: string;
  showIcon?: boolean;
  className?: string;
  size?: 'sm' | 'default';
}

export interface SlaStatusData {
  status: string;
  isPaused: boolean;
  responseBreached: boolean;
  resolutionBreached: boolean;
  responseDueAt: Date | null;
  resolutionDueAt: Date | null;
  respondedAt?: Date | null;
  resolvedAt?: Date | null;
  isResponseAtRisk: boolean;
  isResolutionAtRisk: boolean;
  responseTimeRemaining: number | null;
  resolutionTimeRemaining: number | null;
  responsePercentComplete: number | null;
  resolutionPercentComplete: number | null;
  responseTimeElapsed?: number | null;
  resolutionTimeElapsed?: number | null;
  configurationName?: string;
}

export interface SlaReportRow {
  issueType: string;
  total: number;
  responseBreached: number;
  resolutionBreached: number;
  resolved: number;
  responseBreachRate: number;
  resolutionBreachRate: number;
  avgResponseTimeSeconds: number | null;
  avgResolutionTimeSeconds: number | null;
}

export interface SlaMetricsData {
  total: number;
  responseBreached: number;
  resolutionBreached: number;
  currentlyPaused: number;
  resolved: number;
  responseBreachRate: number;
  resolutionBreachRate: number;
  avgResponseTimeSeconds: number | null;
  avgResolutionTimeSeconds: number | null;
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type SlaCreateBusinessHoursInput = z.infer<typeof slaCreateBusinessHoursSchema>;
export type SlaUpdateBusinessHoursInput = z.infer<typeof slaUpdateBusinessHoursSchema>;
export type SlaCreateHolidayInput = z.infer<typeof slaCreateHolidaySchema>;
export type SlaUpdateHolidayInput = z.infer<typeof slaUpdateHolidaySchema>;
export type CreateSlaConfigurationInput = z.infer<typeof createSlaConfigurationSchema>;
export type UpdateSlaConfigurationInput = z.infer<typeof updateSlaConfigurationSchema>;
export type StartSlaTrackingInput = z.infer<typeof startSlaTrackingSchema>;
export type PauseSlaInput = z.infer<typeof pauseSlaSchema>;
export type ResumeSlaInput = z.infer<typeof resumeSlaSchema>;
export type RecordResponseInput = z.infer<typeof recordResponseSchema>;
export type RecordResolutionInput = z.infer<typeof recordResolutionSchema>;

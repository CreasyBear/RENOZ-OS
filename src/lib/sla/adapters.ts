/**
 * SLA Engine Adapters
 *
 * Type-safe adapters for Drizzle schema rows to SLA engine types.
 * Drizzle $inferSelect types are structurally compatible with engine interfaces;
 * these adapters provide explicit typing for use with computeStateSnapshot,
 * buildStartedEventData, etc. without `as any`.
 *
 * @see lib/sla/types.ts - SlaTracking, SlaConfiguration, WeeklySchedule
 */

import type {
  SlaTracking,
  SlaConfiguration,
  BusinessHoursConfig,
  WeeklySchedule,
} from './types';

/** Drizzle slaTracking row - compatible with SlaTracking */
export type SlaTrackingRow = {
  id: string;
  organizationId: string;
  domain: string;
  entityType: string;
  entityId: string;
  slaConfigurationId: string;
  startedAt: Date;
  responseDueAt: Date | null;
  respondedAt: Date | null;
  responseBreached: boolean;
  resolutionDueAt: Date | null;
  resolvedAt: Date | null;
  resolutionBreached: boolean;
  isPaused: boolean;
  pausedAt: Date | null;
  pauseReason: string | null;
  totalPausedDurationSeconds: number;
  status: string;
  responseTimeSeconds: number | null;
  resolutionTimeSeconds: number | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Drizzle slaConfigurations row - compatible with SlaConfiguration */
export type SlaConfigurationRow = {
  id: string;
  organizationId: string;
  domain: string;
  name: string;
  description: string | null;
  responseTargetValue: number | null;
  responseTargetUnit: string | null;
  resolutionTargetValue: number | null;
  resolutionTargetUnit: string | null;
  atRiskThresholdPercent: number;
  escalateOnBreach: boolean;
  escalateToUserId: string | null;
  businessHoursConfigId: string | null;
  isDefault: boolean;
  priorityOrder: number;
  isActive: boolean;
};

/**
 * Adapt Drizzle SLA tracking row to engine SlaTracking type.
 * Use when passing to computeStateSnapshot, buildStartedEventData, etc.
 */
export function toSlaTracking(row: SlaTrackingRow): SlaTracking {
  return row as SlaTracking;
}

/**
 * Adapt Drizzle SLA configuration row to engine SlaConfiguration type.
 */
export function toSlaConfiguration(row: SlaConfigurationRow): SlaConfiguration {
  return row as SlaConfiguration;
}

/**
 * Adapt business hours weekly schedule for use with SLA calculator.
 * Drizzle jsonb may infer as unknown; this asserts the expected shape.
 */
export function toWeeklySchedule(schedule: unknown): WeeklySchedule {
  return schedule as WeeklySchedule;
}

/**
 * Build BusinessHoursConfig from Drizzle business hours row.
 */
export function toBusinessHoursConfig(row: {
  id: string;
  organizationId: string;
  name: string;
  weeklySchedule: unknown;
  timezone: string;
  isDefault: boolean;
}): BusinessHoursConfig {
  return {
    ...row,
    weeklySchedule: toWeeklySchedule(row.weeklySchedule),
  };
}

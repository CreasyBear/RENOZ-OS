/**
 * SLA Engine Types
 *
 * Unified SLA calculation types for Support, Warranty, and Jobs domains.
 * Part of PRD-2 remediation to consolidate divergent SLA implementations.
 *
 * @see _Initiation/_prd/_meta/remediation-sla-engine.md
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type SlaDomain = "support" | "warranty" | "jobs";

export type SlaTargetUnit =
  | "minutes"
  | "hours"
  | "business_hours"
  | "days"
  | "business_days";

export type SlaStatus =
  | "active"
  | "paused"
  | "responded"
  | "resolved"
  | "breached";

export type SlaEventType =
  | "started"
  | "paused"
  | "resumed"
  | "response_due_warning"
  | "response_breached"
  | "responded"
  | "resolution_due_warning"
  | "resolution_breached"
  | "resolved"
  | "escalated"
  | "config_changed";

// ============================================================================
// CONFIGURATION INTERFACES
// ============================================================================

/**
 * SLA Configuration
 * Defines response/resolution targets for a domain
 */
export interface SlaConfiguration {
  id: string;
  organizationId: string;
  domain: SlaDomain;
  name: string;

  // Response time target (e.g., 4 hours, 24 business hours)
  responseTargetValue: number | null;
  responseTargetUnit: SlaTargetUnit | null;

  // Resolution time target (e.g., 5 business days)
  resolutionTargetValue: number | null;
  resolutionTargetUnit: SlaTargetUnit | null;

  // Warning threshold (percentage of time remaining)
  atRiskThresholdPercent: number;

  // Escalation settings
  escalateOnBreach: boolean;
  escalateToUserId: string | null;

  // Business hours config reference
  businessHoursConfigId: string | null;

  // Priority and state
  isDefault: boolean;
  priorityOrder: number;
  isActive: boolean;
}

/**
 * Business Hours Configuration
 * Defines working hours per day for an organization
 */
export interface BusinessHoursConfig {
  id: string;
  organizationId: string;
  weeklySchedule: WeeklySchedule;
  timezone: string;
  isDefault: boolean;
}

export interface WeeklySchedule {
  monday?: DaySchedule | null;
  tuesday?: DaySchedule | null;
  wednesday?: DaySchedule | null;
  thursday?: DaySchedule | null;
  friday?: DaySchedule | null;
  saturday?: DaySchedule | null;
  sunday?: DaySchedule | null;
}

export interface DaySchedule {
  start: string; // "09:00" (HH:mm format)
  end: string; // "17:00" (HH:mm format)
}

/**
 * Organization Holiday
 * Excluded from business hours calculations
 */
export interface OrganizationHoliday {
  id: string;
  organizationId: string;
  name: string;
  date: Date;
  isRecurring: boolean;
}

// ============================================================================
// TRACKING INTERFACES
// ============================================================================

/**
 * SLA Tracking Record
 * Tracks SLA state for a specific entity (issue, claim, job)
 */
export interface SlaTracking {
  id: string;
  organizationId: string;
  domain: SlaDomain;
  entityType: string; // 'issue', 'warranty_claim', 'job_assignment'
  entityId: string;
  slaConfigurationId: string;

  // Timing
  startedAt: Date;

  // Response tracking
  responseDueAt: Date | null;
  respondedAt: Date | null;
  responseBreached: boolean;

  // Resolution tracking
  resolutionDueAt: Date | null;
  resolvedAt: Date | null;
  resolutionBreached: boolean;

  // Pause/resume state
  isPaused: boolean;
  pausedAt: Date | null;
  pauseReason: string | null;
  totalPausedDurationSeconds: number;

  // Current status
  status: SlaStatus;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * SLA Event
 * Audit trail for SLA state changes
 */
export interface SlaEvent {
  id: string;
  organizationId: string;
  slaTrackingId: string;
  eventType: SlaEventType;
  eventData: Record<string, unknown> | null;
  triggeredByUserId: string | null;
  triggeredAt: Date;
}

// ============================================================================
// CALCULATION INTERFACES
// ============================================================================

/**
 * Result of SLA due date calculation
 */
export interface SlaCalculationResult {
  responseDueAt: Date | null;
  resolutionDueAt: Date | null;
  responseAtRiskAt: Date | null;
  resolutionAtRiskAt: Date | null;
}

/**
 * Current state snapshot with computed fields
 */
export interface SlaStateSnapshot {
  tracking: SlaTracking;
  configuration: SlaConfiguration;

  // Computed status flags
  isResponseAtRisk: boolean;
  isResolutionAtRisk: boolean;

  // Time remaining (seconds)
  responseTimeRemaining: number | null;
  resolutionTimeRemaining: number | null;

  // Time elapsed (seconds, excluding pauses)
  responseTimeElapsed: number | null;
  resolutionTimeElapsed: number | null;

  // Percentages for UI progress bars
  responsePercentComplete: number | null;
  resolutionPercentComplete: number | null;
}

// ============================================================================
// INPUT INTERFACES
// ============================================================================

/**
 * Input for starting SLA tracking
 */
export interface StartSlaInput {
  organizationId: string;
  domain: SlaDomain;
  entityType: string;
  entityId: string;
  configurationId: string;
  startedAt?: Date;
  userId?: string;
}

/**
 * Input for pausing SLA
 */
export interface PauseSlaInput {
  trackingId: string;
  reason: string;
  userId?: string;
}

/**
 * Input for resuming SLA
 */
export interface ResumeSlaInput {
  trackingId: string;
  userId?: string;
}

/**
 * Input for recording response
 */
export interface RecordResponseInput {
  trackingId: string;
  respondedAt?: Date;
  userId?: string;
}

/**
 * Input for recording resolution
 */
export interface RecordResolutionInput {
  trackingId: string;
  resolvedAt?: Date;
  userId?: string;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

/**
 * Default business hours (Australian timezone)
 */
export const DEFAULT_BUSINESS_HOURS: WeeklySchedule = {
  monday: { start: "09:00", end: "17:00" },
  tuesday: { start: "09:00", end: "17:00" },
  wednesday: { start: "09:00", end: "17:00" },
  thursday: { start: "09:00", end: "17:00" },
  friday: { start: "09:00", end: "17:00" },
  saturday: null,
  sunday: null,
};

export const DEFAULT_TIMEZONE = "Australia/Sydney";

/**
 * Default SLA configurations by domain
 */
export const DEFAULT_SLA_CONFIGS: Record<
  SlaDomain,
  Partial<SlaConfiguration>
> = {
  support: {
    name: "Standard Support",
    responseTargetValue: 4,
    responseTargetUnit: "business_hours",
    resolutionTargetValue: 24,
    resolutionTargetUnit: "business_hours",
    atRiskThresholdPercent: 25,
  },
  warranty: {
    name: "Standard Warranty",
    responseTargetValue: 24,
    responseTargetUnit: "hours",
    resolutionTargetValue: 5,
    resolutionTargetUnit: "business_days",
    atRiskThresholdPercent: 25,
  },
  jobs: {
    name: "Standard Job",
    responseTargetValue: null, // No response SLA for jobs
    responseTargetUnit: null,
    resolutionTargetValue: null, // Varies by job type
    resolutionTargetUnit: null,
    atRiskThresholdPercent: 25,
  },
};

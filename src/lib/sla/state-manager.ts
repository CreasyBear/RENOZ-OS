/**
 * SLA State Manager
 *
 * Manages SLA tracking lifecycle: start, pause, resume, respond, resolve.
 * Creates audit trail events and calculates due dates.
 *
 * This module provides pure functions that can be used by server functions
 * to manage SLA state. Database operations are passed in via dependencies.
 *
 * @see _Initiation/_prd/_meta/remediation-sla-engine.md
 */

import { differenceInSeconds } from 'date-fns';
import {
  calculateDueDates,
  calculateRemainingTime,
  calculateElapsedTime,
  isAtRisk,
  isBreached,
  calculateProgress,
} from './calculator';
import type {
  SlaConfiguration,
  BusinessHoursConfig,
  SlaTracking,
  SlaStateSnapshot,
  SlaStatus,
  StartSlaInput,
} from './types';

// ============================================================================
// STATE COMPUTATION
// ============================================================================

/**
 * Compute the current SLA state snapshot with all derived values
 */
export function computeStateSnapshot(
  tracking: SlaTracking,
  configuration: SlaConfiguration,
  asOf: Date = new Date()
): SlaStateSnapshot {
  const { totalPausedDurationSeconds } = tracking;

  // Calculate remaining time
  const responseTimeRemaining = tracking.respondedAt
    ? null
    : calculateRemainingTime(tracking.responseDueAt, totalPausedDurationSeconds, asOf);

  const resolutionTimeRemaining = tracking.resolvedAt
    ? null
    : calculateRemainingTime(tracking.resolutionDueAt, totalPausedDurationSeconds, asOf);

  // Calculate elapsed time
  const responseTimeElapsed = tracking.respondedAt
    ? differenceInSeconds(tracking.respondedAt, tracking.startedAt) - totalPausedDurationSeconds
    : calculateElapsedTime(tracking.startedAt, totalPausedDurationSeconds, asOf);

  const resolutionTimeElapsed = tracking.resolvedAt
    ? differenceInSeconds(tracking.resolvedAt, tracking.startedAt) - totalPausedDurationSeconds
    : calculateElapsedTime(tracking.startedAt, totalPausedDurationSeconds, asOf);

  // Calculate at-risk status
  // We need to compute at-risk dates from the configuration
  const totalResponseSeconds = tracking.responseDueAt
    ? differenceInSeconds(tracking.responseDueAt, tracking.startedAt)
    : null;
  const responseAtRiskAt =
    totalResponseSeconds && configuration.atRiskThresholdPercent
      ? new Date(
          tracking.startedAt.getTime() +
            totalResponseSeconds * (1 - configuration.atRiskThresholdPercent / 100) * 1000
        )
      : null;

  const totalResolutionSeconds = tracking.resolutionDueAt
    ? differenceInSeconds(tracking.resolutionDueAt, tracking.startedAt)
    : null;
  const resolutionAtRiskAt =
    totalResolutionSeconds && configuration.atRiskThresholdPercent
      ? new Date(
          tracking.startedAt.getTime() +
            totalResolutionSeconds * (1 - configuration.atRiskThresholdPercent / 100) * 1000
        )
      : null;

  const isResponseAtRisk =
    !tracking.respondedAt &&
    !tracking.responseBreached &&
    isAtRisk(tracking.responseDueAt, responseAtRiskAt, totalPausedDurationSeconds, asOf);

  const isResolutionAtRisk =
    !tracking.resolvedAt &&
    !tracking.resolutionBreached &&
    isAtRisk(tracking.resolutionDueAt, resolutionAtRiskAt, totalPausedDurationSeconds, asOf);

  // Calculate progress percentages
  const responsePercentComplete = tracking.respondedAt
    ? 100
    : calculateProgress(
        tracking.startedAt,
        tracking.responseDueAt,
        totalPausedDurationSeconds,
        asOf
      );

  const resolutionPercentComplete = tracking.resolvedAt
    ? 100
    : calculateProgress(
        tracking.startedAt,
        tracking.resolutionDueAt,
        totalPausedDurationSeconds,
        asOf
      );

  return {
    tracking,
    configuration,
    isResponseAtRisk,
    isResolutionAtRisk,
    responseTimeRemaining,
    resolutionTimeRemaining,
    responseTimeElapsed,
    resolutionTimeElapsed,
    responsePercentComplete,
    resolutionPercentComplete,
  };
}

// ============================================================================
// STATE TRANSITION HELPERS
// ============================================================================

/**
 * Calculate initial SLA tracking values when starting tracking
 */
export function calculateInitialTracking(
  input: StartSlaInput,
  configuration: SlaConfiguration,
  businessHours: BusinessHoursConfig | null,
  holidays: Date[]
): Omit<SlaTracking, 'id' | 'createdAt' | 'updatedAt'> {
  const startedAt = input.startedAt ?? new Date();

  const dueDates = calculateDueDates(configuration, startedAt, businessHours, holidays);

  return {
    organizationId: input.organizationId,
    domain: input.domain,
    entityType: input.entityType,
    entityId: input.entityId,
    slaConfigurationId: input.configurationId,
    startedAt,
    responseDueAt: dueDates.responseDueAt,
    respondedAt: null,
    responseBreached: false,
    resolutionDueAt: dueDates.resolutionDueAt,
    resolvedAt: null,
    resolutionBreached: false,
    responseTimeSeconds: null,
    resolutionTimeSeconds: null,
    isPaused: false,
    pausedAt: null,
    pauseReason: null,
    totalPausedDurationSeconds: 0,
    status: 'active' as SlaStatus,
  };
}

/**
 * Calculate pause state update
 */
export function calculatePauseUpdate(
  tracking: SlaTracking,
  reason: string,
  pausedAt: Date = new Date()
): Partial<SlaTracking> {
  if (tracking.isPaused) {
    throw new Error('SLA is already paused');
  }

  if (tracking.status === 'resolved') {
    throw new Error('Cannot pause a resolved SLA');
  }

  return {
    isPaused: true,
    pausedAt,
    pauseReason: reason,
    status: 'paused' as SlaStatus,
  };
}

/**
 * Calculate resume state update
 */
export function calculateResumeUpdate(
  tracking: SlaTracking,
  resumedAt: Date = new Date()
): Partial<SlaTracking> {
  if (!tracking.isPaused || !tracking.pausedAt) {
    throw new Error('SLA is not paused');
  }

  const pauseDurationSeconds = differenceInSeconds(resumedAt, tracking.pausedAt);
  const newTotalPaused = tracking.totalPausedDurationSeconds + pauseDurationSeconds;

  // Determine new status
  let newStatus: SlaStatus = 'active';
  if (tracking.respondedAt && !tracking.resolvedAt) {
    newStatus = 'responded';
  }

  return {
    isPaused: false,
    pausedAt: null,
    pauseReason: null,
    totalPausedDurationSeconds: newTotalPaused,
    status: newStatus,
  };
}

/**
 * Calculate response recording update
 */
export function calculateResponseUpdate(
  tracking: SlaTracking,
  respondedAt: Date = new Date()
): Partial<SlaTracking> {
  if (tracking.respondedAt) {
    throw new Error('Response already recorded');
  }

  // Check if response is breached
  const isResponseBreached = tracking.responseDueAt
    ? isBreached(tracking.responseDueAt, tracking.totalPausedDurationSeconds, respondedAt)
    : false;

  // Determine new status
  let newStatus: SlaStatus = 'responded';
  if (isResponseBreached) {
    newStatus = 'breached';
  }

  // Calculate elapsed time (excluding pauses)
  const responseTimeSeconds =
    differenceInSeconds(respondedAt, tracking.startedAt) - tracking.totalPausedDurationSeconds;

  return {
    respondedAt,
    responseBreached: isResponseBreached,
    responseTimeSeconds,
    status: newStatus,
  };
}

/**
 * Calculate resolution recording update
 */
export function calculateResolutionUpdate(
  tracking: SlaTracking,
  resolvedAt: Date = new Date()
): Partial<SlaTracking> {
  if (tracking.resolvedAt) {
    throw new Error('Resolution already recorded');
  }

  // Check if resolution is breached
  const isResolutionBreached = tracking.resolutionDueAt
    ? isBreached(tracking.resolutionDueAt, tracking.totalPausedDurationSeconds, resolvedAt)
    : false;

  // Calculate elapsed time (excluding pauses)
  const resolutionTimeSeconds =
    differenceInSeconds(resolvedAt, tracking.startedAt) - tracking.totalPausedDurationSeconds;

  return {
    resolvedAt,
    resolutionBreached: isResolutionBreached,
    resolutionTimeSeconds,
    status: 'resolved' as SlaStatus,
    // If paused, unpause on resolution
    isPaused: false,
    pausedAt: null,
    pauseReason: null,
  };
}

/**
 * Check and update breach status (called by scheduled job)
 */
export function checkBreachStatus(
  tracking: SlaTracking,
  asOf: Date = new Date()
): Partial<SlaTracking> | null {
  const updates: Partial<SlaTracking> = {};
  let hasUpdates = false;

  // Skip if paused or resolved
  if (tracking.isPaused || tracking.status === 'resolved') {
    return null;
  }

  // Check response breach
  if (!tracking.respondedAt && !tracking.responseBreached && tracking.responseDueAt) {
    if (isBreached(tracking.responseDueAt, tracking.totalPausedDurationSeconds, asOf)) {
      updates.responseBreached = true;
      updates.status = 'breached';
      hasUpdates = true;
    }
  }

  // Check resolution breach
  if (!tracking.resolvedAt && !tracking.resolutionBreached && tracking.resolutionDueAt) {
    if (isBreached(tracking.resolutionDueAt, tracking.totalPausedDurationSeconds, asOf)) {
      updates.resolutionBreached = true;
      updates.status = 'breached';
      hasUpdates = true;
    }
  }

  return hasUpdates ? updates : null;
}

// ============================================================================
// EVENT DATA BUILDERS
// ============================================================================

/**
 * Build event data for a 'started' event
 */
export function buildStartedEventData(tracking: SlaTracking) {
  return {
    responseDueAt: tracking.responseDueAt?.toISOString() ?? null,
    resolutionDueAt: tracking.resolutionDueAt?.toISOString() ?? null,
  };
}

/**
 * Build event data for a 'paused' event
 */
export function buildPausedEventData(reason: string) {
  return {
    pauseReason: reason,
  };
}

/**
 * Build event data for a 'resumed' event
 */
export function buildResumedEventData(pauseDurationSeconds: number, totalPausedSeconds: number) {
  return {
    pauseDurationSeconds,
    totalPausedDurationSeconds: totalPausedSeconds,
  };
}

/**
 * Build event data for a 'responded' event
 */
export function buildRespondedEventData(tracking: SlaTracking, respondedAt: Date) {
  const responseTime = differenceInSeconds(respondedAt, tracking.startedAt);
  return {
    responseTimeSeconds: responseTime - tracking.totalPausedDurationSeconds,
    wasBreached: tracking.responseBreached,
  };
}

/**
 * Build event data for a 'resolved' event
 */
export function buildResolvedEventData(tracking: SlaTracking, resolvedAt: Date) {
  const resolutionTime = differenceInSeconds(resolvedAt, tracking.startedAt);
  return {
    resolutionTimeSeconds: resolutionTime - tracking.totalPausedDurationSeconds,
    wasBreached: tracking.resolutionBreached,
  };
}

/**
 * Build event data for breach events
 */
export function buildBreachEventData(
  tracking: SlaTracking,
  type: 'response' | 'resolution',
  asOf: Date
) {
  const dueAt = type === 'response' ? tracking.responseDueAt : tracking.resolutionDueAt;

  if (!dueAt) return {};

  const adjustedDueAt = new Date(dueAt.getTime() + tracking.totalPausedDurationSeconds * 1000);
  const overdueSeconds = Math.max(0, differenceInSeconds(asOf, adjustedDueAt));

  return {
    dueAt: dueAt.toISOString(),
    breachedAt: asOf.toISOString(),
    overdueSeconds,
  };
}

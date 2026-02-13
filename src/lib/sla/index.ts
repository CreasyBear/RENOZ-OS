/**
 * SLA Engine
 *
 * Unified SLA calculation and tracking for Support, Warranty, and Jobs domains.
 *
 * @example
 * ```ts
 * import { calculateDueDates, computeStateSnapshot } from '@/lib/sla';
 *
 * // Calculate due dates for a new issue
 * const dueDates = calculateDueDates(config, startedAt, businessHours, holidays);
 *
 * // Get current state snapshot
 * const snapshot = computeStateSnapshot(tracking, configuration);
 * ```
 *
 * @see _Initiation/_prd/_meta/remediation-sla-engine.md
 */

// Types
export * from './types';

// Adapters for Drizzle rows → engine types (replaces `as any`)
export {
  toSlaTracking,
  toSlaConfiguration,
  toWeeklySchedule,
  toBusinessHoursConfig,
} from './adapters';

// Calculator - pure functions for SLA calculations
export {
  calculateDueDates,
  calculateRemainingTime,
  calculateElapsedTime,
  isAtRisk,
  isBreached,
  calculateProgress,
  adjustDueDatesAfterPause,
} from './calculator';

// State Manager - state transition helpers
export {
  computeStateSnapshot,
  calculateInitialTracking,
  calculatePauseUpdate,
  calculateResumeUpdate,
  calculateResponseUpdate,
  calculateResolutionUpdate,
  checkBreachStatus,
  buildStartedEventData,
  buildPausedEventData,
  buildResumedEventData,
  buildRespondedEventData,
  buildResolvedEventData,
  buildBreachEventData,
} from './state-manager';

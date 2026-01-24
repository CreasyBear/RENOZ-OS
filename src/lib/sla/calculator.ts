/**
 * SLA Calculator
 *
 * Pure functions for calculating SLA due dates and remaining time.
 * Supports both wall-clock time and business hours calculations.
 *
 * @see _Initiation/_prd/_meta/remediation-sla-engine.md
 */

import {
  addMinutes,
  addHours,
  addDays,
  differenceInSeconds,
  setHours,
  setMinutes,
  startOfDay,
  getDay,
  isBefore,
  isAfter,
  isSameDay,
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

import type {
  SlaConfiguration,
  BusinessHoursConfig,
  SlaCalculationResult,
  WeeklySchedule,
  DaySchedule,
  SlaTargetUnit,
} from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;

const DAY_NAMES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

// ============================================================================
// BUSINESS HOURS UTILITIES
// ============================================================================

/**
 * Get the schedule for a specific day from weekly schedule
 */
function getDaySchedule(schedule: WeeklySchedule, dayIndex: number): DaySchedule | null {
  const dayName = DAY_NAMES[dayIndex];
  return schedule[dayName] ?? null;
}

/**
 * Parse time string (HH:mm) to hours and minutes
 */
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

/**
 * Check if a date is a holiday
 */
function isHoliday(date: Date, holidays: Date[]): boolean {
  return holidays.some((holiday) => isSameDay(date, holiday));
}

/**
 * Get the next business hours start time from a given date
 */
function getNextBusinessHoursStart(
  fromDate: Date,
  schedule: WeeklySchedule,
  timezone: string,
  holidays: Date[],
  maxDays: number = 365
): Date {
  let currentDate = fromDate;

  for (let i = 0; i < maxDays; i++) {
    const zonedDate = toZonedTime(currentDate, timezone);
    const dayIndex = getDay(zonedDate);
    const daySchedule = getDaySchedule(schedule, dayIndex);

    if (daySchedule && !isHoliday(currentDate, holidays)) {
      const start = parseTime(daySchedule.start);
      const dayStart = setMinutes(setHours(startOfDay(zonedDate), start.hours), start.minutes);
      const utcDayStart = fromZonedTime(dayStart, timezone);

      if (isAfter(utcDayStart, fromDate) || i > 0) {
        return utcDayStart;
      }

      // If we're before the end of business hours today, return now
      const end = parseTime(daySchedule.end);
      const dayEnd = setMinutes(setHours(startOfDay(zonedDate), end.hours), end.minutes);
      if (isBefore(zonedDate, dayEnd)) {
        return fromDate;
      }
    }

    // Move to start of next day
    currentDate = addDays(startOfDay(currentDate), 1);
  }

  // Fallback: return original date
  return fromDate;
}

// ============================================================================
// CORE CALCULATION FUNCTIONS
// ============================================================================

/**
 * Add a duration to a date, accounting for business hours if needed
 */
function addDuration(
  startDate: Date,
  value: number,
  unit: SlaTargetUnit,
  businessHours: BusinessHoursConfig | null,
  holidays: Date[]
): Date {
  switch (unit) {
    case 'minutes':
      return addMinutes(startDate, value);

    case 'hours':
      return addHours(startDate, value);

    case 'days':
      return addDays(startDate, value);

    case 'business_hours':
      return addBusinessHours(startDate, value, businessHours, holidays);

    case 'business_days':
      return addBusinessDays(startDate, value, businessHours, holidays);

    default:
      return addHours(startDate, value);
  }
}

/**
 * Add business hours to a date
 */
function addBusinessHours(
  startDate: Date,
  hours: number,
  businessHours: BusinessHoursConfig | null,
  holidays: Date[]
): Date {
  if (!businessHours) {
    // Fall back to wall-clock hours
    return addHours(startDate, hours);
  }

  const { weeklySchedule, timezone } = businessHours;
  let remainingMinutes = hours * MINUTES_PER_HOUR;
  let currentDate = getNextBusinessHoursStart(startDate, weeklySchedule, timezone, holidays);

  const maxIterations = 365 * 24; // Safety limit
  let iterations = 0;

  while (remainingMinutes > 0 && iterations < maxIterations) {
    iterations++;

    const zonedDate = toZonedTime(currentDate, timezone);
    const dayIndex = getDay(zonedDate);
    const daySchedule = getDaySchedule(weeklySchedule, dayIndex);

    if (!daySchedule || isHoliday(currentDate, holidays)) {
      // Skip to next day
      currentDate = addDays(startOfDay(currentDate), 1);
      currentDate = getNextBusinessHoursStart(currentDate, weeklySchedule, timezone, holidays);
      continue;
    }

    const end = parseTime(daySchedule.end);
    const dayEnd = setMinutes(setHours(startOfDay(zonedDate), end.hours), end.minutes);
    const utcDayEnd = fromZonedTime(dayEnd, timezone);

    // Calculate remaining minutes in current business day
    const minutesUntilEnd = Math.max(
      0,
      differenceInSeconds(utcDayEnd, currentDate) / SECONDS_PER_MINUTE
    );

    if (remainingMinutes <= minutesUntilEnd) {
      // We can fit within current business day
      return addMinutes(currentDate, remainingMinutes);
    }

    // Consume remaining time in current day and move to next
    remainingMinutes -= minutesUntilEnd;
    currentDate = addDays(startOfDay(currentDate), 1);
    currentDate = getNextBusinessHoursStart(currentDate, weeklySchedule, timezone, holidays);
  }

  return currentDate;
}

/**
 * Add business days to a date
 */
function addBusinessDays(
  startDate: Date,
  days: number,
  businessHours: BusinessHoursConfig | null,
  holidays: Date[]
): Date {
  if (!businessHours) {
    // Fall back to calendar days
    return addDays(startDate, days);
  }

  const { weeklySchedule, timezone } = businessHours;
  let remainingDays = days;
  let currentDate = startDate;

  const maxIterations = 365 * 2; // Safety limit
  let iterations = 0;

  while (remainingDays > 0 && iterations < maxIterations) {
    iterations++;
    currentDate = addDays(currentDate, 1);

    const zonedDate = toZonedTime(currentDate, timezone);
    const dayIndex = getDay(zonedDate);
    const daySchedule = getDaySchedule(weeklySchedule, dayIndex);

    // Count this as a business day if it has a schedule and isn't a holiday
    if (daySchedule && !isHoliday(currentDate, holidays)) {
      remainingDays--;
    }
  }

  // Return end of business hours on the final day
  const zonedDate = toZonedTime(currentDate, timezone);
  const dayIndex = getDay(zonedDate);
  const daySchedule = getDaySchedule(weeklySchedule, dayIndex);

  if (daySchedule) {
    const end = parseTime(daySchedule.end);
    const dayEnd = setMinutes(setHours(startOfDay(zonedDate), end.hours), end.minutes);
    return fromZonedTime(dayEnd, timezone);
  }

  return currentDate;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Calculate SLA due dates based on configuration and start time
 */
export function calculateDueDates(
  config: SlaConfiguration,
  startedAt: Date,
  businessHours: BusinessHoursConfig | null,
  holidays: Date[]
): SlaCalculationResult {
  let responseDueAt: Date | null = null;
  let resolutionDueAt: Date | null = null;
  let responseAtRiskAt: Date | null = null;
  let resolutionAtRiskAt: Date | null = null;

  // Calculate response due date
  if (config.responseTargetValue && config.responseTargetUnit) {
    responseDueAt = addDuration(
      startedAt,
      config.responseTargetValue,
      config.responseTargetUnit,
      businessHours,
      holidays
    );

    // Calculate at-risk date (when we hit the threshold)
    const responseSeconds = differenceInSeconds(responseDueAt, startedAt);
    const responseAtRiskSeconds = responseSeconds * (1 - config.atRiskThresholdPercent / 100);
    responseAtRiskAt = new Date(startedAt.getTime() + responseAtRiskSeconds * 1000);
  }

  // Calculate resolution due date
  if (config.resolutionTargetValue && config.resolutionTargetUnit) {
    resolutionDueAt = addDuration(
      startedAt,
      config.resolutionTargetValue,
      config.resolutionTargetUnit,
      businessHours,
      holidays
    );

    // Calculate at-risk date
    const resolutionSeconds = differenceInSeconds(resolutionDueAt, startedAt);
    const resolutionAtRiskSeconds = resolutionSeconds * (1 - config.atRiskThresholdPercent / 100);
    resolutionAtRiskAt = new Date(startedAt.getTime() + resolutionAtRiskSeconds * 1000);
  }

  return {
    responseDueAt,
    resolutionDueAt,
    responseAtRiskAt,
    resolutionAtRiskAt,
  };
}

/**
 * Calculate remaining time accounting for pauses
 */
export function calculateRemainingTime(
  dueAt: Date | null,
  totalPausedSeconds: number,
  asOf: Date = new Date()
): number | null {
  if (!dueAt) return null;

  // Adjust due date by pause duration
  const adjustedDueAt = new Date(dueAt.getTime() + totalPausedSeconds * 1000);

  const remaining = differenceInSeconds(adjustedDueAt, asOf);
  return Math.max(0, remaining);
}

/**
 * Calculate elapsed time accounting for pauses
 */
export function calculateElapsedTime(
  startedAt: Date,
  totalPausedSeconds: number,
  asOf: Date = new Date()
): number {
  const totalElapsed = differenceInSeconds(asOf, startedAt);
  return Math.max(0, totalElapsed - totalPausedSeconds);
}

/**
 * Check if SLA is at risk (within warning threshold)
 */
export function isAtRisk(
  dueAt: Date | null,
  atRiskAt: Date | null,
  totalPausedSeconds: number,
  asOf: Date = new Date()
): boolean {
  if (!dueAt || !atRiskAt) return false;

  // Adjust dates by pause duration
  const adjustedAtRiskAt = new Date(atRiskAt.getTime() + totalPausedSeconds * 1000);
  const adjustedDueAt = new Date(dueAt.getTime() + totalPausedSeconds * 1000);

  return isAfter(asOf, adjustedAtRiskAt) && isBefore(asOf, adjustedDueAt);
}

/**
 * Check if SLA is breached (past due date)
 */
export function isBreached(
  dueAt: Date | null,
  totalPausedSeconds: number,
  asOf: Date = new Date()
): boolean {
  if (!dueAt) return false;

  // Adjust due date by pause duration
  const adjustedDueAt = new Date(dueAt.getTime() + totalPausedSeconds * 1000);

  return isAfter(asOf, adjustedDueAt);
}

/**
 * Calculate progress percentage (0-100)
 */
export function calculateProgress(
  startedAt: Date,
  dueAt: Date | null,
  totalPausedSeconds: number,
  asOf: Date = new Date()
): number | null {
  if (!dueAt) return null;

  const totalDuration = differenceInSeconds(dueAt, startedAt);
  if (totalDuration <= 0) return 100;

  const elapsed = calculateElapsedTime(startedAt, totalPausedSeconds, asOf);
  const progress = (elapsed / totalDuration) * 100;

  return Math.min(100, Math.max(0, progress));
}

/**
 * Recalculate due dates after a pause/resume cycle
 * Adds the pause duration to the original due dates
 */
export function adjustDueDatesAfterPause(
  originalDueDates: SlaCalculationResult,
  pauseDurationSeconds: number
): SlaCalculationResult {
  const adjustment = pauseDurationSeconds * 1000;

  return {
    responseDueAt: originalDueDates.responseDueAt
      ? new Date(originalDueDates.responseDueAt.getTime() + adjustment)
      : null,
    resolutionDueAt: originalDueDates.resolutionDueAt
      ? new Date(originalDueDates.resolutionDueAt.getTime() + adjustment)
      : null,
    responseAtRiskAt: originalDueDates.responseAtRiskAt
      ? new Date(originalDueDates.responseAtRiskAt.getTime() + adjustment)
      : null,
    resolutionAtRiskAt: originalDueDates.resolutionAtRiskAt
      ? new Date(originalDueDates.resolutionAtRiskAt.getTime() + adjustment)
      : null,
  };
}

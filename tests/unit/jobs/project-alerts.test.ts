/**
 * Project Alerts Unit Tests
 *
 * Tests for alert computation logic including:
 * - Alert ID generation
 * - Alert message formatting
 * - Severity mappings
 * - Date threshold calculations
 *
 * @see src/lib/schemas/jobs/project-alerts.ts
 * @see src/server/functions/jobs/project-alerts.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ALERT_TYPE_SEVERITY,
  ALERT_MESSAGES,
  ALERT_SEVERITY_ORDER,
  type AlertSeverity,
} from '@/lib/schemas/jobs/project-alerts';

// ============================================================================
// HELPER FUNCTIONS (extracted from server function for testing)
// ============================================================================

/**
 * Creates a deterministic alert ID for deduplication and dismissal tracking.
 */
function createAlertId(projectId: string, type: string): string {
  return `project:${projectId}:${type}`;
}

/**
 * Days ago helper for date comparison
 */
function daysAgo(days: number): Date {
  const date = new Date(Date.now());
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  return Math.floor((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Check if project is schedule overdue
 */
function isScheduleOverdue(
  targetCompletionDate: string | null,
  actualCompletionDate: string | null,
  today: Date
): { overdue: boolean; daysOverdue: number } {
  if (!targetCompletionDate || actualCompletionDate) {
    return { overdue: false, daysOverdue: 0 };
  }

  const target = new Date(targetCompletionDate);
  if (target >= today) {
    return { overdue: false, daysOverdue: 0 };
  }

  const daysOverdue = daysBetween(target, today);
  return { overdue: true, daysOverdue };
}

/**
 * Check if project is over budget
 */
function isBudgetExceeded(
  estimatedTotalValue: string | null,
  actualTotalCost: string | null
): { exceeded: boolean; percentOver: number } {
  const estimated = estimatedTotalValue ? parseFloat(estimatedTotalValue) : 0;
  const actual = actualTotalCost ? parseFloat(actualTotalCost) : 0;

  if (estimated <= 0 || actual <= estimated) {
    return { exceeded: false, percentOver: 0 };
  }

  const percentOver = Math.round(((actual - estimated) / estimated) * 100);
  return { exceeded: true, percentOver };
}

/**
 * Check if project is stale (no activity in 14+ days)
 */
function isStaleProject(
  status: string,
  updatedAt: string | null,
  today: Date
): { stale: boolean; daysSinceActivity: number } {
  const activeStatuses = ['approved', 'in_progress'];

  if (!activeStatuses.includes(status) || !updatedAt) {
    return { stale: false, daysSinceActivity: 0 };
  }

  const lastUpdate = new Date(updatedAt);
  const threshold = daysAgo(14);

  if (lastUpdate >= threshold) {
    return { stale: false, daysSinceActivity: 0 };
  }

  const daysSinceActivity = daysBetween(lastUpdate, today);
  return { stale: true, daysSinceActivity };
}

/**
 * Check if project is ready for completion sign-off
 */
function isCompletionPending(status: string, progressPercent: number | null): boolean {
  return status === 'in_progress' && progressPercent !== null && progressPercent >= 100;
}

// ============================================================================
// TESTS
// ============================================================================

describe('Project Alerts', () => {
  describe('createAlertId', () => {
    it('creates deterministic ID for project and type', () => {
      const id = createAlertId('proj-123', 'schedule_overdue');
      expect(id).toBe('project:proj-123:schedule_overdue');
    });

    it('handles UUID project IDs', () => {
      const id = createAlertId('550e8400-e29b-41d4-a716-446655440000', 'blocked_tasks');
      expect(id).toBe('project:550e8400-e29b-41d4-a716-446655440000:blocked_tasks');
    });

    it('produces unique IDs for different types', () => {
      const id1 = createAlertId('proj-1', 'schedule_overdue');
      const id2 = createAlertId('proj-1', 'budget_exceeded');
      expect(id1).not.toBe(id2);
    });

    it('produces unique IDs for different projects', () => {
      const id1 = createAlertId('proj-1', 'schedule_overdue');
      const id2 = createAlertId('proj-2', 'schedule_overdue');
      expect(id1).not.toBe(id2);
    });
  });

  describe('daysAgo', () => {
    const fixedNow = new Date('2026-02-02T12:00:00Z').getTime();

    beforeEach(() => {
      vi.spyOn(Date, 'now').mockReturnValue(fixedNow);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns date 14 days ago', () => {
      const result = daysAgo(14);
      expect(result.toISOString().split('T')[0]).toBe('2026-01-19');
    });

    it('returns date 0 days ago (today)', () => {
      const result = daysAgo(0);
      expect(result.toISOString().split('T')[0]).toBe('2026-02-02');
    });

    it('returns date 30 days ago', () => {
      const result = daysAgo(30);
      expect(result.toISOString().split('T')[0]).toBe('2026-01-03');
    });
  });

  describe('ALERT_TYPE_SEVERITY', () => {
    it('maps schedule_overdue to critical', () => {
      expect(ALERT_TYPE_SEVERITY.schedule_overdue).toBe('critical');
    });

    it('maps budget_exceeded to critical', () => {
      expect(ALERT_TYPE_SEVERITY.budget_exceeded).toBe('critical');
    });

    it('maps blocked_tasks to warning', () => {
      expect(ALERT_TYPE_SEVERITY.blocked_tasks).toBe('warning');
    });

    it('maps stale_project to warning', () => {
      expect(ALERT_TYPE_SEVERITY.stale_project).toBe('warning');
    });

    it('maps bom_items_pending to warning', () => {
      expect(ALERT_TYPE_SEVERITY.bom_items_pending).toBe('warning');
    });

    it('maps completion_pending to info', () => {
      expect(ALERT_TYPE_SEVERITY.completion_pending).toBe('info');
    });

    it('has all 6 alert types', () => {
      const types = Object.keys(ALERT_TYPE_SEVERITY);
      expect(types).toHaveLength(6);
    });
  });

  describe('ALERT_SEVERITY_ORDER', () => {
    it('critical has lowest order (highest priority)', () => {
      expect(ALERT_SEVERITY_ORDER.critical).toBe(0);
    });

    it('warning has middle order', () => {
      expect(ALERT_SEVERITY_ORDER.warning).toBe(1);
    });

    it('info has highest order (lowest priority)', () => {
      expect(ALERT_SEVERITY_ORDER.info).toBe(2);
    });

    it('sorts correctly by severity', () => {
      const severities: AlertSeverity[] = ['info', 'critical', 'warning'];
      const sorted = severities.sort((a, b) => ALERT_SEVERITY_ORDER[a] - ALERT_SEVERITY_ORDER[b]);
      expect(sorted).toEqual(['critical', 'warning', 'info']);
    });
  });

  describe('ALERT_MESSAGES', () => {
    describe('schedule_overdue', () => {
      it('returns message with days count', () => {
        const message = ALERT_MESSAGES.schedule_overdue({ days: 5 });
        expect(message).toBe('5 days behind schedule');
      });

      it('returns fallback when no days provided', () => {
        const message = ALERT_MESSAGES.schedule_overdue();
        expect(message).toBe('Project is behind schedule');
      });

      it('returns fallback when days is undefined', () => {
        const message = ALERT_MESSAGES.schedule_overdue({});
        expect(message).toBe('Project is behind schedule');
      });
    });

    describe('budget_exceeded', () => {
      it('returns message with percent over', () => {
        const message = ALERT_MESSAGES.budget_exceeded({ percent: 15 });
        expect(message).toBe('15% over budget');
      });

      it('returns fallback when no percent provided', () => {
        const message = ALERT_MESSAGES.budget_exceeded();
        expect(message).toBe('Project is over budget');
      });
    });

    describe('blocked_tasks', () => {
      it('returns singular message for 1 task', () => {
        const message = ALERT_MESSAGES.blocked_tasks({ count: 1 });
        expect(message).toBe('1 task blocked');
      });

      it('returns plural message for multiple tasks', () => {
        const message = ALERT_MESSAGES.blocked_tasks({ count: 3 });
        expect(message).toBe('3 tasks blocked');
      });

      it('returns fallback when no count provided', () => {
        const message = ALERT_MESSAGES.blocked_tasks();
        expect(message).toBe('Tasks are blocked');
      });
    });

    describe('stale_project', () => {
      it('returns message with days since activity', () => {
        const message = ALERT_MESSAGES.stale_project({ days: 21 });
        expect(message).toBe('No activity for 21 days');
      });

      it('returns fallback when no days provided', () => {
        const message = ALERT_MESSAGES.stale_project();
        expect(message).toBe('Project has no recent activity');
      });
    });

    describe('bom_items_pending', () => {
      it('returns singular message for 1 item', () => {
        const message = ALERT_MESSAGES.bom_items_pending({ count: 1 });
        expect(message).toBe('1 BOM item not ordered');
      });

      it('returns plural message for multiple items', () => {
        const message = ALERT_MESSAGES.bom_items_pending({ count: 5 });
        expect(message).toBe('5 BOM items not ordered');
      });

      it('returns fallback when no count provided', () => {
        const message = ALERT_MESSAGES.bom_items_pending();
        expect(message).toBe('BOM items pending');
      });
    });

    describe('completion_pending', () => {
      it('returns static message', () => {
        const message = ALERT_MESSAGES.completion_pending();
        expect(message).toBe('Ready for completion sign-off');
      });
    });
  });

  describe('isScheduleOverdue', () => {
    const today = new Date('2026-02-02T12:00:00Z');

    it('returns not overdue when no target date', () => {
      const result = isScheduleOverdue(null, null, today);
      expect(result.overdue).toBe(false);
      expect(result.daysOverdue).toBe(0);
    });

    it('returns not overdue when already completed', () => {
      const result = isScheduleOverdue('2026-01-15', '2026-01-20', today);
      expect(result.overdue).toBe(false);
    });

    it('returns not overdue when target is in future', () => {
      const result = isScheduleOverdue('2026-02-15', null, today);
      expect(result.overdue).toBe(false);
    });

    it('returns not overdue when target is today (end of day)', () => {
      // Target date at end of day should not be overdue
      const result = isScheduleOverdue('2026-02-02T23:59:59Z', null, today);
      expect(result.overdue).toBe(false);
    });

    it('returns overdue with correct days when past target', () => {
      const result = isScheduleOverdue('2026-01-28', null, today);
      expect(result.overdue).toBe(true);
      expect(result.daysOverdue).toBe(5);
    });

    it('calculates 30 days overdue correctly', () => {
      const result = isScheduleOverdue('2026-01-03', null, today);
      expect(result.overdue).toBe(true);
      expect(result.daysOverdue).toBe(30);
    });
  });

  describe('isBudgetExceeded', () => {
    it('returns not exceeded when no estimate', () => {
      const result = isBudgetExceeded(null, '5000');
      expect(result.exceeded).toBe(false);
    });

    it('returns not exceeded when estimate is zero', () => {
      const result = isBudgetExceeded('0', '5000');
      expect(result.exceeded).toBe(false);
    });

    it('returns not exceeded when actual is under estimate', () => {
      const result = isBudgetExceeded('10000', '8000');
      expect(result.exceeded).toBe(false);
    });

    it('returns not exceeded when actual equals estimate', () => {
      const result = isBudgetExceeded('10000', '10000');
      expect(result.exceeded).toBe(false);
    });

    it('returns exceeded with correct percent when over budget', () => {
      const result = isBudgetExceeded('10000', '11500');
      expect(result.exceeded).toBe(true);
      expect(result.percentOver).toBe(15);
    });

    it('calculates 50% over budget correctly', () => {
      const result = isBudgetExceeded('10000', '15000');
      expect(result.exceeded).toBe(true);
      expect(result.percentOver).toBe(50);
    });

    it('handles decimal values', () => {
      const result = isBudgetExceeded('10000.50', '12500.75');
      expect(result.exceeded).toBe(true);
      expect(result.percentOver).toBe(25);
    });
  });

  describe('isStaleProject', () => {
    const fixedNow = new Date('2026-02-02T12:00:00Z').getTime();

    beforeEach(() => {
      vi.spyOn(Date, 'now').mockReturnValue(fixedNow);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    const today = new Date('2026-02-02T12:00:00Z');

    it('returns not stale for completed projects', () => {
      const result = isStaleProject('completed', '2026-01-01', today);
      expect(result.stale).toBe(false);
    });

    it('returns not stale for cancelled projects', () => {
      const result = isStaleProject('cancelled', '2026-01-01', today);
      expect(result.stale).toBe(false);
    });

    it('returns not stale for quoting projects', () => {
      const result = isStaleProject('quoting', '2026-01-01', today);
      expect(result.stale).toBe(false);
    });

    it('returns not stale when no updatedAt', () => {
      const result = isStaleProject('in_progress', null, today);
      expect(result.stale).toBe(false);
    });

    it('returns not stale when updated within 14 days', () => {
      const result = isStaleProject('in_progress', '2026-01-25', today);
      expect(result.stale).toBe(false);
    });

    it('returns stale for in_progress with old update', () => {
      const result = isStaleProject('in_progress', '2026-01-10', today);
      expect(result.stale).toBe(true);
      expect(result.daysSinceActivity).toBe(23);
    });

    it('returns stale for approved with old update', () => {
      const result = isStaleProject('approved', '2026-01-10', today);
      expect(result.stale).toBe(true);
    });

    it('calculates 21 days since activity correctly', () => {
      const result = isStaleProject('in_progress', '2026-01-12', today);
      expect(result.stale).toBe(true);
      expect(result.daysSinceActivity).toBe(21);
    });
  });

  describe('isCompletionPending', () => {
    it('returns false when not in_progress', () => {
      expect(isCompletionPending('completed', 100)).toBe(false);
      expect(isCompletionPending('cancelled', 100)).toBe(false);
      expect(isCompletionPending('quoting', 100)).toBe(false);
      expect(isCompletionPending('approved', 100)).toBe(false);
      expect(isCompletionPending('on_hold', 100)).toBe(false);
    });

    it('returns false when progress is null', () => {
      expect(isCompletionPending('in_progress', null)).toBe(false);
    });

    it('returns false when progress is below 100', () => {
      expect(isCompletionPending('in_progress', 0)).toBe(false);
      expect(isCompletionPending('in_progress', 50)).toBe(false);
      expect(isCompletionPending('in_progress', 99)).toBe(false);
    });

    it('returns true when in_progress and 100% complete', () => {
      expect(isCompletionPending('in_progress', 100)).toBe(true);
    });

    it('returns true when in_progress and over 100% complete', () => {
      expect(isCompletionPending('in_progress', 105)).toBe(true);
    });
  });
});

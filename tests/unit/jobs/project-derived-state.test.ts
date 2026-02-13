/**
 * Project Derived State Unit Tests
 *
 * Tests for derived state calculations in useProjectDetail hook:
 * - Schedule status (on-track, at-risk, overdue)
 * - Budget status (under, on-target, over)
 * - Next status actions (valid transitions)
 * - Task counts (completed, total)
 *
 * @see src/hooks/jobs/use-project-detail.ts
 */

import { describe, it, expect } from 'vitest';

// ============================================================================
// DERIVED STATE FUNCTIONS (extracted from use-project-detail.ts for testing)
// ============================================================================

type ProjectStatus = 'quoting' | 'approved' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';

/**
 * Status transitions allowed from each state
 */
const STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  quoting: ['approved', 'cancelled'],
  approved: ['in_progress', 'on_hold', 'cancelled'],
  in_progress: ['on_hold', 'completed', 'cancelled'],
  on_hold: ['in_progress', 'cancelled'],
  completed: [],
  cancelled: [],
};

/**
 * Calculate schedule status based on target completion date
 */
function calculateScheduleStatus(
  targetCompletionDate: string | null,
  actualCompletionDate: string | null,
  today: Date = new Date()
): 'on-track' | 'at-risk' | 'overdue' {
  if (!targetCompletionDate) return 'on-track';

  const target = new Date(targetCompletionDate);

  if (actualCompletionDate) return 'on-track'; // Completed

  const daysUntilDue = Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= 7) return 'at-risk';
  return 'on-track';
}

/**
 * Calculate budget status based on estimated vs actual costs
 */
function calculateBudgetStatus(
  estimatedTotalValue: string | number | null,
  actualTotalCost: string | number | null
): 'under' | 'on-target' | 'over' {
  const estimated = estimatedTotalValue
    ? parseFloat(String(estimatedTotalValue))
    : 0;
  const actual = actualTotalCost
    ? parseFloat(String(actualTotalCost))
    : 0;

  if (!estimated || !actual) return 'on-target';

  const variance = ((actual - estimated) / estimated) * 100;

  if (variance <= -5) return 'under';
  if (variance >= 5) return 'over';
  return 'on-target';
}

/**
 * Get valid next status actions for a project
 */
function getNextStatusActions(status: ProjectStatus | null): ProjectStatus[] {
  if (!status) return [];
  return STATUS_TRANSITIONS[status] ?? [];
}

/**
 * Calculate task completion counts
 */
function calculateTaskCounts(tasks: Array<{ status?: string }>): {
  completedTasks: number;
  totalTasks: number;
} {
  const completed = tasks.filter((t) => t.status === 'completed').length;
  return { completedTasks: completed, totalTasks: tasks.length };
}

// ============================================================================
// TESTS
// ============================================================================

describe('Project Derived State', () => {
  describe('calculateScheduleStatus', () => {
    const today = new Date('2026-02-02T12:00:00Z');

    it('returns on-track when no target date', () => {
      const result = calculateScheduleStatus(null, null, today);
      expect(result).toBe('on-track');
    });

    it('returns on-track when project is completed', () => {
      const result = calculateScheduleStatus('2026-01-15', '2026-01-20', today);
      expect(result).toBe('on-track');
    });

    it('returns on-track when target is far in future (>7 days)', () => {
      const result = calculateScheduleStatus('2026-02-15', null, today);
      expect(result).toBe('on-track');
    });

    it('returns at-risk when target is within 7 days', () => {
      const result = calculateScheduleStatus('2026-02-05', null, today);
      expect(result).toBe('at-risk');
    });

    it('returns at-risk when target is exactly 7 days away', () => {
      const result = calculateScheduleStatus('2026-02-09', null, today);
      expect(result).toBe('at-risk');
    });

    it('returns at-risk when target is tomorrow', () => {
      const result = calculateScheduleStatus('2026-02-03', null, today);
      expect(result).toBe('at-risk');
    });

    it('returns overdue when target is in past', () => {
      const result = calculateScheduleStatus('2026-01-28', null, today);
      expect(result).toBe('overdue');
    });

    it('returns overdue when target was yesterday', () => {
      const result = calculateScheduleStatus('2026-02-01', null, today);
      expect(result).toBe('overdue');
    });

    it('returns on-track for completed project even if target passed', () => {
      // Project was due Jan 15, completed Jan 20 - it's "on-track" because it's done
      const result = calculateScheduleStatus('2026-01-15', '2026-01-20', today);
      expect(result).toBe('on-track');
    });
  });

  describe('calculateBudgetStatus', () => {
    it('returns on-target when no estimated value', () => {
      expect(calculateBudgetStatus(null, '5000')).toBe('on-target');
      expect(calculateBudgetStatus(0, '5000')).toBe('on-target');
      expect(calculateBudgetStatus('0', '5000')).toBe('on-target');
    });

    it('returns on-target when no actual cost', () => {
      expect(calculateBudgetStatus('10000', null)).toBe('on-target');
      expect(calculateBudgetStatus('10000', 0)).toBe('on-target');
    });

    it('returns on-target when variance is within ±5%', () => {
      // Exactly on target
      expect(calculateBudgetStatus('10000', '10000')).toBe('on-target');
      // 4% under
      expect(calculateBudgetStatus('10000', '9600')).toBe('on-target');
      // 4% over
      expect(calculateBudgetStatus('10000', '10400')).toBe('on-target');
    });

    it('returns under when actual is more than 5% below estimate', () => {
      // 6% under
      expect(calculateBudgetStatus('10000', '9400')).toBe('under');
      // 10% under
      expect(calculateBudgetStatus('10000', '9000')).toBe('under');
      // 50% under
      expect(calculateBudgetStatus('10000', '5000')).toBe('under');
    });

    it('returns over when actual is more than 5% above estimate', () => {
      // 6% over
      expect(calculateBudgetStatus('10000', '10600')).toBe('over');
      // 10% over
      expect(calculateBudgetStatus('10000', '11000')).toBe('over');
      // 50% over
      expect(calculateBudgetStatus('10000', '15000')).toBe('over');
    });

    it('handles string values correctly', () => {
      expect(calculateBudgetStatus('10000.00', '8500.00')).toBe('under');
      expect(calculateBudgetStatus('10000.00', '12500.00')).toBe('over');
    });

    it('handles number values correctly', () => {
      expect(calculateBudgetStatus(10000, 8500)).toBe('under');
      expect(calculateBudgetStatus(10000, 12500)).toBe('over');
    });

    it('handles edge case at exactly 5% boundary', () => {
      // Exactly -5%: returns 'under' (boundary inclusive)
      expect(calculateBudgetStatus('10000', '9500')).toBe('under');
      // Just above -5%: should be on-target
      expect(calculateBudgetStatus('10000', '9501')).toBe('on-target');
      // Exactly +5%: returns 'over' (boundary inclusive)
      expect(calculateBudgetStatus('10000', '10500')).toBe('over');
      // Just under +5%: should be on-target
      expect(calculateBudgetStatus('10000', '10499')).toBe('on-target');
    });
  });

  describe('getNextStatusActions', () => {
    it('returns empty array when status is null', () => {
      expect(getNextStatusActions(null)).toEqual([]);
    });

    it('returns correct transitions for quoting', () => {
      const result = getNextStatusActions('quoting');
      expect(result).toEqual(['approved', 'cancelled']);
    });

    it('returns correct transitions for approved', () => {
      const result = getNextStatusActions('approved');
      expect(result).toEqual(['in_progress', 'on_hold', 'cancelled']);
    });

    it('returns correct transitions for in_progress', () => {
      const result = getNextStatusActions('in_progress');
      expect(result).toEqual(['on_hold', 'completed', 'cancelled']);
    });

    it('returns correct transitions for on_hold', () => {
      const result = getNextStatusActions('on_hold');
      expect(result).toEqual(['in_progress', 'cancelled']);
    });

    it('returns empty array for completed (terminal state)', () => {
      const result = getNextStatusActions('completed');
      expect(result).toEqual([]);
    });

    it('returns empty array for cancelled (terminal state)', () => {
      const result = getNextStatusActions('cancelled');
      expect(result).toEqual([]);
    });

    it('does not allow going backwards to quoting', () => {
      // From any state, you cannot go back to quoting
      expect(getNextStatusActions('approved')).not.toContain('quoting');
      expect(getNextStatusActions('in_progress')).not.toContain('quoting');
      expect(getNextStatusActions('on_hold')).not.toContain('quoting');
      expect(getNextStatusActions('completed')).not.toContain('quoting');
      expect(getNextStatusActions('cancelled')).not.toContain('quoting');
    });

    it('allows cancellation from most states', () => {
      expect(getNextStatusActions('quoting')).toContain('cancelled');
      expect(getNextStatusActions('approved')).toContain('cancelled');
      expect(getNextStatusActions('in_progress')).toContain('cancelled');
      expect(getNextStatusActions('on_hold')).toContain('cancelled');
    });
  });

  describe('calculateTaskCounts', () => {
    it('returns zeros for empty task array', () => {
      const result = calculateTaskCounts([]);
      expect(result.completedTasks).toBe(0);
      expect(result.totalTasks).toBe(0);
    });

    it('counts total tasks correctly', () => {
      const tasks = [
        { status: 'pending' },
        { status: 'in_progress' },
        { status: 'completed' },
      ];
      const result = calculateTaskCounts(tasks);
      expect(result.totalTasks).toBe(3);
    });

    it('counts completed tasks correctly', () => {
      const tasks = [
        { status: 'pending' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'in_progress' },
        { status: 'completed' },
      ];
      const result = calculateTaskCounts(tasks);
      expect(result.completedTasks).toBe(3);
    });

    it('handles all pending tasks', () => {
      const tasks = [
        { status: 'pending' },
        { status: 'pending' },
        { status: 'pending' },
      ];
      const result = calculateTaskCounts(tasks);
      expect(result.completedTasks).toBe(0);
      expect(result.totalTasks).toBe(3);
    });

    it('handles all completed tasks', () => {
      const tasks = [
        { status: 'completed' },
        { status: 'completed' },
      ];
      const result = calculateTaskCounts(tasks);
      expect(result.completedTasks).toBe(2);
      expect(result.totalTasks).toBe(2);
    });

    it('handles tasks without status field', () => {
      const tasks = [
        { status: 'completed' },
        { id: '123' }, // No status
        { status: 'pending' },
      ];
      const result = calculateTaskCounts(tasks as Array<{ status?: string }>);
      expect(result.completedTasks).toBe(1);
      expect(result.totalTasks).toBe(3);
    });

    it('handles blocked tasks', () => {
      const tasks = [
        { status: 'completed' },
        { status: 'blocked' },
        { status: 'in_progress' },
      ];
      const result = calculateTaskCounts(tasks);
      expect(result.completedTasks).toBe(1);
      expect(result.totalTasks).toBe(3);
    });
  });

  describe('STATUS_TRANSITIONS validation', () => {
    it('has exactly 6 statuses defined', () => {
      expect(Object.keys(STATUS_TRANSITIONS)).toHaveLength(6);
    });

    it('has all expected statuses', () => {
      const statuses = Object.keys(STATUS_TRANSITIONS);
      expect(statuses).toContain('quoting');
      expect(statuses).toContain('approved');
      expect(statuses).toContain('in_progress');
      expect(statuses).toContain('on_hold');
      expect(statuses).toContain('completed');
      expect(statuses).toContain('cancelled');
    });

    it('terminal states have no transitions', () => {
      expect(STATUS_TRANSITIONS.completed).toHaveLength(0);
      expect(STATUS_TRANSITIONS.cancelled).toHaveLength(0);
    });

    it('all transitions point to valid statuses', () => {
      const validStatuses = Object.keys(STATUS_TRANSITIONS);
      Object.values(STATUS_TRANSITIONS).forEach((transitions) => {
        transitions.forEach((target) => {
          expect(validStatuses).toContain(target);
        });
      });
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  formatProjectTaskDueDate,
  getProjectTaskInitials,
} from '@/components/domain/jobs/projects/project-task-display-utils';

describe('project task display utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 17, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats missing and invalid due dates without throwing', () => {
    expect(formatProjectTaskDueDate(null)).toEqual({
      text: 'No due date',
      isOverdue: false,
      isSoon: false,
    });

    expect(formatProjectTaskDueDate('not-a-date')).toEqual({
      text: 'Invalid due date',
      isOverdue: false,
      isSoon: false,
    });
  });

  it('formats near due dates with operator-friendly labels', () => {
    expect(formatProjectTaskDueDate(new Date(2026, 4, 17, 17))).toEqual({
      text: 'Due today',
      isOverdue: false,
      isSoon: true,
    });

    expect(formatProjectTaskDueDate(new Date(2026, 4, 18, 9).toISOString())).toEqual({
      text: 'Due tomorrow',
      isOverdue: false,
      isSoon: true,
    });

    expect(formatProjectTaskDueDate(new Date(2026, 4, 20, 12))).toEqual({
      text: 'May 20',
      isOverdue: false,
      isSoon: true,
    });
  });

  it('formats overdue and later due dates consistently', () => {
    expect(formatProjectTaskDueDate(new Date(2026, 4, 16, 12))).toEqual({
      text: 'Overdue by 1 day',
      isOverdue: true,
      isSoon: false,
    });

    expect(formatProjectTaskDueDate(new Date(2026, 4, 15, 12))).toEqual({
      text: 'Overdue by 2 days',
      isOverdue: true,
      isSoon: false,
    });

    expect(formatProjectTaskDueDate(new Date(2026, 4, 21, 12))).toEqual({
      text: 'May 21, 2026',
      isOverdue: false,
      isSoon: false,
    });
  });

  it('builds initials from operator names and falls back for blank names', () => {
    expect(getProjectTaskInitials('Joel Chan')).toBe('JC');
    expect(getProjectTaskInitials('  single  ')).toBe('S');
    expect(getProjectTaskInitials('')).toBe('?');
    expect(getProjectTaskInitials(undefined)).toBe('?');
  });
});

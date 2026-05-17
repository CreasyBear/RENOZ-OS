import { describe, expect, it } from 'vitest';

import {
  formatTimelineTaskDates,
  getTimelineDates,
  TIMELINE_STATUS_CONFIG,
  VIEW_MODE_CONFIG,
} from '@/components/domain/jobs/projects/project-timeline-gantt-config';

describe('project timeline gantt config', () => {
  it('builds date ranges from the configured view mode lengths', () => {
    const start = new Date(2026, 4, 18);

    expect(getTimelineDates(start, 'week')).toHaveLength(VIEW_MODE_CONFIG.week.days);
    expect(getTimelineDates(start, 'month')).toHaveLength(VIEW_MODE_CONFIG.month.days);

    const quarterDates = getTimelineDates(start, 'quarter');
    expect(quarterDates).toHaveLength(90);
    expect(quarterDates[0]).toEqual(start);
    expect(quarterDates[89]).toEqual(new Date(2026, 7, 15));
  });

  it('formats task date ranges without duplicating month and year noise', () => {
    expect(formatTimelineTaskDates(new Date(2026, 4, 18), new Date(2026, 4, 20))).toBe('May 18 - 20');
    expect(formatTimelineTaskDates(new Date(2026, 4, 30), new Date(2026, 5, 2))).toBe('May 30 - Jun 2');
    expect(formatTimelineTaskDates(new Date(2026, 11, 30), new Date(2027, 0, 2))).toBe(
      'Dec 30, 2026 - Jan 2, 2027'
    );
  });

  it('keeps timeline-specific status styling centralized', () => {
    expect(TIMELINE_STATUS_CONFIG.todo.label).toBe('To Do');
    expect(TIMELINE_STATUS_CONFIG.in_progress.bar).toBe('bg-blue-500');
    expect(TIMELINE_STATUS_CONFIG.completed.bg).toBe('bg-green-50');
    expect(TIMELINE_STATUS_CONFIG.blocked.border).toBe('border-red-200');
  });
});

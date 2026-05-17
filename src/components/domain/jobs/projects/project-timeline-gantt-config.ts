import { addDays, format } from 'date-fns';

import type { ProjectTimelineTask } from '@/lib/schemas/jobs/project-detail';

export type TimelineTask = ProjectTimelineTask;

export type TimelineStatus = TimelineTask['status'];

export type ViewMode = 'day' | 'week' | 'month' | 'quarter';

export const VIEW_MODE_CONFIG: Record<ViewMode, { days: number; baseCellWidth: number; label: string }> = {
  day: { days: 14, baseCellWidth: 72, label: '2 weeks' },
  week: { days: 7, baseCellWidth: 60, label: 'Week' },
  month: { days: 30, baseCellWidth: 36, label: 'Month' },
  quarter: { days: 90, baseCellWidth: 20, label: 'Quarter' },
};

export const TIMELINE_STATUS_CONFIG: Record<
  TimelineStatus,
  { label: string; bg: string; border: string; text: string; bar: string }
> = {
  todo: {
    label: 'To Do',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    text: 'text-slate-700',
    bar: 'bg-slate-400',
  },
  in_progress: {
    label: 'In Progress',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    bar: 'bg-blue-500',
  },
  completed: {
    label: 'Completed',
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    bar: 'bg-green-500',
  },
  blocked: {
    label: 'Blocked',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    bar: 'bg-red-500',
  },
};

export const NAME_COLUMN_WIDTH = 220;
export const ROW_HEIGHT = 48;
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2;

export function getTimelineDates(viewStart: Date, viewMode: ViewMode): Date[] {
  const { days } = VIEW_MODE_CONFIG[viewMode];
  return Array.from({ length: days }, (_, i) => addDays(viewStart, i));
}

export function formatTimelineTaskDates(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();

  if (sameMonth && sameYear) {
    return `${format(start, 'MMM d')} - ${format(end, 'd')}`;
  }
  if (sameYear) {
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d')}`;
  }
  return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
}

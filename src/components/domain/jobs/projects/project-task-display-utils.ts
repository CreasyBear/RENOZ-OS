import {
  addDays,
  differenceInCalendarDays,
  format,
  isToday,
  isTomorrow,
} from 'date-fns';

export interface ProjectTaskDueDateDisplay {
  text: string;
  isOverdue: boolean;
  isSoon: boolean;
}

export function formatProjectTaskDueDate(
  date: Date | string | null | undefined
): ProjectTaskDueDateDisplay {
  if (!date) return { text: 'No due date', isOverdue: false, isSoon: false };

  const dueDate = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(dueDate.getTime())) {
    return { text: 'Invalid due date', isOverdue: false, isSoon: false };
  }

  const today = new Date();

  if (isToday(dueDate)) return { text: 'Due today', isOverdue: false, isSoon: true };
  if (isTomorrow(dueDate)) return { text: 'Due tomorrow', isOverdue: false, isSoon: true };

  const daysOverdue = differenceInCalendarDays(today, dueDate);

  if (daysOverdue > 0) {
    const unit = daysOverdue === 1 ? 'day' : 'days';
    return { text: `Overdue by ${daysOverdue} ${unit}`, isOverdue: true, isSoon: false };
  }

  if (dueDate <= addDays(today, 3)) return { text: format(dueDate, 'MMM d'), isOverdue: false, isSoon: true };

  return { text: format(dueDate, 'MMM d, yyyy'), isOverdue: false, isSoon: false };
}

export function getProjectTaskInitials(name: string | null | undefined): string {
  const trimmedName = name?.trim();
  if (!trimmedName) return '?';

  return trimmedName
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

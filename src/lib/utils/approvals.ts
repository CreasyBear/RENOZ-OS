/**
 * Approval Utilities
 *
 * Shared utility functions for approval workflows.
 */

/**
 * Determine priority based on due date proximity.
 * Uses hours-based calculation for more granular priority assignment.
 */
export function determinePriority(dueAt: Date | null | undefined): 'low' | 'medium' | 'high' | 'urgent' {
  if (!dueAt) return 'medium';

  const now = new Date();
  const due = dueAt instanceof Date ? dueAt : new Date(dueAt);
  const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilDue < 0) return 'urgent'; // Overdue
  if (hoursUntilDue < 24) return 'high'; // Due within 24 hours
  if (hoursUntilDue < 72) return 'medium'; // Due within 3 days
  return 'low';
}

/**
 * Calculate days overdue from a due date
 */
export function getDaysOverdue(dueDate: string | Date | null | undefined): number | null {
  if (!dueDate) return null;
  const due = dueDate instanceof Date ? dueDate : new Date(dueDate);
  const now = new Date();
  const diffMs = now.getTime() - due.getTime();
  if (diffMs < 0) return null; // Not overdue
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

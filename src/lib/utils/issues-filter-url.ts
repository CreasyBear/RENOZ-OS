/**
 * Issues Filter URL Transform Utilities
 *
 * Pure functions for syncing IssueFiltersState with URL search params.
 * Supports multi-value status/priority (comma-separated) and assignedTo (me/unassigned).
 *
 * @see src/routes/_authenticated/support/issues/issues-page.tsx
 */

import type { IssueStatus, IssuePriority } from '@/lib/schemas/support/issues';
import type { IssueFiltersState } from '@/lib/schemas/support/issues';

const VALID_STATUS = new Set<string>([
  'open',
  'in_progress',
  'pending',
  'on_hold',
  'escalated',
  'resolved',
  'closed',
]);
const VALID_PRIORITY = new Set<string>(['low', 'medium', 'high', 'critical']);

export interface IssuesSearchParams {
  search?: string;
  status?: string;
  priority?: string;
  slaStatus?: string;
  escalated?: boolean;
  assignedToUserId?: string;
  assignedToFilter?: 'me' | 'unassigned';
}

function parseCommaList(value: string | undefined, valid: Set<string>): string[] {
  if (!value?.trim()) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => valid.has(s));
}

/** Transform URL search params to IssueFiltersState */
export function fromUrlParams(
  search: IssuesSearchParams
): IssueFiltersState & { slaStatus?: string; escalated?: boolean; assignedToUserId?: string; assignedToFilter?: string } {
  return {
    search: search.search ?? '',
    status: parseCommaList(search.status, VALID_STATUS) as IssueStatus[],
    priority: parseCommaList(search.priority, VALID_PRIORITY) as IssuePriority[],
    assignedTo: search.assignedToFilter ?? search.assignedToUserId ?? null,
    customerId: null,
    slaStatus: search.slaStatus,
    escalated: search.escalated,
    assignedToUserId: search.assignedToUserId,
    assignedToFilter: search.assignedToFilter,
  };
}

/** Transform IssueFiltersState to URL search params */
export function toUrlParams(
  filters: IssueFiltersState & { slaStatus?: string; escalated?: boolean; assignedToUserId?: string; assignedToFilter?: string }
): Record<string, unknown> {
  const isMe = filters.assignedTo === 'me';
  const isUnassigned = filters.assignedTo === 'unassigned';
  const isUser =
    filters.assignedTo &&
    filters.assignedTo !== 'me' &&
    filters.assignedTo !== 'unassigned';
  return {
    search: filters.search || undefined,
    status: filters.status.length > 0 ? filters.status.join(',') : undefined,
    priority: filters.priority.length > 0 ? filters.priority.join(',') : undefined,
    slaStatus: filters.slaStatus,
    escalated: filters.escalated,
    assignedToUserId: isUser ? filters.assignedTo : undefined,
    assignedToFilter: isMe ? 'me' : isUnassigned ? 'unassigned' : undefined,
  };
}

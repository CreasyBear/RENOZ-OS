/**
 * Issues Filter URL Transform Utilities
 *
 * Pure functions for syncing IssueFiltersState with URL search params.
 * Supports multi-value status/priority (comma-separated) and assignedTo (me/unassigned).
 *
 * @see src/routes/_authenticated/support/issues/issues-page.tsx
 */

import type { IssueStatus, IssuePriority } from '@/lib/schemas/support/issues';
import type {
  IssueFiltersState,
  IssueLineageState,
  IssueNextActionType,
  IssueRmaState,
} from '@/lib/schemas/support/issues';

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
  nextActionType?: IssueNextActionType;
  rmaState?: IssueRmaState;
  serialState?: IssueLineageState;
  warrantyState?: IssueLineageState;
  orderState?: IssueLineageState;
  serviceSystemState?: IssueLineageState;
  hasSerial?: boolean;
  hasWarranty?: boolean;
  hasOrder?: boolean;
  hasServiceSystem?: boolean;
  assignedToUserId?: string;
  assignedToFilter?: 'me' | 'unassigned';
}

function parseLineageState(
  state: IssueLineageState | undefined,
  legacyFlag: boolean | undefined
): IssueLineageState {
  if (state) return state;
  if (legacyFlag === true) return 'present';
  return 'any';
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
): IssueFiltersState & {
  slaStatus?: string;
  escalated?: boolean;
  assignedToUserId?: string;
  assignedToFilter?: string;
} {
  return {
    search: search.search ?? '',
    status: parseCommaList(search.status, VALID_STATUS) as IssueStatus[],
    priority: parseCommaList(search.priority, VALID_PRIORITY) as IssuePriority[],
    assignedTo: search.assignedToFilter ?? search.assignedToUserId ?? null,
    customerId: null,
    nextActionType: search.nextActionType ?? null,
    rmaState: search.rmaState ?? 'any',
    serialState: parseLineageState(search.serialState, search.hasSerial),
    warrantyState: parseLineageState(search.warrantyState, search.hasWarranty),
    orderState: parseLineageState(search.orderState, search.hasOrder),
    serviceSystemState: parseLineageState(
      search.serviceSystemState,
      search.hasServiceSystem
    ),
    slaStatus: search.slaStatus,
    escalated: search.escalated,
    assignedToUserId: search.assignedToUserId,
    assignedToFilter: search.assignedToFilter,
  };
}

/** Transform IssueFiltersState to URL search params */
export function toUrlParams(
  filters: IssueFiltersState & {
    slaStatus?: string;
    escalated?: boolean;
    assignedToUserId?: string;
    assignedToFilter?: string;
  }
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
    nextActionType: filters.nextActionType ?? undefined,
    rmaState: filters.rmaState !== 'any' ? filters.rmaState : undefined,
    serialState: filters.serialState !== 'any' ? filters.serialState : undefined,
    warrantyState: filters.warrantyState !== 'any' ? filters.warrantyState : undefined,
    orderState: filters.orderState !== 'any' ? filters.orderState : undefined,
    serviceSystemState:
      filters.serviceSystemState !== 'any' ? filters.serviceSystemState : undefined,
    assignedToUserId: isUser ? filters.assignedTo : undefined,
    assignedToFilter: isMe ? 'me' : isUnassigned ? 'unassigned' : undefined,
  };
}

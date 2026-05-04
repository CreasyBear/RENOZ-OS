import type { IssueStatus } from '@/lib/schemas/support/issues';

export type IssueDetailPrimaryAction = 'start' | 'resolve' | 'close';

export interface IssueDetailActionPolicy {
  canStart: boolean;
  canDeEscalate: boolean;
  canHold: boolean;
  canEscalate: boolean;
  canResolve: boolean;
  canClose: boolean;
  canDelete: boolean;
  showRmaSection: boolean;
  primaryAction: IssueDetailPrimaryAction | null;
}

export function getIssueDetailActionPolicy({
  status,
  hasRmaAnchor,
}: {
  status: IssueStatus;
  hasRmaAnchor: boolean;
}): IssueDetailActionPolicy {
  const isResolvedOrClosed = status === 'resolved' || status === 'closed';
  const canDeEscalate = status === 'escalated';
  const canStart = !isResolvedOrClosed && status !== 'in_progress' && !canDeEscalate;
  const canResolve = !isResolvedOrClosed && !canDeEscalate;
  const canClose = status === 'resolved';

  const primaryAction: IssueDetailPrimaryAction | null = canStart
    ? 'start'
    : canResolve
      ? 'resolve'
      : canClose
        ? 'close'
        : null;

  return {
    canStart,
    canDeEscalate,
    canHold: !isResolvedOrClosed && status !== 'on_hold' && !canDeEscalate,
    canEscalate: !isResolvedOrClosed && !canDeEscalate,
    canResolve,
    canClose,
    canDelete: status !== 'in_progress' && !canDeEscalate,
    showRmaSection: isResolvedOrClosed && hasRmaAnchor,
    primaryAction,
  };
}

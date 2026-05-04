import { AlertTriangle, ArrowDown, CheckCircle, ChevronLeft, Pause, Play } from 'lucide-react';

import type {
  EntityHeaderAction,
  EntityHeaderProps,
} from '@/components/shared/detail-view/entity-header';
import type { IssueStatus } from '@/lib/schemas/support/issues';
import type { IssueDetailActionPolicy } from './issue-detail-action-policy';

interface IssueHeaderActionsInput {
  actionPolicy: IssueDetailActionPolicy;
  onBack: () => void;
  onStatusChange: (status: IssueStatus) => void;
  isUpdatePending: boolean;
  isDeEscalatePending: boolean;
}

interface IssueHeaderActions {
  primaryAction: EntityHeaderProps['primaryAction'];
  secondaryActions: EntityHeaderAction[];
}

export function getIssueHeaderActions({
  actionPolicy,
  onBack,
  onStatusChange,
  isUpdatePending,
  isDeEscalatePending,
}: IssueHeaderActionsInput): IssueHeaderActions {
  const primaryAction =
    actionPolicy.primaryAction === 'start'
      ? {
          label: 'Start Working',
          onClick: () => onStatusChange('in_progress'),
          icon: <Play className="h-4 w-4" aria-hidden="true" />,
          disabled: isUpdatePending,
        }
      : actionPolicy.primaryAction === 'resolve'
        ? {
            label: 'Resolve',
            onClick: () => onStatusChange('resolved'),
            icon: <CheckCircle className="h-4 w-4" aria-hidden="true" />,
            disabled: isUpdatePending,
          }
        : actionPolicy.primaryAction === 'close'
          ? {
              label: 'Close Issue',
              onClick: () => onStatusChange('closed'),
              icon: <CheckCircle className="h-4 w-4" aria-hidden="true" />,
              disabled: isUpdatePending,
            }
          : undefined;

  const secondaryActions: EntityHeaderAction[] = [
    {
      label: 'Back to Issues',
      onClick: onBack,
      icon: <ChevronLeft className="h-4 w-4" aria-hidden="true" />,
    },
    ...(actionPolicy.canDeEscalate
      ? [
          {
            label: 'De-escalate',
            onClick: () => onStatusChange('in_progress'),
            icon: <ArrowDown className="h-4 w-4" aria-hidden="true" />,
            disabled: isUpdatePending || isDeEscalatePending,
          },
        ]
      : []),
    ...(actionPolicy.canHold
      ? [
          {
            label: 'Put On Hold',
            onClick: () => onStatusChange('on_hold'),
            icon: <Pause className="h-4 w-4" aria-hidden="true" />,
            disabled: isUpdatePending,
          },
        ]
      : []),
    ...(actionPolicy.canEscalate
      ? [
          {
            label: 'Escalate',
            onClick: () => onStatusChange('escalated'),
            icon: <AlertTriangle className="h-4 w-4" aria-hidden="true" />,
            disabled: isUpdatePending,
            destructive: true,
          },
        ]
      : []),
  ];

  return {
    primaryAction,
    secondaryActions,
  };
}

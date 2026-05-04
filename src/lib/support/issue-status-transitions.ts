import type { IssueStatus } from '@/lib/schemas/support/issues';

export interface GenericIssueStatusUpdateBlocker {
  message: string;
}

export function getGenericIssueStatusUpdateBlocker({
  existingStatus,
  nextStatus,
}: {
  existingStatus: IssueStatus;
  nextStatus?: IssueStatus | null;
}): GenericIssueStatusUpdateBlocker | null {
  if (!nextStatus || nextStatus === existingStatus) return null;

  if (nextStatus === 'escalated') {
    return {
      message:
        'Escalate issues through the escalation workflow so reason, assignee, and escalation history are captured.',
    };
  }

  if (existingStatus === 'escalated') {
    return {
      message:
        'De-escalate this issue before changing status so escalation history is captured.',
    };
  }

  return null;
}

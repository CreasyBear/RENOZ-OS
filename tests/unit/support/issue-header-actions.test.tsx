import { describe, expect, it, vi } from 'vitest';

import { getIssueHeaderActions } from '@/components/domain/support/issues/issue-header-actions';
import type { IssueDetailActionPolicy } from '@/components/domain/support/issues/issue-detail-action-policy';

const activePolicy: IssueDetailActionPolicy = {
  canStart: true,
  canDeEscalate: false,
  canHold: true,
  canEscalate: true,
  canResolve: true,
  canClose: false,
  canDelete: true,
  showRmaSection: false,
  primaryAction: 'start',
};

describe('issue header actions', () => {
  it('maps an open issue to start, back, hold, and escalation actions', () => {
    const onBack = vi.fn();
    const onStatusChange = vi.fn();

    const actions = getIssueHeaderActions({
      actionPolicy: activePolicy,
      onBack,
      onStatusChange,
      isUpdatePending: false,
      isDeEscalatePending: false,
    });

    expect(actions.primaryAction?.label).toBe('Start Working');
    expect(actions.primaryAction?.disabled).toBe(false);
    actions.primaryAction?.onClick();
    expect(onStatusChange).toHaveBeenCalledWith('in_progress');

    expect(actions.secondaryActions.map((action) => action.label)).toEqual([
      'Back to Issues',
      'Put On Hold',
      'Escalate',
    ]);

    actions.secondaryActions[0].onClick();
    actions.secondaryActions[1].onClick();
    actions.secondaryActions[2].onClick();

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenNthCalledWith(2, 'on_hold');
    expect(onStatusChange).toHaveBeenNthCalledWith(3, 'escalated');
    expect(actions.secondaryActions[2].destructive).toBe(true);
  });

  it('maps resolved issues to a close primary action without active workflow actions', () => {
    const onStatusChange = vi.fn();
    const resolvedPolicy: IssueDetailActionPolicy = {
      canStart: false,
      canDeEscalate: false,
      canHold: false,
      canEscalate: false,
      canResolve: false,
      canClose: true,
      canDelete: true,
      showRmaSection: true,
      primaryAction: 'close',
    };

    const actions = getIssueHeaderActions({
      actionPolicy: resolvedPolicy,
      onBack: vi.fn(),
      onStatusChange,
      isUpdatePending: false,
      isDeEscalatePending: false,
    });

    expect(actions.primaryAction?.label).toBe('Close Issue');
    actions.primaryAction?.onClick();
    expect(onStatusChange).toHaveBeenCalledWith('closed');
    expect(actions.secondaryActions.map((action) => action.label)).toEqual([
      'Back to Issues',
    ]);
  });

  it('keeps escalated issues on de-escalation and respects pending state', () => {
    const onStatusChange = vi.fn();
    const escalatedPolicy: IssueDetailActionPolicy = {
      canStart: false,
      canDeEscalate: true,
      canHold: false,
      canEscalate: false,
      canResolve: false,
      canClose: false,
      canDelete: false,
      showRmaSection: false,
      primaryAction: null,
    };

    const actions = getIssueHeaderActions({
      actionPolicy: escalatedPolicy,
      onBack: vi.fn(),
      onStatusChange,
      isUpdatePending: false,
      isDeEscalatePending: true,
    });

    expect(actions.primaryAction).toBeUndefined();
    expect(actions.secondaryActions.map((action) => action.label)).toEqual([
      'Back to Issues',
      'De-escalate',
    ]);
    expect(actions.secondaryActions[1].disabled).toBe(true);

    actions.secondaryActions[1].onClick();
    expect(onStatusChange).toHaveBeenCalledWith('in_progress');
  });

  it('disables primary and mutable secondary actions during issue updates', () => {
    const actions = getIssueHeaderActions({
      actionPolicy: activePolicy,
      onBack: vi.fn(),
      onStatusChange: vi.fn(),
      isUpdatePending: true,
      isDeEscalatePending: false,
    });

    expect(actions.primaryAction?.disabled).toBe(true);
    expect(actions.secondaryActions.find((action) => action.label === 'Back to Issues')?.disabled)
      .toBeUndefined();
    expect(actions.secondaryActions.find((action) => action.label === 'Put On Hold')?.disabled)
      .toBe(true);
    expect(actions.secondaryActions.find((action) => action.label === 'Escalate')?.disabled)
      .toBe(true);
  });
});

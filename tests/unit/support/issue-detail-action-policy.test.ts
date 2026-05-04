import { describe, expect, it } from 'vitest';

import { getIssueDetailActionPolicy } from '@/components/domain/support/issues/issue-detail-action-policy';

describe('issue detail action policy', () => {
  it('keeps escalated issues on the de-escalation workflow path', () => {
    const policy = getIssueDetailActionPolicy({
      status: 'escalated',
      hasRmaAnchor: true,
    });

    expect(policy).toMatchObject({
      canStart: false,
      canDeEscalate: true,
      canHold: false,
      canEscalate: false,
      canResolve: false,
      canClose: false,
      canDelete: false,
      showRmaSection: false,
      primaryAction: null,
    });
  });

  it('allows ordinary active issue workflow actions', () => {
    expect(
      getIssueDetailActionPolicy({
        status: 'open',
        hasRmaAnchor: false,
      })
    ).toMatchObject({
      canStart: true,
      canDeEscalate: false,
      canHold: true,
      canEscalate: true,
      canResolve: true,
      canClose: false,
      canDelete: true,
      showRmaSection: false,
      primaryAction: 'start',
    });

    expect(
      getIssueDetailActionPolicy({
        status: 'in_progress',
        hasRmaAnchor: false,
      }).primaryAction
    ).toBe('resolve');
  });

  it('keeps resolved and closed affordances distinct', () => {
    expect(
      getIssueDetailActionPolicy({
        status: 'resolved',
        hasRmaAnchor: true,
      })
    ).toMatchObject({
      canStart: false,
      canResolve: false,
      canClose: true,
      canDelete: true,
      showRmaSection: true,
      primaryAction: 'close',
    });

    expect(
      getIssueDetailActionPolicy({
        status: 'closed',
        hasRmaAnchor: true,
      })
    ).toMatchObject({
      canClose: false,
      canDelete: true,
      showRmaSection: true,
      primaryAction: null,
    });
  });
});

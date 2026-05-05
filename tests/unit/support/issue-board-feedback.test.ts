import { describe, expect, it } from 'vitest';

import {
  formatIssueBoardBulkFailureToast,
  formatIssueBoardMutationError,
  formatIssueBoardTransitionFailureToast,
} from '@/components/domain/support/issues/issue-board-feedback';

describe('issue board feedback formatting', () => {
  it('suppresses unsafe infrastructure messages', () => {
    expect(
      formatIssueBoardMutationError(
        {
          statusCode: 500,
          message: 'duplicate key value violates unique constraint issues_issue_number_key',
        },
        'Failed to update issue status'
      )
    ).toBe('Failed to update issue status');
  });

  it('keeps safe validation and workflow messages actionable', () => {
    expect(
      formatIssueBoardMutationError(
        {
          statusCode: 400,
          errors: {
            resolutionNotes: ['Resolution notes are required before resolving.'],
          },
        },
        'Failed to update issue status'
      )
    ).toBe('Resolution notes are required before resolving.');

    expect(
      formatIssueBoardMutationError(
        new Error(
          'Resolve issues from the detail page so structured resolution details can be captured.'
        ),
        'Failed to update issue'
      )
    ).toBe('Resolve issues from the detail page so structured resolution details can be captured.');
  });

  it('formats transition and bulk failure toasts from sanitized messages', () => {
    expect(formatIssueBoardTransitionFailureToast('ISS-001', 'Refresh and try again.')).toBe(
      'Failed to move ISS-001: Refresh and try again.'
    );

    expect(
      formatIssueBoardBulkFailureToast([
        { issueLabel: 'ISS-001', message: 'Refresh and try again.' },
        { issueLabel: 'ISS-002', message: 'Failed to update issue' },
        { issueLabel: 'ISS-003', message: 'Failed to update issue' },
        { issueLabel: 'ISS-004', message: 'Failed to update issue' },
      ])
    ).toBe(
      '4 updates failed (ISS-001: Refresh and try again. | ISS-002: Failed to update issue | ISS-003: Failed to update issue)'
    );
  });
});

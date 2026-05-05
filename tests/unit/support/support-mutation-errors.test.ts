import { describe, expect, it } from 'vitest';
import { formatSupportMutationError } from '@/hooks/support/_mutation-errors';

describe('support mutation error formatting', () => {
  it('uses operator-safe field validation messages', () => {
    const message = formatSupportMutationError(
      {
        statusCode: 400,
        errors: {
          resolutionNotes: ['Resolution notes are required before resolving.'],
        },
      },
      'Failed to update issue status'
    );

    expect(message).toBe('Resolution notes are required before resolving.');
  });

  it('maps known issue mutation codes', () => {
    expect(
      formatSupportMutationError(
        { statusCode: 400, code: 'transition_blocked' },
        'Failed to update issue status'
      )
    ).toBe('This issue cannot move to that status. Refresh and review the current issue state.');

    expect(
      formatSupportMutationError(
        { statusCode: 403, code: 'PERMISSION_DENIED' },
        'Failed to update issue status'
      )
    ).toBe('You do not have permission to update this issue.');
  });

  it('suppresses unsafe infrastructure messages', () => {
    const message = formatSupportMutationError(
      {
        statusCode: 500,
        message: 'duplicate key value violates unique constraint issues_issue_number_key',
      },
      'Failed to update issue status'
    );

    expect(message).toBe('Failed to update issue status');
  });
});

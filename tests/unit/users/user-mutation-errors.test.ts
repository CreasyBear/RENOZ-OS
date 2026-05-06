import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatUserMutationError,
  isUnsafeUserMutationMessage,
} from '@/hooks/users/user-mutation-error-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('user administration mutation errors', () => {
  it('keeps known code and safe validation copy', () => {
    expect(
      formatUserMutationError(
        { statusCode: 403, code: 'PERMISSION_DENIED' },
        'deactivateUser'
      )
    ).toBe('You do not have permission to manage users.');

    expect(
      formatUserMutationError(
        {
          statusCode: 400,
          errors: {
            email: ['An invitation for this email is already pending.'],
          },
        },
        'sendInvitation'
      )
    ).toBe('An invitation for this email is already pending.');

    expect(
      formatUserMutationError(
        new Error('This invitation has expired. Ask an administrator for a new invitation.'),
        'acceptInvitation'
      )
    ).toBe('This invitation has expired. Ask an administrator for a new invitation.');
  });

  it('suppresses unsafe infrastructure and implementation messages', () => {
    expect(
      formatUserMutationError(
        new Error('duplicate key value violates unique constraint user_invitations_email_key'),
        'sendInvitation'
      )
    ).toBe('Invitation sending is temporarily unavailable. Please refresh and try again.');

    expect(
      formatUserMutationError(
        {
          statusCode: 400,
          message: 'TypeError: Cannot read properties of undefined (reading userId)',
        },
        'updateUser'
      )
    ).toBe('User update is temporarily unavailable. Please refresh and try again.');

    expect(
      formatUserMutationError(
        {
          statusCode: 400,
          errors: {
            role: ['SQL syntax error at or near "auth_users"'],
          },
        },
        'bulkUpdateUsers'
      )
    ).toBe('Bulk user update is temporarily unavailable. Please refresh and try again.');

    expect(
      formatUserMutationError(
        {
          statusCode: 400,
          message: 'at transferOwnership (users.ts:42:7)',
        },
        'transferOwnership'
      )
    ).toBe('Ownership transfer is temporarily unavailable. Please refresh and try again.');

    expect(isUnsafeUserMutationMessage('ReferenceError: sessionToken is not defined')).toBe(true);
  });

  it('keeps user admin hooks behind user-owned formatter copy', () => {
    const index = read('src/hooks/users/index.ts');
    const sessions = read('src/hooks/users/use-sessions.ts');
    const invitations = read('src/hooks/users/use-invitations.ts');
    const users = read('src/hooks/users/use-users.ts');

    expect(index).toContain('formatUserMutationError');
    expect(index).toContain('isUnsafeUserMutationMessage');

    expect(sessions).toContain("formatUserMutationError(error, 'terminateSession')");
    expect(sessions).toContain("formatUserMutationError(error, 'terminateOtherSessions')");
    expect(sessions).not.toContain("error instanceof Error ? error.message : 'Failed to terminate session'");
    expect(sessions).not.toContain("error instanceof Error ? error.message : 'Failed to terminate sessions'");

    expect(invitations).toContain("formatUserMutationError(error, 'acceptInvitation')");
    expect(invitations).toContain("formatUserMutationError(error, 'sendInvitation')");
    expect(invitations).toContain("formatUserMutationError(error, 'cancelInvitation')");
    expect(invitations).toContain("formatUserMutationError(error, 'resendInvitation')");
    expect(invitations).toContain("formatUserMutationError(error, 'batchSendInvitations')");
    expect(invitations).not.toContain("error instanceof Error ? error.message : 'Failed to accept invitation'");
    expect(invitations).not.toContain("error instanceof Error ? error.message : 'Failed to send invitation'");
    expect(invitations).not.toContain("error instanceof Error ? error.message : 'Failed to cancel invitation'");
    expect(invitations).not.toContain("error instanceof Error ? error.message : 'Failed to resend invitation'");
    expect(invitations).not.toContain("error instanceof Error ? error.message : 'Failed to send invitations'");

    expect(users).toContain("formatUserMutationError(error, 'exportUsers')");
    expect(users).not.toContain("error instanceof Error ? error.message : 'Failed to export users'");
  });

  it('keeps user admin pages and dialogs off raw mutation messages', () => {
    const list = read('src/routes/_authenticated/admin/users/users-page-container.tsx');
    const detail = read('src/routes/_authenticated/admin/users/user-detail-page.tsx');
    const invite = read('src/routes/_authenticated/admin/users/invite-page.tsx');
    const importPage = read('src/routes/_authenticated/admin/users/import-page.tsx');
    const inviteDialog = read('src/components/domain/users/user-invite-dialog.tsx');

    expect(list).toContain("formatUserMutationError(err, 'deactivateUser')");
    expect(list).toContain("formatUserMutationError(err, 'reactivateUser')");
    expect(list).toContain("formatUserMutationError(err, 'bulkUpdateUsers')");
    expect(list).toContain("formatUserMutationError(err, 'exportUsers')");
    expect(list).not.toContain("err instanceof Error ? err.message : 'Failed to deactivate user'");
    expect(list).not.toContain("err instanceof Error ? err.message : 'Failed to reactivate user'");
    expect(list).not.toContain("err instanceof Error ? err.message : 'Bulk update failed'");
    expect(list).not.toContain("err instanceof Error ? err.message : 'Export failed'");

    expect(detail).toContain("formatUserMutationError(err, 'addGroupMember')");
    expect(detail).toContain("formatUserMutationError(err, 'updateUser')");
    expect(detail).toContain("formatUserMutationError(err, 'deactivateUser')");
    expect(detail).toContain("formatUserMutationError(err, 'reactivateUser')");
    expect(detail).toContain("formatUserMutationError(err, 'transferOwnership')");
    expect(detail).not.toContain("err instanceof Error ? err.message : 'Failed to update user'");
    expect(detail).not.toContain("err instanceof Error ? err.message : 'Failed to deactivate user'");
    expect(detail).not.toContain("err instanceof Error ? err.message : 'Failed to reactivate user'");
    expect(detail).not.toContain("err instanceof Error ? err.message : 'Failed to transfer ownership'");

    expect(invite).toContain("formatUserMutationError(err, 'sendInvitation')");
    expect(invite).not.toContain("err instanceof Error ? err.message : 'Failed to send invitation'");

    expect(importPage).toContain("formatUserMutationError(err, 'batchSendInvitations')");
    expect(importPage).not.toContain("err instanceof Error ? err.message : 'Batch import failed'");

    expect(inviteDialog).toContain('The hook owns invitation failure copy');
    expect(inviteDialog).not.toContain("err instanceof Error ? err.message : 'Failed to send invitation'");
  });
});

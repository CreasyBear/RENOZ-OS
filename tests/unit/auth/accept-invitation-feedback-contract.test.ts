import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatAcceptInvitationError,
  isUnsafeAcceptInvitationMessage,
} from '@/hooks/auth/accept-invitation-error-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('accept invitation feedback', () => {
  it('keeps safe invitation guidance and suppresses auth/provider internals', () => {
    expect(formatAcceptInvitationError('Invalid invitation')).toBe(
      'This invitation link is invalid or no longer available.'
    );
    expect(
      formatAcceptInvitationError(
        'Invitation details are temporarily unavailable. Please refresh and try again.'
      )
    ).toBe('Invitation details are temporarily unavailable. Please refresh and try again.');
    expect(formatAcceptInvitationError('Invitation has expired')).toBe(
      'This invitation has expired. Ask an administrator for a new invitation.'
    );
    expect(formatAcceptInvitationError('Invitation has already been accepted')).toBe(
      'This invitation cannot be accepted in its current state. Ask an administrator for a new invitation.'
    );
    expect(formatAcceptInvitationError('Too many invitation attempts. Try later.')).toBe(
      'Too many invitation attempts. Please wait before trying again.'
    );
    expect(formatAcceptInvitationError('Password should be at least 8 characters')).toBe(
      'Please choose a stronger password.'
    );

    expect(
      formatAcceptInvitationError(
        new Error('Failed to activate account: supabase auth user rollback stack')
      )
    ).toBe('Invitation acceptance is temporarily unavailable. Please try again.');
    expect(formatAcceptInvitationError('duplicate key violates users_email_key')).toBe(
      'Invitation acceptance is temporarily unavailable. Please try again.'
    );
    expect(isUnsafeAcceptInvitationMessage('invitation token leaked in provider stack')).toBe(true);
  });

  it('keeps invitation route and form behind auth-owned feedback helpers', () => {
    const index = read('src/hooks/auth/index.ts');
    const route = read('src/routes/accept-invitation.tsx');
    const form = read('src/components/auth/accept-invitation-form.tsx');

    expect(index).toContain('formatAcceptInvitationError');
    expect(index).toContain('isUnsafeAcceptInvitationMessage');

    expect(route).toContain('formatAcceptInvitationError(invitationError)');
    expect(route).not.toContain('invitationError.message');

    expect(form).toContain('setGeneralError(formatAcceptInvitationError(err))');
    expect(form).not.toContain(
      "setGeneralError(err instanceof Error ? err.message : 'Failed to create account')"
    );
  });

  it('relies on sanitized auth hash/session exchange descriptions', () => {
    const route = read('src/routes/accept-invitation.tsx');
    const exchangeHook = read('src/lib/auth/use-exchange-hash-for-session.ts');

    expect(route).toContain('error_description: authError.description');
    expect(exchangeHook).toContain('formatAuthCallbackError(parsed.code, parsed.description)');
    expect(exchangeHook).toContain("formatAuthCallbackError('token_exchange_failed', err)");
    expect(exchangeHook).not.toContain('description: parsed.description');
    expect(exchangeHook).not.toContain('description: err instanceof Error ? err.message');
  });
});

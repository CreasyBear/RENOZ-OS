import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatMfaStatusError,
  MFA_STATUS_FALLBACK_MESSAGE,
} from '@/hooks/auth/mfa-error-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('MFA feedback contract', () => {
  it('formats MFA status failures without leaking provider or implementation copy', () => {
    expect(formatMfaStatusError(new Error('Auth session missing!'))).toBe(
      'Your session has expired. Sign in again before managing two-factor authentication.'
    );
    expect(formatMfaStatusError(new Error('Too many MFA attempts, 429'))).toBe(
      'Too many two-factor authentication requests were attempted. Wait a moment and try again.'
    );
    expect(
      formatMfaStatusError(new Error('supabase jwt access token failed for mfa aal2 stack'))
    ).toBe(MFA_STATUS_FALLBACK_MESSAGE);
    expect(formatMfaStatusError(new TypeError('Cannot read properties of undefined'))).toBe(
      MFA_STATUS_FALLBACK_MESSAGE
    );
  });

  it('keeps useMFA returned error behind the MFA formatter', () => {
    const hook = read('src/hooks/auth/use-mfa.ts');
    const enrollmentDialog = read('src/components/shared/mfa-enrollment-dialog.tsx');
    const disableDialog = read('src/components/shared/mfa-disable-dialog.tsx');

    expect(hook).toContain('formatMfaStatusError(query.error)');
    expect(hook).not.toContain('query.error?.message');
    expect(enrollmentDialog).toContain('error={error}');
    expect(disableDialog).toContain('{error && <p className="text-sm text-red-600">{error}</p>}');
  });
});

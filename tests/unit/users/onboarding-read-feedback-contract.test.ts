import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ONBOARDING_PROGRESS_CACHED_READ_FALLBACK_MESSAGE,
  ONBOARDING_PROGRESS_READ_FALLBACK_MESSAGE,
  getOnboardingProgressReadErrorMessage,
} from '@/components/shared/onboarding-read-error-messages';
import { normalizeReadQueryError } from '@/lib/read-path-policy';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('onboarding read feedback contract', () => {
  it('formats onboarding read failures without leaking unsafe internals', () => {
    const normalized = normalizeReadQueryError(
      {
        statusCode: 503,
        code: 'INTERNAL_ERROR',
        message: 'select from onboarding violates row level security policy',
      },
      {
        contractType: 'always-shaped',
        fallbackMessage: ONBOARDING_PROGRESS_READ_FALLBACK_MESSAGE,
      }
    );

    expect(getOnboardingProgressReadErrorMessage(normalized)).toBe(
      ONBOARDING_PROGRESS_READ_FALLBACK_MESSAGE
    );
    expect(
      getOnboardingProgressReadErrorMessage(
        new Error('TypeError: Cannot read properties of undefined')
      )
    ).toBe(ONBOARDING_PROGRESS_READ_FALLBACK_MESSAGE);
    expect(
      getOnboardingProgressReadErrorMessage(
        new Error('postgres stack trace'),
        ONBOARDING_PROGRESS_CACHED_READ_FALLBACK_MESSAGE
      )
    ).toBe(ONBOARDING_PROGRESS_CACHED_READ_FALLBACK_MESSAGE);
  });

  it('keeps onboarding route and checklist behind the read helper', () => {
    const route = read('src/routes/_authenticated/onboarding/index.tsx');
    const checklist = read('src/components/shared/onboarding-checklist.tsx');

    expect(route).toContain('getOnboardingProgressReadErrorMessage(error)');
    expect(route).toContain('ONBOARDING_PROGRESS_CACHED_READ_FALLBACK_MESSAGE');
    expect(route).toContain('{onboardingErrorMessage}');
    expect(route).toContain('{cachedOnboardingErrorMessage}');
    expect(checklist).toContain('getOnboardingProgressReadErrorMessage(error)');
    expect(checklist).toContain('ONBOARDING_PROGRESS_CACHED_READ_FALLBACK_MESSAGE');
    expect(route).not.toContain('error.message ||');
    expect(checklist).not.toContain('error.message ||');
  });
});

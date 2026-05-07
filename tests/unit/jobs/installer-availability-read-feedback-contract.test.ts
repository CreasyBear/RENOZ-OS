import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  INSTALLER_AVAILABILITY_READ_FALLBACK_MESSAGE,
  getInstallerAvailabilityReadErrorMessage,
} from '@/components/domain/jobs/installers/installer-read-error-messages';
import { normalizeReadQueryError } from '@/lib/read-path-policy';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('installer availability read feedback contract', () => {
  it('formats installer availability read failures without leaking unsafe internals', () => {
    const normalized = normalizeReadQueryError(
      {
        statusCode: 503,
        code: 'INTERNAL_ERROR',
        message: 'select from installer_availability violates row level security policy',
      },
      {
        contractType: 'always-shaped',
        fallbackMessage: INSTALLER_AVAILABILITY_READ_FALLBACK_MESSAGE,
      }
    );

    expect(getInstallerAvailabilityReadErrorMessage(normalized)).toBe(
      INSTALLER_AVAILABILITY_READ_FALLBACK_MESSAGE
    );
    expect(
      getInstallerAvailabilityReadErrorMessage(
        new Error('duplicate key violates installer_availability_org_idx postgres stack')
      )
    ).toBe(INSTALLER_AVAILABILITY_READ_FALLBACK_MESSAGE);
  });

  it('keeps the installer availability warning behind the read helper', () => {
    const calendar = read('src/components/domain/jobs/installers/installer-availability-calendar.tsx');
    const hooks = read('src/hooks/jobs/use-installers.ts');

    expect(hooks).toContain(
      "'Installer availability is temporarily unavailable. Please refresh and try again.'"
    );
    expect(calendar).toContain(
      "import { getInstallerAvailabilityReadErrorMessage } from './installer-read-error-messages';"
    );
    expect(calendar).toContain('{getInstallerAvailabilityReadErrorMessage(error)}');
    expect(calendar).not.toContain('error instanceof Error');
    expect(calendar).not.toContain('error.message');
  });
});

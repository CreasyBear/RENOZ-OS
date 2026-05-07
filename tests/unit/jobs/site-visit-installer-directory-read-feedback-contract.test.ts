import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  INSTALLER_DIRECTORY_READ_FALLBACK_MESSAGE,
  getInstallerDirectoryReadErrorMessage,
} from '@/components/domain/jobs/installers/installer-read-error-messages';
import { formatInstallerDirectoryReadError } from '@/components/domain/jobs/site-visits/site-visit-installer-options';
import { normalizeReadQueryError } from '@/lib/read-path-policy';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('site visit installer directory read feedback contract', () => {
  it('formats installer directory read failures without leaking unsafe internals', () => {
    const normalized = normalizeReadQueryError(
      {
        statusCode: 503,
        code: 'INTERNAL_ERROR',
        message: 'select from installers violates row level security policy',
      },
      {
        contractType: 'always-shaped',
        fallbackMessage: INSTALLER_DIRECTORY_READ_FALLBACK_MESSAGE,
      }
    );

    expect(getInstallerDirectoryReadErrorMessage(normalized)).toBe(
      INSTALLER_DIRECTORY_READ_FALLBACK_MESSAGE
    );
    expect(
      formatInstallerDirectoryReadError(
        new Error('duplicate key violates installers_org_idx postgres stack')
      )
    ).toBe(INSTALLER_DIRECTORY_READ_FALLBACK_MESSAGE);
  });

  it('keeps shared site visit installer option warnings behind the read helper', () => {
    const options = read('src/components/domain/jobs/site-visits/site-visit-installer-options.ts');
    const hooks = read('src/hooks/jobs/use-installers.ts');
    const projectCreateDialog = read(
      'src/components/domain/jobs/projects/site-visit-create-dialog.tsx'
    );
    const scheduleCreateDialog = read(
      'src/components/domain/jobs/schedule/schedule-visit-create-dialog.tsx'
    );

    expect(hooks).toContain(
      "'Installer directory is temporarily unavailable. Please refresh and try again.'"
    );
    expect(options).toContain(
      "import { getInstallerDirectoryReadErrorMessage } from '../installers/installer-read-error-messages';"
    );
    expect(options).toContain('return getInstallerDirectoryReadErrorMessage(error);');
    expect(options).not.toContain('error instanceof Error');
    expect(options).not.toContain('error.message');
    expect(projectCreateDialog).toContain('formatInstallerDirectoryReadError(installersError)');
    expect(scheduleCreateDialog).toContain('formatInstallerDirectoryReadError(installersError)');
  });
});

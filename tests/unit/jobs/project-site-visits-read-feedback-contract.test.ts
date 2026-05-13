import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PROJECT_SITE_VISITS_READ_FALLBACK_MESSAGE,
  getProjectSiteVisitsReadErrorMessage,
} from '@/components/domain/jobs/projects/project-read-error-messages';
import { normalizeReadQueryError } from '@/lib/read-path-policy';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project site visits read feedback contract', () => {
  it('formats project site visit read failures without leaking unsafe internals', () => {
    const normalized = normalizeReadQueryError(
      {
        statusCode: 503,
        code: 'INTERNAL_ERROR',
        message: 'select from site_visits violates row level security policy',
      },
      {
        contractType: 'always-shaped',
        fallbackMessage: PROJECT_SITE_VISITS_READ_FALLBACK_MESSAGE,
      }
    );

    expect(getProjectSiteVisitsReadErrorMessage(normalized)).toBe(
      PROJECT_SITE_VISITS_READ_FALLBACK_MESSAGE
    );
    expect(
      getProjectSiteVisitsReadErrorMessage(
        new Error('duplicate key violates site_visits_org_idx postgres stack')
      )
    ).toBe(PROJECT_SITE_VISITS_READ_FALLBACK_MESSAGE);
  });

  it('keeps the project site visits warning behind the read helper', () => {
    const visitsTab = read('src/components/domain/jobs/projects/project-visits-tab.tsx');
    const hooks = read('src/hooks/jobs/use-site-visits.ts');

    expect(hooks).toContain(
      "fallbackMessage: 'Project site visits are temporarily unavailable. Please refresh and try again.'"
    );
    expect(visitsTab).toContain(
      "import { getProjectSiteVisitsReadErrorMessage } from './project-read-error-messages';"
    );
    expect(visitsTab).toContain('{getProjectSiteVisitsReadErrorMessage(error)}');
    expect(visitsTab).not.toContain(
      "error.message || 'Project site visits are temporarily unavailable"
    );
  });
});

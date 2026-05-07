import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PROJECT_SITE_VISIT_DETAIL_READ_FALLBACK_MESSAGE,
  PROJECT_TASKS_READ_FALLBACK_MESSAGE,
  getProjectSiteVisitDetailReadErrorMessage,
  getProjectTasksReadErrorMessage,
} from '@/components/domain/jobs/projects/project-read-error-messages';
import { normalizeReadQueryError } from '@/lib/read-path-policy';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('site visit detail read feedback contract', () => {
  it('preserves normalized site visit detail read copy and hides unsafe raw failures', () => {
    const notFound = normalizeReadQueryError(
      { statusCode: 404, code: 'NOT_FOUND', message: 'site_visit missing' },
      {
        contractType: 'detail-not-found',
        fallbackMessage: PROJECT_SITE_VISIT_DETAIL_READ_FALLBACK_MESSAGE,
        notFoundMessage: 'The requested site visit could not be found.',
      }
    );

    expect(getProjectSiteVisitDetailReadErrorMessage(notFound)).toBe(
      'The requested site visit could not be found.'
    );
    expect(
      getProjectSiteVisitDetailReadErrorMessage(
        new Error('select from site_visits violates row level security policy')
      )
    ).toBe(PROJECT_SITE_VISIT_DETAIL_READ_FALLBACK_MESSAGE);
    expect(
      getProjectSiteVisitDetailReadErrorMessage(
        new Error('duplicate key violates site_visits_project_idx postgres stack')
      )
    ).toBe(PROJECT_SITE_VISIT_DETAIL_READ_FALLBACK_MESSAGE);
  });

  it('keeps the site visit detail route behind read helpers', () => {
    const route = read(
      'src/routes/_authenticated/projects/$projectId_.visits/site-visit-detail-page.tsx'
    );
    const hook = read('src/hooks/jobs/use-site-visits.ts');

    expect(hook).toContain(
      "'Site visit details are temporarily unavailable. Please refresh and try again.'"
    );
    expect(route).toContain('getProjectSiteVisitDetailReadErrorMessage(error)');
    expect(route).toContain('getProjectTasksReadErrorMessage(projectTasksError)');
    expect(route).not.toContain("{error?.message || 'Not found'}");
    expect(route).not.toContain('{projectTasksError.message}');
  });

  it('reuses project task read feedback for task warnings', () => {
    expect(
      getProjectTasksReadErrorMessage(
        new Error('select from project_tasks violates row level security policy')
      )
    ).toBe(PROJECT_TASKS_READ_FALLBACK_MESSAGE);
  });
});

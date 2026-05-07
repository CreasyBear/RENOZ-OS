import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PROJECT_ALERTS_READ_FALLBACK_MESSAGE,
  getProjectAlertsReadErrorMessage,
} from '@/components/domain/jobs/projects/project-read-error-messages';
import { normalizeReadQueryError } from '@/lib/read-path-policy';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project alerts read feedback contract', () => {
  it('formats project alert read failures without leaking unsafe internals', () => {
    const normalized = normalizeReadQueryError(
      {
        statusCode: 503,
        code: 'INTERNAL_ERROR',
        message: 'select from project_alerts violates row level security policy',
      },
      {
        contractType: 'detail-not-found',
        fallbackMessage: PROJECT_ALERTS_READ_FALLBACK_MESSAGE,
        notFoundMessage: 'The requested project could not be found.',
      }
    );

    expect(getProjectAlertsReadErrorMessage(normalized)).toBe(
      PROJECT_ALERTS_READ_FALLBACK_MESSAGE
    );
    expect(
      getProjectAlertsReadErrorMessage(
        new Error('duplicate key violates project_alerts_org_idx postgres stack')
      )
    ).toBe(PROJECT_ALERTS_READ_FALLBACK_MESSAGE);
  });

  it('keeps the project alerts warning behind the read helper', () => {
    const detailView = read('src/components/domain/jobs/projects/views/project-detail-view.tsx');
    const hooks = read('src/hooks/jobs/use-project-alerts.ts');

    expect(hooks).toContain(
      "'Project alerts are temporarily unavailable. Please refresh and try again.'"
    );
    expect(detailView).toContain(
      "import { getProjectAlertsReadErrorMessage } from '../project-read-error-messages';"
    );
    expect(detailView).toContain('{getProjectAlertsReadErrorMessage(alertsError)}');
    expect(detailView).not.toContain(
      "alertsError.message || 'Project alerts are temporarily unavailable"
    );
  });
});

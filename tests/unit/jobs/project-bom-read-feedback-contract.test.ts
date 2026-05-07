import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PROJECT_MATERIALS_READ_FALLBACK_MESSAGE,
  getProjectMaterialsReadErrorMessage,
} from '@/components/domain/jobs/projects/project-read-error-messages';
import { normalizeReadQueryError } from '@/lib/read-path-policy';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project BOM read feedback contract', () => {
  it('formats project materials read failures without leaking unsafe internals', () => {
    const normalized = normalizeReadQueryError(
      {
        statusCode: 503,
        code: 'INTERNAL_ERROR',
        message: 'select from project_bom_items violates row level security policy',
      },
      {
        contractType: 'always-shaped',
        fallbackMessage: PROJECT_MATERIALS_READ_FALLBACK_MESSAGE,
      }
    );

    expect(getProjectMaterialsReadErrorMessage(normalized)).toBe(
      PROJECT_MATERIALS_READ_FALLBACK_MESSAGE
    );
    expect(
      getProjectMaterialsReadErrorMessage(
        new Error('duplicate key violates project_bom_items_org_idx postgres stack')
      )
    ).toBe(PROJECT_MATERIALS_READ_FALLBACK_MESSAGE);
  });

  it('keeps the project BOM warning behind the read helper', () => {
    const bomTab = read('src/components/domain/jobs/projects/project-bom-tab.tsx');
    const hooks = read('src/hooks/jobs/use-project-bom.ts');

    expect(hooks).toContain(
      "'Project materials are temporarily unavailable. Please refresh and try again.'"
    );
    expect(bomTab).toContain(
      "import { getProjectMaterialsReadErrorMessage } from './project-read-error-messages';"
    );
    expect(bomTab).toContain('{getProjectMaterialsReadErrorMessage(error)}');
    expect(bomTab).not.toContain("error.message || 'Project materials are temporarily unavailable");
  });
});

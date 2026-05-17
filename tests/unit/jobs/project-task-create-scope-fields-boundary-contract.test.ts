import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project task create scope fields boundary contract', () => {
  it('keeps create-only workstream and site visit field rendering in a focused component', () => {
    const createDialog = read('src/components/domain/jobs/projects/task-create-dialog.tsx');
    const scopeFields = read('src/components/domain/jobs/projects/project-task-create-scope-fields.tsx');

    expect(createDialog).toContain("from './project-task-create-scope-fields'");
    expect(createDialog).toContain('ProjectTaskCreateScopeFields');
    expect(createDialog).toContain('onCreateSiteVisit={() => setShowSiteVisitCreate(true)}');
    expect(createDialog).toContain('onCreateWorkstream={() => setShowWorkstreamCreate(true)}');
    expect(createDialog).not.toContain('Create new workstream');
    expect(createDialog).not.toContain('No visits yet.');
    expect(createDialog).not.toContain("value=\"__create_new__\"");

    expect(scopeFields).toContain('export function ProjectTaskCreateScopeFields');
    expect(scopeFields).toContain('FormField label="Workstream"');
    expect(scopeFields).toContain('FormField label="Site Visit (optional)"');
    expect(scopeFields).toContain('FormField label="Site Visit"');
    expect(scopeFields).toContain("value=\"__create_new__\"");
    expect(scopeFields).toContain('onCreateWorkstream();');
    expect(scopeFields).toContain('onCreateSiteVisit');
    expect(scopeFields).toContain("workstreamField.setValue(value === 'none' ? '' : value)");
    expect(scopeFields).toContain("onSiteVisitChange(value === 'none' ? '' : value)");
    expect(scopeFields).toContain('Create new workstream');
    expect(scopeFields).toContain('No visits yet.');
  });
});

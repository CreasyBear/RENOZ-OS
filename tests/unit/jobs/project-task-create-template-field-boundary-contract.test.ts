import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project task create template field boundary contract', () => {
  it('keeps create-only template prefill rendering in a focused component', () => {
    const createDialog = read('src/components/domain/jobs/projects/task-create-dialog.tsx');
    const createDialogForm = read('src/components/domain/jobs/projects/project-task-create-dialog-form.ts');
    const templateField = read('src/components/domain/jobs/projects/project-task-create-template-field.tsx');

    expect(createDialog).toContain("from './project-task-create-template-field'");
    expect(createDialog).toContain('ProjectTaskCreateTemplateField');
    expect(createDialog).toContain('onApplyTemplate={applyTemplate}');
    expect(createDialog).not.toContain("form.setFieldValue('title', option.title)");
    expect(createDialog).not.toContain("form.setFieldValue('description', option.description ?? '')");
    expect(createDialog).not.toContain('FormField label="From template (optional)"');
    expect(createDialog).not.toContain('Pre-fill from template');
    expect(createDialog).not.toContain('Start from scratch');
    expect(createDialog).not.toContain("from '@/components/ui/select'");
    expect(createDialogForm).toContain("form.setFieldValue('title', option.title)");
    expect(createDialogForm).toContain("form.setFieldValue('description', option.description ?? '')");

    expect(templateField).toContain('export function ProjectTaskCreateTemplateField');
    expect(templateField).toContain('FormField label="From template (optional)"');
    expect(templateField).toContain('Pre-fill from template');
    expect(templateField).toContain('Start from scratch');
    expect(templateField).toContain("if (templateOptions.length === 0)");
    expect(templateField).toContain("if (value === 'none') return");
    expect(templateField).toContain('onApplyTemplate(option)');
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('issue template feedback contract', () => {
  it('keeps template mutation failures formatted at the settings route boundary', () => {
    const route = read('src/routes/_authenticated/settings/issue-templates.tsx');
    const dialog = read('src/components/domain/support/issues/issue-template-form-dialog.tsx');

    expect(route).not.toContain("import { toast } from 'sonner'");
    expect(route).toContain("import { toast } from '@/hooks/_shared/use-toast'");
    expect(route).toContain('formatIssueTemplateMutationError');
    expect(route).toContain(
      "toast.error(formatIssueTemplateMutationError(err, 'Failed to duplicate template'))"
    );
    expect(route).toContain(
      "toast.error(formatIssueTemplateMutationError(err, 'Failed to delete template'))"
    );
    expect(route).toContain(
      "toast.error(formatIssueTemplateMutationError(error, 'Failed to save template'))"
    );
    expect(route).toContain('throw error;');
    expect(route).not.toContain(
      "err instanceof Error ? err.message : 'Failed to duplicate template'"
    );
    expect(route).not.toContain(
      "err instanceof Error ? err.message : 'Failed to delete template'"
    );

    expect(dialog).not.toContain("import { toast } from 'sonner'");
    expect(dialog).toContain("import { toast } from '@/hooks/_shared/use-toast'");
    expect(dialog).toContain('Mutation feedback is owned by the submit caller');
    expect(dialog).not.toContain("err instanceof Error ? err.message : 'Failed to save template'");
    expect(dialog).not.toContain("toast.error('Failed to save template')");
  });
});

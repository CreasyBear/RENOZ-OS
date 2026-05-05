import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('knowledge base category feedback contract', () => {
  it('formats category mutation failures before display', () => {
    const route = read('src/routes/_authenticated/settings/knowledge-base.tsx');
    const dialog = read(
      'src/components/domain/support/knowledge-base/kb-category-form-dialog.tsx'
    );

    expect(route).not.toContain("import { toast } from 'sonner'");
    expect(route).toContain("import { toast } from '@/hooks/_shared/use-toast'");
    expect(route).toContain('formatKbCategoryMutationError');
    expect(route).toContain(
      "toast.error(formatKbCategoryMutationError(error, 'Failed to delete category'))"
    );
    expect(route).toContain('formatKbCategoryMutationError(');
    expect(route).toContain(
      "editingCategory ? 'Failed to update category' : 'Failed to create category'"
    );
    expect(route).toContain('submitError={categorySubmitError}');
    expect(route).not.toContain(
      "error instanceof Error ? error.message : 'Failed to delete category'"
    );
    expect(route).not.toContain(
      "toast.error(editingCategory ? 'Failed to update category' : 'Failed to create category')"
    );
    expect(route).not.toContain('updateCategoryMutation.error?.message');
    expect(route).not.toContain('createCategoryMutation.error?.message');

    expect(dialog).not.toContain("import { toast } from 'sonner'");
    expect(dialog).toContain("import { toast } from '@/hooks/_shared/use-toast'");
    expect(dialog).toContain("formatSupportMutationError(error, 'Failed to save category')");
    expect(dialog).not.toContain(
      "error instanceof Error ? error.message : 'Failed to save category'"
    );
  });
});

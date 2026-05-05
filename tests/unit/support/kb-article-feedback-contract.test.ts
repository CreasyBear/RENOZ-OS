import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('knowledge base article feedback contract', () => {
  it('formats article mutation failures before display', () => {
    const route = read('src/routes/_authenticated/support/knowledge-base.tsx');
    const dialog = read(
      'src/components/domain/support/knowledge-base/kb-article-form-dialog.tsx'
    );

    expect(route).not.toContain("import { toast } from 'sonner'");
    expect(route).toContain("import { toast } from '@/hooks/_shared/use-toast'");
    expect(route).toContain('formatKbArticleMutationError');
    expect(route).toContain(
      "toast.error(formatKbArticleMutationError(error, 'Failed to delete article'))"
    );
    expect(route).toContain('formatKbArticleMutationError(');
    expect(route).toContain(
      "editingArticle ? 'Failed to update article' : 'Failed to create article'"
    );
    expect(route).not.toContain(
      "error instanceof Error ? error.message : 'Failed to delete article'"
    );
    expect(route).not.toContain(
      "toast.error(editingArticle ? 'Failed to update article' : 'Failed to create article')"
    );

    expect(dialog).not.toContain("import { toast } from 'sonner'");
    expect(dialog).toContain("import { toast } from '@/hooks/_shared/use-toast'");
    expect(dialog).toContain("formatSupportMutationError(error, 'Failed to save article')");
    expect(dialog).not.toContain(
      "error instanceof Error ? error.message : 'Failed to save article'"
    );
  });
});

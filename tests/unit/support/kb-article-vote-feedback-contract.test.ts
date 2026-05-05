import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('knowledge base article vote feedback contract', () => {
  it('keeps article feedback mutation toasts at the route boundary', () => {
    const route = read('src/routes/_authenticated/support/knowledge-base.tsx');
    const presenter = read(
      'src/components/domain/support/knowledge-base/kb-suggested-articles.tsx'
    );

    expect(route).toContain('applyFeedbackDelta(articleId, helpful)');
    expect(route).toContain('rollbackFeedbackDelta(articleId, helpful)');
    expect(route).toContain('clearFeedbackDelta(articleId)');
    expect(route).toContain(
      `toast.success(helpful ? 'Thanks for the feedback!' : "We'll work on improving this article")`
    );
    expect(route).toContain(
      "toast.error(formatKbArticleMutationError(error, 'Failed to record article feedback'))"
    );
    expect(route).toContain('throw error;');

    expect(presenter).not.toContain("import { toast } from 'sonner'");
    expect(presenter).not.toContain("import { toast } from '@/hooks/_shared/use-toast'");
    expect(presenter).toContain('Mutation feedback is owned by the submit caller');
    expect(presenter).not.toContain('toast.success');
    expect(presenter).not.toContain("toast.error('Failed to record feedback')");
  });
});

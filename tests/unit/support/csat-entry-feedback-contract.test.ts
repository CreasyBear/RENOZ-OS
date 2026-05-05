import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('CSAT entry feedback contract', () => {
  it('formats internal feedback submit failures before display', () => {
    const dialog = read('src/components/domain/support/csat/csat-entry-dialog.tsx');

    expect(dialog).not.toContain("import { toast } from 'sonner'");
    expect(dialog).toContain("import { toast } from '@/hooks/_shared/use-toast'");
    expect(dialog).toContain("import { formatSupportMutationError } from '@/hooks/support'");
    expect(dialog).toContain('function formatCsatEntryError');
    expect(dialog).toContain('CSAT_ENTRY_ERROR_MESSAGES');
    expect(dialog).toContain(
      "toast.error(formatCsatEntryError(err, 'Failed to submit feedback'))"
    );
    expect(dialog).toContain("CONFLICT: 'Feedback has already been submitted for this issue.'");
    expect(dialog).not.toContain(
      "err instanceof Error ? err.message : 'Failed to submit feedback'"
    );
  });
});

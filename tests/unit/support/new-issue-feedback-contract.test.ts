import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('new issue feedback contract', () => {
  it('formats create mutation failures before display', () => {
    const route = read('src/routes/_authenticated/support/issues/new.tsx');
    const supportIndex = read('src/hooks/support/index.ts');

    expect(route).not.toContain("import { toast } from 'sonner'");
    expect(route).toContain("import { toast } from '@/hooks/_shared/use-toast'");
    expect(route).toContain('CREATE_ISSUE_ERROR_MESSAGES');
    expect(route).toContain("formatSupportMutationError(error, 'Failed to create issue'");
    expect(route).toContain('codeMessages: CREATE_ISSUE_ERROR_MESSAGES');
    expect(route).not.toContain('error instanceof Error');
    expect(route).not.toContain("'details' in error");
    expect(route).not.toContain('typeof error.details.summary');

    expect(supportIndex).toContain("export { formatSupportMutationError } from './_mutation-errors'");
  });
});

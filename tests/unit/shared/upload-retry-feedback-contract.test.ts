import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('shared upload retry feedback contract', () => {
  it('keeps exhausted file upload retry failures behind safe formatter copy', () => {
    const source = read('src/hooks/files/use-files-supabase.ts');

    expect(source).toContain('createUploadFailureError(');
    expect(source).toContain('formatMutationError(error, fallback)');
    expect(source).not.toContain('lastError?.message || "Unknown error"');
    expect(source).not.toContain('Upload failed after ${maxAttempts} attempts:');
  });
});

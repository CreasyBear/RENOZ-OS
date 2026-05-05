import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('warranty detail container action contract', () => {
  it('keeps hook-owned mutation toasts out of the detail container', () => {
    const source = read('src/components/domain/warranty/containers/warranty-detail-container.tsx');

    expect(source).not.toContain("import { toast } from 'sonner'");
    expect(source).not.toContain("toast.error('Failed to update notification settings')");
    expect(source).not.toContain("toast.error('Failed to generate certificate')");
    expect(source).not.toContain("toast.error('Failed to regenerate certificate')");
    expect(source).not.toContain("toast.error('Failed to delete warranty')");
    expect(source).not.toContain("toast.success('Warranty deleted successfully')");
    expect(source).toContain('formatWarrantyCertificateResultError(result.error)');
    expect(source).toContain('WARRANTY_CERTIFICATE_GENERATION_FAILED_MESSAGE');
    expect(source).toContain('formatWarrantyCertificateWindowError(error)');
    expect(source).not.toContain("'Failed to open certificate'");
    expect(source).not.toContain('error instanceof Error ? error.message');
  });
});

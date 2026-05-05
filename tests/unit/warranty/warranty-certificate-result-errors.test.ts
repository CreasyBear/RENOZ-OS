import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatWarrantyCertificateResultError,
  WARRANTY_CERTIFICATE_GENERATION_FAILED_MESSAGE,
} from '@/lib/warranty/certificate-result-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('warranty certificate result errors', () => {
  it('keeps known operator-safe certificate result messages', () => {
    expect(formatWarrantyCertificateResultError('Warranty not found')).toBe('Warranty not found');
  });

  it('hides infrastructure details from certificate result payloads', () => {
    expect(
      formatWarrantyCertificateResultError(
        new Error('Supabase storage bucket warranty-certificates does not exist')
      )
    ).toBe(WARRANTY_CERTIFICATE_GENERATION_FAILED_MESSAGE);

    expect(
      formatWarrantyCertificateResultError(
        'PDF renderer failed with internal stack frame at renderPdfToBuffer'
      )
    ).toBe(WARRANTY_CERTIFICATE_GENERATION_FAILED_MESSAGE);
  });

  it('keeps server catch and client result toasts on the safe formatter contract', () => {
    const serverSource = read('src/server/functions/warranty/certificates/warranty-certificates.ts');
    const hookSource = read('src/hooks/warranty/certificates/use-warranty-certificates.ts');

    expect(serverSource).toContain('formatWarrantyCertificateResultError(error)');
    expect(serverSource).not.toContain("error instanceof Error ? error.message : 'Certificate generation failed'");
    expect(hookSource).not.toContain("toast.error(result.error ?? 'Failed to generate certificate')");
    expect(hookSource).not.toContain("toast.error(result.error ?? 'Failed to regenerate certificate')");
    expect(hookSource.match(/formatWarrantyCertificateResultError\(result.error\)/g)).toHaveLength(2);
  });
});

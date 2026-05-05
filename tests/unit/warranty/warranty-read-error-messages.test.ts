import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import { formatWarrantyReadError } from '@/lib/warranty';

const root = process.cwd();

const warrantyReadErrorConsumerPaths = [
  'src/components/domain/warranty/containers/warranty-claim-detail-container.tsx',
  'src/components/domain/warranty/containers/warranty-detail-container.tsx',
  'src/components/domain/warranty/containers/warranty-entitlements-list-container.tsx',
  'src/components/domain/warranty/views/warranty-claims-list-view.tsx',
  'src/components/domain/warranty/views/warranty-policy-list.tsx',
];

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('warranty read error messages', () => {
  it('shows normalized read-query messages and hides arbitrary raw errors', () => {
    const fallback = 'Warranty details are temporarily unavailable. Please refresh and try again.';
    const normalized = normalizeReadQueryError(
      { code: 'NOT_FOUND', statusCode: 404 },
      {
        contractType: 'detail-not-found',
        fallbackMessage: fallback,
        notFoundMessage: 'The requested warranty could not be found.',
      }
    );

    expect(formatWarrantyReadError(normalized, fallback)).toBe(
      'The requested warranty could not be found.'
    );
    expect(
      formatWarrantyReadError(
        new Error('duplicate key value violates unique constraint warranty_claims_pkey'),
        fallback
      )
    ).toBe(fallback);
  });

  it('keeps warranty read-error UI behind the formatter contract', () => {
    for (const path of warrantyReadErrorConsumerPaths) {
      const source = read(path);

      expect(source, path).toContain('formatWarrantyReadError(');
      expect(source, path).not.toContain('warrantyError instanceof Error ? warrantyError.message');
      expect(source, path).not.toContain('certificateStatusQueryError.message');
      expect(source, path).not.toContain("error.message || 'An error occurred'");
      expect(source, path).not.toContain("'An error occurred'");
      expect(source, path).not.toContain('Unknown error');
    }
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatWarrantyMutationError } from '@/hooks/warranty/_mutation-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('warranty mutation error formatter', () => {
  it('prefers field-level warranty validation guidance', () => {
    const error = {
      details: {
        validationErrors: {
          code: ['VALIDATION_ERROR'],
          claimantSnapshot: ['Claimant details are required.'],
        },
      },
      statusCode: 400,
    };

    expect(formatWarrantyMutationError(error, 'Failed to submit claim')).toBe(
      'Claimant details are required.'
    );
  });

  it('maps warranty claim transition blockers to operator-safe copy', () => {
    const error = {
      code: 'VALIDATION_ERROR',
      details: {
        validationErrors: {
          code: ['transition_blocked'],
        },
      },
      statusCode: 400,
    };

    expect(formatWarrantyMutationError(error, 'Failed to update status')).toBe(
      'This claim cannot move to that status. Refresh and review the current claim state.'
    );
  });

  it('allows server-owned validation messages but hides unknown system messages', () => {
    expect(
      formatWarrantyMutationError(
        {
          code: 'VALIDATION_ERROR',
          message: 'Cannot approve claim with status: denied',
          statusCode: 400,
        },
        'Failed to approve claim'
      )
    ).toBe('Cannot approve claim with status: denied');

    expect(
      formatWarrantyMutationError(
        new Error('duplicate key value violates unique constraint warranty_claims_pkey'),
        'Failed to approve claim'
      )
    ).toBe('Failed to approve claim');
  });

  it('keeps claim, policy, and core warranty mutation hooks on the formatter contract', () => {
    const claimSource = read('src/hooks/warranty/claims/use-warranty-claims.ts');
    const policySource = read('src/hooks/warranty/policies/use-warranty-policies.ts');
    const coreSource = read('src/hooks/warranty/core/use-warranties.ts');

    expect(claimSource).toContain(
      "import { formatWarrantyMutationError } from '../_mutation-errors';"
    );
    expect(policySource).toContain(
      "import { formatWarrantyMutationError } from '../_mutation-errors';"
    );
    expect(coreSource).toContain(
      "import { formatWarrantyMutationError } from '../_mutation-errors';"
    );
    expect(claimSource).not.toContain('toast.error(error instanceof Error ? error.message');
    expect(policySource).not.toContain('toast.error(error instanceof Error ? error.message');
    expect(coreSource).not.toContain('toast.error(error instanceof Error ? error.message');
    expect(policySource.match(/formatWarrantyMutationError\(error,/g)).toHaveLength(7);
    expect(coreSource.match(/formatWarrantyMutationError\(error,/g)).toHaveLength(4);
  });
});

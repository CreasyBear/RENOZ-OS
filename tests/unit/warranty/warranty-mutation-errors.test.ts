import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatWarrantyClaimMutationError,
  formatWarrantyCoreMutationError,
  formatWarrantyEntitlementMutationError,
  formatWarrantyMutationError,
  formatWarrantyPolicyMutationError,
} from '@/hooks/warranty/_mutation-errors';

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

    expect(formatWarrantyClaimMutationError(error, 'submit')).toBe(
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

    expect(formatWarrantyClaimMutationError(error, 'updateStatus')).toBe(
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
        'Warranty claim approval is temporarily unavailable. Please refresh and try again.'
      )
    ).toBe('Cannot approve claim with status: denied');

    expect(
      formatWarrantyClaimMutationError(
        new Error('duplicate key value violates unique constraint warranty_claims_pkey'),
        'approve'
      )
    ).toBe('Warranty claim approval is temporarily unavailable. Please refresh and try again.');
  });

  it('formats policy mutation failures with action-specific unavailable copy', () => {
    expect(
      formatWarrantyPolicyMutationError(
        {
          statusCode: 400,
          errors: {
            durationMonths: ['Warranty duration must be greater than zero.'],
          },
        },
        'create'
      )
    ).toBe('Warranty duration must be greater than zero.');

    expect(
      formatWarrantyPolicyMutationError(
        new Error('duplicate key value violates unique constraint warranty_policies_default_idx'),
        'setDefault'
      )
    ).toBe('Default warranty policy update is temporarily unavailable. Please refresh and try again.');
  });

  it('formats core warranty mutation failures with action-specific unavailable copy', () => {
    expect(
      formatWarrantyCoreMutationError(
        {
          statusCode: 400,
          errors: {
            transferReason: ['Transfer reason is required.'],
          },
        },
        'transferOwnership'
      )
    ).toBe('Transfer reason is required.');

    expect(
      formatWarrantyCoreMutationError(
        new Error('duplicate key value violates unique constraint warranties_deleted_idx'),
        'delete'
      )
    ).toBe('Warranty deletion is temporarily unavailable. Please refresh and try again.');
  });

  it('formats entitlement activation failures with action-specific unavailable copy', () => {
    expect(
      formatWarrantyEntitlementMutationError(
        {
          statusCode: 400,
          errors: {
            deliveryLine: ['Delivery entitlement is missing serialized product context.'],
          },
        },
        'activate'
      )
    ).toBe('Delivery entitlement is missing serialized product context.');

    expect(
      formatWarrantyEntitlementMutationError(
        new Error('duplicate key value violates unique constraint warranty_entitlements_active_idx'),
        'activate'
      )
    ).toBe('Warranty activation from entitlement is temporarily unavailable. Please refresh and try again.');
  });

  it('keeps warranty mutation hooks on the formatter contract', () => {
    const sources = {
      claim: read('src/hooks/warranty/claims/use-warranty-claims.ts'),
      policy: read('src/hooks/warranty/policies/use-warranty-policies.ts'),
      core: read('src/hooks/warranty/core/use-warranties.ts'),
      entitlement: read('src/hooks/warranty/entitlements/use-warranty-entitlements.ts'),
      extension: read('src/hooks/warranty/extensions/use-warranty-extensions.ts'),
      certificate: read('src/hooks/warranty/certificates/use-warranty-certificates.ts'),
      bulkImport: read('src/hooks/warranty/bulk-import/use-warranty-bulk-import.ts'),
    };

    expect(sources.claim).toContain(
      "import { formatWarrantyClaimMutationError } from '../_mutation-errors';"
    );
    expect(sources.claim).not.toContain('Failed to submit claim');
    expect(sources.claim).not.toContain('Failed to update status');
    expect(sources.claim).not.toContain('Failed to approve claim');
    expect(sources.claim).not.toContain('Failed to deny claim');
    expect(sources.claim).not.toContain('Failed to resolve claim');
    expect(sources.claim).not.toContain('Failed to assign claim');
    expect(sources.claim).not.toContain('Failed to cancel claim');

    expect(sources.policy).toContain(
      "import { formatWarrantyPolicyMutationError } from '../_mutation-errors';"
    );
    expect(sources.policy).not.toContain('Failed to create policy');
    expect(sources.policy).not.toContain('Failed to update policy');
    expect(sources.policy).not.toContain('Failed to delete policy');
    expect(sources.policy).not.toContain('Failed to set default policy');
    expect(sources.policy).not.toContain('Failed to seed policies');
    expect(sources.policy).not.toContain('Failed to assign policy');

    expect(sources.core).toContain(
      "import { formatWarrantyCoreMutationError } from '../_mutation-errors';"
    );
    expect(sources.core).not.toContain('Failed to update warranty notification settings');
    expect(sources.core).not.toContain('Failed to delete warranty');
    expect(sources.core).not.toContain('Failed to void warranty');
    expect(sources.core).not.toContain('Failed to transfer warranty ownership');

    expect(sources.entitlement).toContain(
      "import { formatWarrantyEntitlementMutationError } from '../_mutation-errors';"
    );
    expect(sources.entitlement).not.toContain('Failed to activate warranty');

    for (const source of Object.values(sources).filter(
      (source) =>
        source !== sources.claim &&
        source !== sources.policy &&
        source !== sources.core &&
        source !== sources.entitlement
    )) {
      expect(source).toContain("import { formatWarrantyMutationError } from '../_mutation-errors';");
      expect(source).not.toContain('toast.error(error instanceof Error ? error.message');
    }
    expect(sources.claim).not.toContain('toast.error(error instanceof Error ? error.message');
    expect(sources.policy).not.toContain('toast.error(error instanceof Error ? error.message');
    expect(sources.core).not.toContain('toast.error(error instanceof Error ? error.message');
    expect(sources.entitlement).not.toContain('toast.error(error instanceof Error ? error.message');

    expect(sources.claim.match(/formatWarrantyClaimMutationError\(error,/g)).toHaveLength(7);
    expect(sources.policy.match(/formatWarrantyPolicyMutationError\(error,/g)).toHaveLength(7);
    expect(sources.core.match(/formatWarrantyCoreMutationError\(error,/g)).toHaveLength(4);
    expect(sources.entitlement.match(/formatWarrantyEntitlementMutationError\(error,/g)).toHaveLength(1);
    expect(sources.extension.match(/formatWarrantyMutationError\(error,/g)).toHaveLength(1);
    expect(sources.certificate.match(/formatWarrantyMutationError\(error,/g)).toHaveLength(2);
    expect(sources.bulkImport.match(/formatWarrantyMutationError\(error,/g)).toHaveLength(2);
  });
});

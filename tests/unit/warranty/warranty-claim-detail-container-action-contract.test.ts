import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('warranty claim detail container action contract', () => {
  it('keeps cancel mutation toasts owned by the claim hook', () => {
    const container = read('src/components/domain/warranty/containers/warranty-claim-detail-container.tsx');
    const hook = read('src/hooks/warranty/claims/use-warranty-claims.ts');

    expect(container).not.toContain("import { toast } from 'sonner'");
    expect(container).not.toContain("toast.success('Claim cancelled successfully')");
    expect(container).not.toContain("toast.error('Failed to cancel claim')");
    expect(container).toContain('useCancelWarrantyClaim()');
    expect(container).toContain('await cancelMutation.mutateAsync({ id: currentClaim.id })');
    expect(hook).toContain('showClaimMutationOutcome(\'cancelled\'');
    expect(hook).toContain("toast.error(formatWarrantyClaimMutationError(error, 'cancel'))");
  });
});

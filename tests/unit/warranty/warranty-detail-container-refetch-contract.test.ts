import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function section(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  expect(startIndex, `Missing section start: ${start}`).toBeGreaterThanOrEqual(0);
  expect(endIndex, `Missing section end: ${end}`).toBeGreaterThan(startIndex);

  return source.slice(startIndex, endIndex);
}

describe('warranty detail container refetch contract', () => {
  it('keeps dialog success callbacks responsible for explicit list refreshes', () => {
    const container = read('src/components/domain/warranty/containers/warranty-detail-container.tsx');
    const claimHook = read('src/hooks/warranty/claims/use-warranty-claims.ts');
    const extensionHook = read('src/hooks/warranty/extensions/use-warranty-extensions.ts');

    const submitClaim = section(container, 'const handleSubmitClaim', 'const handleApproveClaim');
    const approveClaim = section(container, 'const handleApproveClaim', 'const handleDenyClaim');
    const denyClaim = section(container, 'const handleDenyClaim', 'const handleRequestInfoClaim');
    const requestInfo = section(container, 'const handleRequestInfoClaim', 'const handleExtendWarranty');
    const extendWarranty = section(container, 'const handleExtendWarranty', 'const handleTransferWarranty');

    for (const handler of [submitClaim, approveClaim, denyClaim, requestInfo]) {
      expect(handler).toContain('mutateAsync');
      expect(handler).not.toContain('refetchClaims()');
    }

    expect(extendWarranty).toContain('extendMutation.mutateAsync(payload)');
    expect(extendWarranty).not.toContain('refetchExtensions()');
    expect(container).toContain('onClaimsSuccess={() => refetchClaims()}');
    expect(container).toContain('onExtensionsSuccess={() => refetchExtensions()}');
    expect(claimHook).toContain('invalidateWarrantyClaimReadModels(queryClient,');
    expect(extensionHook).toContain('queryKeys.warrantyExtensions.list(variables.warrantyId)');
  });
});

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

describe('warranty claim cache contract', () => {
  it('invalidates claim summaries for claim mutations that change summary metrics', () => {
    const source = read('src/hooks/warranty/claims/use-warranty-claims.ts');

    expect(source).toContain('function invalidateWarrantyClaimReadModels');
    expect(source).toContain('queryKeys.warrantyClaims.lists()');
    expect(source).toContain('queryKeys.warrantyClaims.detail(claimId)');
    expect(source).toContain('queryKeys.warrantyClaims.byWarranty(warrantyId)');
    expect(source).toContain('queryKeys.warrantyClaims.summary(warrantyId)');
    expect(source.match(/invalidateWarrantyClaimReadModels\(queryClient,/g)).toHaveLength(7);

    const create = section(source, 'export function useCreateWarrantyClaim', 'export function useUpdateClaimStatus');
    const update = section(source, 'export function useUpdateClaimStatus', 'export function useApproveClaim');
    const approve = section(source, 'export function useApproveClaim', 'export function useDenyClaim');
    const deny = section(source, 'export function useDenyClaim', 'export function useResolveClaim');
    const resolve = section(source, 'export function useResolveClaim', 'export function useAssignClaim');
    const assign = section(source, 'export function useAssignClaim', 'export function useCancelWarrantyClaim');
    const cancel = section(source, 'export function useCancelWarrantyClaim', '// ============================================================================\n// UTILITY FUNCTIONS');

    for (const mutation of [create, update, approve, deny, resolve, cancel]) {
      expect(mutation).toContain('warrantyId: result.warrantyId');
    }

    expect(assign).toContain('claimId: result.id');
    expect(assign).not.toContain('warrantyId: result.warrantyId');
    expect(cancel).toContain('claimId: variables.id');
  });
});

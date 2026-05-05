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

describe('service linkage review resolution cache contract', () => {
  it('invalidates the resolved review, service system, and source warranty read models explicitly', () => {
    const hook = read('src/hooks/service/use-service-systems.ts');
    const server = read('src/server/functions/service/service-linkage-reviews.ts');

    const resolveHook = section(
      hook,
      'export function useResolveServiceLinkageReview',
      'export function useTransferServiceSystemOwnership'
    );
    const resolveServer = section(
      server,
      'export const resolveServiceLinkageReview',
      '    });\n  });'
    );

    expect(resolveServer).toContain('sourceWarrantyId: detail.sourceWarranty?.id ?? null');
    expect(resolveServer).toContain(
      "'Service linkage review could not be resolved. Review the selected service system and try again.'"
    );
    expect(resolveServer).not.toContain('Failed to resolve service linkage review');

    expect(resolveHook).toContain('queryKeys.serviceLinkageReviews.lists()');
    expect(resolveHook).toContain('queryKeys.serviceLinkageReviews.detail(variables.reviewId)');
    expect(resolveHook).toContain('queryKeys.serviceSystems.lists()');
    expect(resolveHook).toContain('queryKeys.serviceSystems.detail(result.resolvedServiceSystemId)');
    expect(resolveHook).toContain('queryKeys.warranties.lists()');
    expect(resolveHook).toContain('queryKeys.warranties.statusCounts()');
    expect(resolveHook).toContain('if (result.sourceWarrantyId)');
    expect(resolveHook).toContain('queryKeys.warranties.detail(result.sourceWarrantyId)');
    expect(resolveHook).not.toContain('queryKeys.serviceLinkageReviews.all');
    expect(resolveHook).not.toContain('queryKeys.warranties.all');
    expect(resolveHook).toContain(
      "toast.error(formatServiceActionMutationError(error, 'resolveLinkageReview'))"
    );
    expect(resolveHook).not.toContain('Failed to resolve service linkage review');
  });
});

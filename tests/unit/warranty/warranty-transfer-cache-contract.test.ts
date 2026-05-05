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

describe('warranty transfer ownership cache contract', () => {
  it('invalidates all ownership transfer read models from the warranty hook', () => {
    const hook = read('src/hooks/warranty/core/use-warranties.ts');
    const server = read('src/server/functions/warranty/core/warranties.ts');
    const container = read('src/components/domain/warranty/containers/warranty-detail-container.tsx');

    const transferHook = section(hook, 'export function useTransferWarranty', '  });\n}');
    const transferServer = section(server, 'export const transferWarranty', '// ============================================================================\n// CANCEL WARRANTY CLAIM');
    const transferHandler = section(container, 'const handleTransferWarranty', 'const handleClaimRowClick');

    expect(server).toContain('linkedWarrantyIds: transferResult.linkedWarrantyIds');
    expect(transferServer).toContain('transferServiceSystemOwnershipTx');
    expect(transferHook).toContain('for (const warrantyId of result.linkedWarrantyIds ?? [variables.id])');
    expect(transferHook).toContain('queryKeys.warranties.detail(warrantyId)');
    expect(transferHook).toContain('queryKeys.warranties.lists()');
    expect(transferHook).toContain('queryKeys.warranties.statusCounts()');
    expect(transferHook).toContain('queryKeys.serviceSystems.lists()');
    expect(transferHook).toContain('queryKeys.serviceSystems.detail(result.serviceSystemId)');
    expect(transferHandler).toContain('transferWarrantyMutation.mutateAsync(payload)');
    expect(transferHandler).not.toContain('refetchWarranty()');
  });
});

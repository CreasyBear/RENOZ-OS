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

describe('service-system ownership transfer cache contract', () => {
  it('keeps transfer ownership cache and toast policy owned by the service hook', () => {
    const hook = read('src/hooks/service/use-service-systems.ts');
    const server = read('src/server/functions/service/service-systems.ts');

    const transferHook = section(
      hook,
      'export function useTransferServiceSystemOwnership',
      '  });\n}'
    );
    const transferServer = section(
      server,
      'export const transferServiceSystemOwnership',
      '    });\n  });'
    );

    expect(hook).not.toContain("import { toast } from 'sonner'");
    expect(hook).toContain("import { toast } from '@/hooks/_shared/use-toast'");
    expect(hook).toContain("import { formatServiceActionMutationError } from './_mutation-errors'");

    expect(transferServer).toContain('const linkedWarrantyIds = result.linkedWarrantyIds ?? []');
    expect(transferServer).toContain('linkedWarrantyIds,');

    expect(transferHook).toContain('queryKeys.serviceSystems.lists()');
    expect(transferHook).toContain('queryKeys.serviceSystems.detail(result.serviceSystemId)');
    expect(transferHook).toContain('queryKeys.warranties.lists()');
    expect(transferHook).toContain('queryKeys.warranties.statusCounts()');
    expect(transferHook).toContain('for (const warrantyId of result.linkedWarrantyIds ?? [])');
    expect(transferHook).toContain('queryKeys.warranties.detail(warrantyId)');
    expect(transferHook).not.toContain('queryKeys.warranties.all');
    expect(transferHook).toContain(
      "toast.error(formatServiceActionMutationError(error, 'transferOwnership'))"
    );
    expect(transferHook).not.toContain('Failed to transfer system ownership');
  });
});

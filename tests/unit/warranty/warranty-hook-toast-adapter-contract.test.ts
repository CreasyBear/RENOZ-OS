import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

const warrantyMutationHookPaths = [
  'src/hooks/warranty/bulk-import/use-warranty-bulk-import.ts',
  'src/hooks/warranty/certificates/use-warranty-certificates.ts',
  'src/hooks/warranty/claims/use-warranty-claims.ts',
  'src/hooks/warranty/core/use-warranties.ts',
  'src/hooks/warranty/entitlements/use-warranty-entitlements.ts',
  'src/hooks/warranty/extensions/use-warranty-extensions.ts',
  'src/hooks/warranty/policies/use-warranty-policies.ts',
];

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('warranty hook toast adapter contract', () => {
  it('keeps warranty mutation feedback behind the shared toast adapter', () => {
    for (const path of warrantyMutationHookPaths) {
      const source = read(path);

      expect(source, path).toContain("import { toast } from '../../_shared/use-toast';");
      expect(source, path).not.toContain("import { toast } from 'sonner';");
    }
  });
});

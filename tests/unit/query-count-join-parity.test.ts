import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..', '..');

function readProjectFile(relativePath: string) {
  return readFileSync(join(projectRoot, relativePath), 'utf8');
}

describe('query count/join parity regressions', () => {
  it('inventory search aggregates join products when shared filters search product columns', () => {
    const source = readProjectFile('src/server/functions/inventory/inventory.ts');

    expect(source).toMatch(/ilike\(products\.name,\s*searchPattern\)/);
    expect(source).toMatch(/ilike\(products\.sku,\s*searchPattern\)/);
    expect(source).toMatch(
      /\.select\(\{\s*count:\s*sql<number>`count\(\*\)::int`\s*\}\)\s*\.from\(inventory\)\s*\.leftJoin\(products,\s*productJoin\)\s*\.where\(and\(\.\.\.conditions\)\)/s
    );
    expect(source).toMatch(
      /\.select\(\{\s*totalValue:[\s\S]*?\.from\(inventory\)\s*\.leftJoin\(products,\s*productJoin\)\s*\.where\(and\(\.\.\.conditions\)\)/s
    );
  });

  it('approvals list count joins purchase order search tables before applying shared filters', () => {
    const source = readProjectFile('src/server/functions/suppliers/approvals.ts');

    expect(source).toMatch(/ilike\(purchaseOrders\.poNumber,\s*searchPattern\)/);
    expect(source).toMatch(/ilike\(suppliers\.name,\s*searchPattern\)/);
    expect(source).toMatch(/ilike\(users\.name,\s*searchPattern\)/);
    expect(source).toMatch(
      /\.select\(\{\s*count:\s*count\(\)\s*\}\)\s*\.from\(purchaseOrderApprovals\)\s*\.innerJoin\(purchaseOrders,\s*purchaseOrderJoin\)\s*\.leftJoin\(suppliers,\s*supplierJoin\)\s*\.leftJoin\(users,\s*requesterJoin\)\s*\.where\(whereClause\)/s
    );
  });
});

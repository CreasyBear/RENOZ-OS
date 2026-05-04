import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('forecasting allocatable stock contract', () => {
  it('uses allocatable availability for forecast and reorder stock promises', () => {
    const source = read('src/server/functions/inventory/forecasting.ts');

    expect(source).toContain('allocatableQuantitySumSql');
    expect(source).toContain('allocatableQuantitySumForOrganizationSql');
    expect(source).toContain('totalAvailable: allocatableQuantitySumSql()');
    expect(source).toContain('currentStock: allocatableQuantitySumForOrganizationSql(ctx.organizationId)');
    expect(source).toContain('quantityAvailable: allocatableQuantitySumSql()');
    expect(source).not.toContain('currentStock: sql<number>`COALESCE(SUM(CASE WHEN ${inventory.organizationId} = ${ctx.organizationId} THEN ${inventory.quantityOnHand}');
  });
});

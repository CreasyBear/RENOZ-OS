import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('allocatable stock aggregate contract', () => {
  it('centralizes current allocatable-stock SQL semantics', () => {
    const helper = read('src/server/functions/inventory/_allocatable-stock-sql.ts');

    expect(helper).toContain("CASE WHEN ${inventory.status} = 'available'");
    expect(helper).toContain('allocatableQuantitySumForOrganizationSql');
    expect(helper).toContain('${inventory.organizationId} = ${organizationId}');
    expect(helper).toContain('quantityAvailable');
    expect(helper).toContain('GROUP BY i.product_id');
    expect(helper).toContain("condition: 'low_stock' | 'out_of_stock'");
  });

  it('uses allocatable product counts for inventory dashboard alerts', () => {
    const dashboard = read('src/server/functions/inventory/dashboard.ts');

    expect(dashboard).toContain("import { allocatableStockCountSql } from './_allocatable-stock-sql';");
    expect(dashboard).toContain("allocatableStockCountSql(ctx.organizationId, 'low_stock')");
    expect(dashboard).toContain("allocatableStockCountSql(ctx.organizationId, 'out_of_stock')");
  });

  it('uses allocatable product counts for WMS current alert totals', () => {
    const wms = read('src/server/functions/inventory/wms-dashboard.ts');

    expect(wms).toContain("import { allocatableStockCountSql } from './_allocatable-stock-sql';");
    expect(wms).toContain("allocatableStockCountSql(ctx.organizationId, 'low_stock')");
    expect(wms).toContain("allocatableStockCountSql(ctx.organizationId, 'out_of_stock')");
  });

  it('uses allocatable quantities and sample rows for inventory alert triggering', () => {
    const triggeredAlerts = read('src/server/functions/inventory/triggered-alerts-read.ts');

    expect(triggeredAlerts).toContain(
      "import { allocatableQuantitySumSql } from './_allocatable-stock-sql';"
    );
    expect(triggeredAlerts).toContain('totalQuantity: allocatableQuantitySumSql()');
    expect(triggeredAlerts).toContain('having(sql`${allocatableQuantitySumSql()} <');
    expect(triggeredAlerts).toContain('having(sql`${allocatableQuantitySumSql()} <= 0`)');
    expect(triggeredAlerts).toContain("eq(inventory.status, 'available')");
  });
});

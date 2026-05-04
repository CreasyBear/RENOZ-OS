import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('WMS stock semantics contract', () => {
  it('declares dashboard stock semantics in the schema and server response', () => {
    const schema = read('src/lib/schemas/inventory/dashboard.ts');
    const wms = read('src/server/functions/inventory/wms-dashboard.ts');

    expect(schema).toContain('WMS_DASHBOARD_STOCK_SEMANTICS');
    expect(schema).toContain("totals: 'physical_on_hand'");
    expect(schema).toContain("breakdowns: 'physical_on_hand'");
    expect(schema).toContain("currentAlerts: 'allocatable_available'");
    expect(schema).toContain("previousPeriodComparison: 'movement_reconstructed_quantity'");
    expect(wms).toContain("import { allocatableStockCountSql } from './_allocatable-stock-sql';");
    expect(wms).toContain('stockSemantics: WMS_DASHBOARD_STOCK_SEMANTICS');
    expect(wms).toContain("allocatableStockCountSql(ctx.organizationId, 'low_stock')");
    expect(wms).toContain("allocatableStockCountSql(ctx.organizationId, 'out_of_stock')");
    expect(wms).toContain('Previous period alerts are movement-reconstructed quantity signals.');
  });

  it('does not show alert trend deltas unless alert semantics are comparable', () => {
    const dashboard = read('src/components/domain/inventory/unified-inventory-dashboard.tsx');

    expect(dashboard).toContain('const alertsComparisonIsComparable');
    expect(dashboard).toContain(
      'wmsData?.stockSemantics?.currentAlerts === wmsData?.stockSemantics?.previousPeriodComparison'
    );
    expect(dashboard).toContain('alertsComparisonIsComparable &&');
    expect(dashboard).toContain('comparison.alertsChange !== 0');
  });

  it('keeps valuation/reporting stock as physical on-hand finance inventory', () => {
    const valuation = read('src/server/functions/inventory/valuation.ts');
    const valuationReport = read('src/components/domain/inventory/reports/valuation-report.tsx');

    expect(valuation).not.toContain('_allocatable-stock-sql');
    expect(valuation).toContain('totalUnits: sql<number>`COALESCE(SUM(${inventory.quantityOnHand})');
    expect(valuation).toContain('totalQuantity: sql<number>`COALESCE(SUM(${inventory.quantityOnHand})');
    expect(valuation).toContain('const financeIntegrity = await getFinanceIntegritySummary(ctx.organizationId)');
    expect(valuationReport).toContain('On-Hand Units');
    expect(valuationReport).toContain('Physical on-hand value across product categories');
    expect(valuationReport).toContain('Physical on-hand value across warehouse locations');
  });
});

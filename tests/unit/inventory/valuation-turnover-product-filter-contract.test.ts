import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('inventory turnover product filter contract', () => {
  it('keeps product-scoped turnover reads from returning unrelated product rows', () => {
    const valuationSource = compact(read('src/server/functions/inventory/valuation.ts'));
    const source = compact(read('src/server/functions/inventory/inventory-turnover-read.ts'));

    expect(valuationSource).toContain(
      "import{readInventoryTurnover}from'./inventory-turnover-read'"
    );
    expect(valuationSource).not.toContain('product_cogsAS');
    expect(source).toContain(
      "product_cogsAS(SELECTproduct_id,COALESCE(SUM(ABS(total_cost)),0)asperiod_cogsFROMinventory_movementsWHEREorganization_id=${organizationId}ANDmovement_typeIN('pick','ship')ANDquantity<0ANDcreated_at>=NOW()-INTERVAL'1day'*${periodDays}${productId?sql`ANDproduct_id=${productId}`:sql``}GROUPBYproduct_id)"
    );
    expect(source).toContain(
      'product_inventoryAS(SELECTproduct_id,COALESCE(SUM(total_value),0)asinventory_valueFROMinventoryWHEREorganization_id=${organizationId}${productId?sql`ANDproduct_id=${productId}`:sql``}GROUPBYproduct_id)'
    );
    expect(source).toContain(
      "ANDp.nameISNOTNULLANDTRIM(p.name)!=''${productId?sql`ANDp.id=${productId}`:sql``}AND(COALESCE(pi.inventory_value,0)>0ORCOALESCE(pc.period_cogs,0)>0)"
    );
  });
});

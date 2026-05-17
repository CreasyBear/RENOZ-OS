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

describe('inventory valuation tenant-scope contract', () => {
  it('keeps valuation report product descriptors active and organization-bounded', () => {
    const source = compact(read('src/server/functions/inventory/valuation.ts'));

    expect(source).toContain(
      'functionvaluationInventoryProductJoinCondition(organizationId:string)'
    );
    expect(source).toContain(
      'eq(inventory.productId,products.id),eq(products.organizationId,organizationId),isNull(products.deletedAt)'
    );
    expect(source).toContain(
      'leftJoin(products,valuationInventoryProductJoinCondition(ctx.organizationId))'
    );
    expect(source).toContain(
      "productId:inventory.productId,productSku:sql<string>`COALESCE(${products.sku},'')`,productName:sql<string>`COALESCE(${products.name},'UnknownProduct')`"
    );
    expect(source).toContain(
      'leftJoin(costLayerCounts,eq(costLayerCounts.productId,inventory.productId))'
    );
    expect(source).toContain(
      'leftJoin(categories,and(eq(products.categoryId,categories.id),eq(categories.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'innerJoin(locations,and(eq(inventory.locationId,locations.id),eq(locations.organizationId,ctx.organizationId)))'
    );
    expect(source).not.toContain('innerJoin(products,eq(inventory.productId,products.id))');
    expect(source).not.toContain('leftJoin(categories,eq(products.categoryId,categories.id))');
    expect(source).not.toContain('innerJoin(locations,eq(inventory.locationId,locations.id))');
  });

  it('keeps finance integrity and aging joins organization-bounded', () => {
    const source = compact(read('src/server/functions/inventory/valuation.ts'));
    const financeIntegritySource = compact(
      read('src/server/functions/inventory/finance-integrity-summary.ts')
    );
    const agingSource = compact(read('src/server/functions/inventory/inventory-aging-read.ts'));

    expect(source).toContain(
      "import{getFinanceIntegritySummary}from'./finance-integrity-summary'"
    );
    expect(source).toContain("import{readInventoryAging}from'./inventory-aging-read'");
    expect(source).toContain(
      'returnreadInventoryAging({organizationId:ctx.organizationId,locationId:data.locationId,ageBuckets:data.ageBuckets,})'
    );
    expect(source).not.toContain('ASabsolute_drift');
    expect(source).not.toContain('EXTRACT(DAYFROMNOW()');
    expect(financeIntegritySource).toContain(
      'LEFTJOINproductspONp.id=i.product_idANDp.organization_id=${organizationId}ANDp.deleted_atISNULL'
    );
    expect(financeIntegritySource).toContain(
      'LEFTJOINwarehouse_locationslONl.id=i.location_idANDl.organization_id=${organizationId}'
    );
    expect(financeIntegritySource).toContain('WHEREi.organization_id=${organizationId}');
    expect(agingSource).toContain(
      'innerJoin(inventory,and(eq(inventoryCostLayers.inventoryId,inventory.id),eq(inventory.organizationId,organizationId)))'
    );
    expect(agingSource).toContain(
      'leftJoin(locations,and(eq(inventory.locationId,locations.id),eq(locations.organizationId,organizationId)))'
    );
  });

  it('keeps product cost-layer reads and weighted-average writes active and tenant-owned', () => {
    const source = compact(read('src/server/functions/inventory/valuation.ts'));

    expect(source).toContain(
      'eq(inventoryCostLayers.organizationId,ctx.organizationId),eq(inventory.productId,data.productId),eq(inventory.organizationId,ctx.organizationId)'
    );
    expect(source).toContain(
      'select({id:products.id}).from(products).where(and(eq(products.id,data.productId),eq(products.organizationId,ctx.organizationId),isNull(products.deletedAt)))'
    );
    expect(source).toContain("thrownewNotFoundError('Productnotfound','product')");
    expect(source).toContain(
      'update(products).set({costPrice:weightedAvgCost}).where(and(eq(products.id,data.productId),eq(products.organizationId,ctx.organizationId),isNull(products.deletedAt)))'
    );
    expect(source).not.toContain('update(products).set({costPrice:weightedAvgCost}).where(eq(products.id,data.productId))');
  });

  it('keeps manual cost-layer writes transactional and value-cache coherent', () => {
    const source = compact(read('src/server/functions/inventory/valuation.ts'));

    expect(source).toContain(
      "import{recomputeInventoryValueFromLayers}from'@/server/functions/_shared/inventory-finance'"
    );
    expect(source).toContain('exportconstcreateCostLayer=createServerFn({method:\'POST\'})');
    expect(source).toContain('returnawaitdb.transaction(async(tx)=>{');
    expect(source).toContain("sql`SELECTset_config('app.organization_id',${ctx.organizationId},false)`");
    expect(source).toContain(
      'const[inv]=awaittx.select({id:inventory.id}).from(inventory).where(and(eq(inventory.id,data.inventoryId),eq(inventory.organizationId,ctx.organizationId))).for(\'update\').limit(1)'
    );
    expect(source).toContain('awaitrecomputeInventoryValueFromLayers(tx,{organizationId:ctx.organizationId,inventoryId:data.inventoryId,userId:ctx.user.id,})');
  });
});

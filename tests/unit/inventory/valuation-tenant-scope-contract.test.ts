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
    const valuationReadSource = compact(
      read('src/server/functions/inventory/inventory-valuation-read.ts')
    );

    expect(source).toContain("import{readInventoryValuation}from'./inventory-valuation-read'");
    expect(source).toContain(
      'returnreadInventoryValuation({organizationId:ctx.organizationId,locationId:data.locationId,productId:data.productId,valuationMethod:data.valuationMethod,})'
    );
    expect(source).not.toContain('functionvaluationInventoryProductJoinCondition');
    expect(source).toContain(
      'exportconstgetInventoryValuation=createServerFn({method:\'GET\'})'
    );
    expect(valuationReadSource).toContain(
      'functionvaluationInventoryProductJoinCondition(organizationId:string)'
    );
    expect(valuationReadSource).toContain(
      'eq(inventory.productId,products.id),eq(products.organizationId,organizationId),isNull(products.deletedAt)'
    );
    expect(valuationReadSource).toContain(
      'leftJoin(products,valuationInventoryProductJoinCondition(organizationId))'
    );
    expect(valuationReadSource).toContain(
      "productId:inventory.productId,productSku:sql<string>`COALESCE(${products.sku},'')`,productName:sql<string>`COALESCE(${products.name},'UnknownProduct')`"
    );
    expect(valuationReadSource).toContain(
      'leftJoin(costLayerCounts,eq(costLayerCounts.productId,inventory.productId))'
    );
    expect(valuationReadSource).toContain(
      'leftJoin(categories,and(eq(products.categoryId,categories.id),eq(categories.organizationId,organizationId)))'
    );
    expect(valuationReadSource).toContain(
      'innerJoin(locations,and(eq(inventory.locationId,locations.id),eq(locations.organizationId,organizationId)))'
    );
    expect(valuationReadSource).not.toContain(
      'innerJoin(products,eq(inventory.productId,products.id))'
    );
    expect(valuationReadSource).not.toContain(
      'leftJoin(categories,eq(products.categoryId,categories.id))'
    );
    expect(valuationReadSource).not.toContain(
      'innerJoin(locations,eq(inventory.locationId,locations.id))'
    );
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
    const productCostLayerSource = compact(
      read('src/server/functions/inventory/product-cost-layers-read.ts')
    );

    expect(source).toContain("import{readProductCostLayers}from'./product-cost-layers-read'");
    expect(source).toContain(
      'returnreadProductCostLayers({organizationId:ctx.organizationId,productId:data.productId,})'
    );
    expect(source).not.toContain('lastPurchaseCost');
    expect(productCostLayerSource).toContain(
      'eq(inventoryCostLayers.organizationId,organizationId),eq(inventory.productId,productId),eq(inventory.organizationId,organizationId)'
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
    const costLayerReadSource = compact(
      read('src/server/functions/inventory/inventory-cost-layers-read.ts')
    );

    expect(source).toContain(
      "import{listInventoryCostLayers,readInventoryCostLayers,}from'./inventory-cost-layers-read'"
    );
    expect(source).toContain(
      'returnlistInventoryCostLayers({organizationId:ctx.organizationId,page,pageSize,inventoryId:filters.inventoryId,hasRemaining:filters.hasRemaining,})'
    );
    expect(source).toContain(
      'returnreadInventoryCostLayers({organizationId:ctx.organizationId,inventoryId:data.inventoryId,})'
    );
    expect(source).not.toContain('functiontoInventoryCostLayerRow');
    expect(costLayerReadSource).toContain('eq(inventoryCostLayers.organizationId,organizationId)');
    expect(costLayerReadSource).toContain(
      'eq(inventoryCostLayerCapitalizations.organizationId,organizationId)'
    );
    expect(costLayerReadSource).toContain(
      'where(and(eq(inventory.id,inventoryId),eq(inventory.organizationId,organizationId)))'
    );
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

  it('keeps COGS preview simulate-only, FIFO, and tenant-bounded', () => {
    const source = compact(read('src/server/functions/inventory/valuation.ts'));
    const cogsPreviewSource = compact(
      read('src/server/functions/inventory/inventory-cogs-preview.ts')
    );

    expect(source).toContain("import{previewInventoryCogs}from'./inventory-cogs-preview'");
    expect(source).toContain('exportconstcalculateCOGS=createServerFn({method:\'GET\'})');
    expect(source).toContain(
      'returnpreviewInventoryCogs({organizationId:ctx.organizationId,inventoryId:data.inventoryId,quantity:data.quantity,simulate:data.simulate,})'
    );
    expect(source).not.toContain('ManualCOGSapplicationisdisabled');
    expect(source).not.toContain('InsufficientinventoryforCOGScalculation');
    expect(cogsPreviewSource).toContain(
      "thrownewValidationError('ManualCOGSapplicationisdisabled.UseshipmentandRMAworkflowstopostCOGS.',{simulate:['Setsimulate=trueforpreviews;workflowmutationsapplycanonicalCOGS.'],})"
    );
    expect(cogsPreviewSource).toContain(
      'where(and(eq(inventory.id,inventoryId),eq(inventory.organizationId,organizationId)))'
    );
    expect(cogsPreviewSource).toContain(
      'eq(inventoryCostLayers.organizationId,organizationId),eq(inventoryCostLayers.inventoryId,inventoryId),gt(inventoryCostLayers.quantityRemaining,0)'
    );
    expect(cogsPreviewSource).toContain('orderBy(asc(inventoryCostLayers.receivedAt))');
    expect(cogsPreviewSource).toContain(
      "thrownewValidationError('InsufficientinventoryforCOGScalculation',{quantity:[`Only${totalAvailable}availableincostlayers`],})"
    );
    expect(cogsPreviewSource).toContain('unitCost:parseDecimal(layer.unitCost)');
  });
});

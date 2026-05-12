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

describe('inventory forecasting tenant-scope contract', () => {
  it('keeps manual forecast upsert updates organization-scoped', () => {
    const source = compact(read('src/server/functions/inventory/forecasting.ts'));

    expect(source).toContain('withAuth({permission:PERMISSIONS.inventory.forecast})');
    expect(source).toContain(
      'where(and(eq(inventoryForecasts.id,existing.id),eq(inventoryForecasts.organizationId,ctx.organizationId)))'
    );
    expect(source).not.toContain('.where(eq(inventoryForecasts.id,existing.id))');
  });

  it('validates forecast products as active, purchasable, and tenant-owned before writing', () => {
    const source = compact(read('src/server/functions/inventory/forecasting.ts'));

    expect(source).toContain('functionforecastProductWhereCondition(productId:string,organizationId:string)');
    expect(source).toContain(
      "eq(products.id,productId),eq(products.organizationId,organizationId),eq(products.status,'active'),eq(products.isActive,true),eq(products.isPurchasable,true),isNull(products.deletedAt)"
    );
    expect(source).toContain('where(forecastProductWhereCondition(data.productId,ctx.organizationId))');
    expect(source).toContain('constproductIds=Array.from(newSet(data.forecasts.map');
    expect(source).toContain('eq(products.organizationId,ctx.organizationId)');
    expect(source).toContain('inArray(products.id,productIds)');
    expect(source).toContain("eq(products.status,'active')");
    expect(source).toContain('eq(products.isActive,true)');
    expect(source).toContain('eq(products.isPurchasable,true)');
    expect(source).toContain('isNull(products.deletedAt)');
    expect(source).toContain('if(ownedProducts.length!==productIds.length)');
    expect(source).toContain("thrownewNotFoundError('Oneormoreproductsnotfound','product')");
  });

  it('keeps reorder recommendation joins organization-bounded and purchasable-scoped', () => {
    const source = compact(read('src/server/functions/inventory/forecasting.ts'));

    expect(source).toContain(
      'leftJoin(inventory,and(eq(inventory.productId,products.id),eq(inventory.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'leftJoin(warehouseLocations,and(eq(inventory.locationId,warehouseLocations.id),eq(warehouseLocations.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      "where(and(eq(products.organizationId,ctx.organizationId),eq(products.status,'active'),eq(products.isActive,true),eq(products.isPurchasable,true),isNull(products.deletedAt)))"
    );
  });

  it('preserves allocatable-stock forecasting semantics', () => {
    const source = read('src/server/functions/inventory/forecasting.ts');

    expect(source).toContain('allocatableQuantitySumSql');
    expect(source).toContain('allocatableQuantitySumForOrganizationSql');
    expect(source).toContain('currentStock: allocatableQuantitySumForOrganizationSql(ctx.organizationId)');
  });
});

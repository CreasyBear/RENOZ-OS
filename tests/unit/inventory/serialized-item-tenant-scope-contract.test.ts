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

describe('inventory serialized item tenant-scope contract', () => {
  it('keeps serialized read product descriptors active and organization-bounded', () => {
    const source = compact(read('src/server/functions/inventory/serialized-items.ts'));

    expect(source).toContain('functionserializedProductJoinCondition(organizationId:string)');
    expect(source).toContain(
      'eq(products.id,serializedItems.productId),eq(products.organizationId,organizationId),isNull(products.deletedAt)'
    );
    expect(source).toContain(
      'leftJoin(products,serializedProductJoinCondition(ctx.organizationId))'
    );
    expect(source).toContain(
      'leftJoin(inventory,and(eq(inventory.id,serializedItems.currentInventoryId),eq(inventory.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'leftJoin(warehouseLocations,and(eq(warehouseLocations.id,inventory.locationId),eq(warehouseLocations.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'leftJoin(purchaseOrderReceiptItems,and(eq(purchaseOrderReceiptItems.id,serializedItems.sourceReceiptItemId),eq(purchaseOrderReceiptItems.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'leftJoin(purchaseOrderReceipts,and(eq(purchaseOrderReceipts.id,purchaseOrderReceiptItems.receiptId),eq(purchaseOrderReceipts.organizationId,ctx.organizationId)))'
    );
  });

  it('validates serialized product ownership as active on create and update', () => {
    const source = read('src/server/functions/inventory/serialized-items.ts');
    const compactSource = compact(source);
    const productOwnershipChecks = (
      compactSource.match(
        /serializedProductWhereCondition\(data\.productId,ctx\.organizationId\)/g
      ) ?? []
    ).length;

    expect(compactSource).toContain('functionserializedProductWhereCondition(productId:string,organizationId:string)');
    expect(compactSource).toContain(
      'eq(products.id,productId),eq(products.organizationId,organizationId),isNull(products.deletedAt)'
    );
    expect(productOwnershipChecks).toBeGreaterThanOrEqual(2);
    expect(compactSource).toContain("thrownewNotFoundError('Productnotfound','product')");
  });

  it('keeps serialized inventory linkage product-consistent', () => {
    const source = compact(read('src/server/functions/inventory/serialized-items.ts'));

    expect(source).toContain('productId:serializedItems.productId');
    expect(source).toContain('inventoryRow.productId!==(data.productId??existing.productId)');
    expect(source).toContain("createSerializedStateError('Inventoryitemproductdoesnotmatchselectedproduct'");
  });

  it('keeps serialized item lifecycle writes organization-scoped', () => {
    const source = compact(read('src/server/functions/inventory/serialized-items.ts'));

    expect(source).toContain(
      'where(and(eq(serializedItems.id,data.id),eq(serializedItems.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'where(and(eq(serializedItemEvents.serializedItemId,data.id),eq(serializedItemEvents.organizationId,ctx.organizationId)))'
    );
    expect(source).not.toContain('.where(eq(serializedItems.id,data.id))');
    expect(source).not.toContain('.where(eq(serializedItemEvents.serializedItemId,data.id))');
  });

  it('preserves serialized lineage mutation contracts', () => {
    const source = read('src/server/functions/inventory/serialized-items.ts');

    expect(source).toContain('addSerializedItemEvent');
    expect(source).toContain('releaseSerializedItemAllocation');
    expect(source).toContain('serializedMutationResultSchema.parse');
    expect(source).toContain('isMissingSerializedInfraError');
  });
});

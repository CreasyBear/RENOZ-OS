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

describe('inventory transfer tenant-scope contract', () => {
  it('keeps transfer authorization and transaction tenant-scoped', () => {
    const source = read('src/server/functions/inventory/transfers.ts');

    expect(source).toContain(
      'const ctx = await withAuth({ permission: PERMISSIONS.inventory.transfer });'
    );
    expect(source).toContain(
      "sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`"
    );
    expect(source).toContain('eq(products.organizationId, ctx.organizationId)');
  });

  it('keeps transfer inventory reads and final updates organization-scoped', () => {
    const source = read('src/server/functions/inventory/transfers.ts');

    expect(source).toContain('eq(inventory.organizationId, ctx.organizationId)');
    expect(source).toContain(
      'where(and(eq(inventory.id, row.id), eq(inventory.organizationId, ctx.organizationId)))'
    );
    expect(source).toContain(
      'and(eq(inventory.id, destRow.id), eq(inventory.organizationId, ctx.organizationId))'
    );
    expect(source).toContain('eq(inventory.id, sourceInventory.id)');
    expect(source).toContain('eq(inventory.id, destInventory.id)');
  });

  it('locks the transfer product serialization gate inside the transaction', () => {
    const source = compact(read('src/server/functions/inventory/transfers.ts'));

    expect(source).toContain('returnawaitdb.transaction(async(tx)=>{');
    expect(source).toContain(
      "const[product]=awaittx.select({id:products.id,isSerialized:products.isSerialized}).from(products).where(and(eq(products.id,data.productId),eq(products.organizationId,ctx.organizationId),isNull(products.deletedAt))).for('update').limit(1);"
    );
    expect(source).toContain("if(product.isSerialized){");
    expect(source).not.toContain('const[product]=awaitdb.select');
  });

  it('preserves transfer finance and serialized-lineage continuity contracts', () => {
    const source = read('src/server/functions/inventory/transfers.ts');

    expect(source).toContain('moveLayersBetweenInventory');
    expect(source).toContain('recomputeInventoryValueFromLayers');
    expect(source).toContain('assertSerializedInventoryCostIntegrity');
    expect(source).toContain('upsertSerializedItemForInventory');
    expect(source).toContain('addSerializedItemEvent');
    expect(source).toContain('inventoryFinanceMutationSuccess');
  });

  it('preserves source disposition when transfer creates destination inventory and lineage', () => {
    const source = compact(read('src/server/functions/inventory/transfers.ts'));

    expect(source).toContain(
      "functionresolveTransferDestinationStatus(status:InventoryStatus):TransferDestinationStatus{if(status==='damaged'||status==='returned'||status==='quarantined'){returnstatus;}return'available';}"
    );
    expect(source).toContain(
      "functionmapTransferDestinationStatusToSerializedStatus(status:TransferDestinationStatus):SerializedTransferStatus{if(status==='damaged')return'scrapped';if(status==='returned'||status==='quarantined')returnstatus;return'available';}"
    );
    expect(source).toContain(
      'constdestinationStatus=resolveTransferDestinationStatus(row.status);'
    );
    expect(source).toContain('status:destinationStatus');
    expect(source).toContain(
      'constserializedStatus=mapTransferDestinationStatusToSerializedStatus(destinationStatus);'
    );
    expect(source).toContain('status:serializedStatus');
    expect(source).toContain(
      'constdestinationStatus=resolveTransferDestinationStatus(sourceInventory.status);'
    );
    expect(source).toContain('eq(inventory.status,destinationStatus)');
    expect(source).not.toContain("status:'available'");
  });

  it('requires row scope for non-serialized source selection', () => {
    const transferServer = compact(read('src/server/functions/inventory/transfers.ts'));
    const transferHook = compact(read('src/hooks/inventory/use-transfer-inventory.ts'));

    expect(transferServer).toContain("if(!product.isSerialized&&!data.inventoryId){");
    expect(transferServer).toContain(
      "thrownewValidationError('Non-serializedtransferrequiresasourceinventoryrow'"
    );
    expect(transferServer).toContain("code:['source_inventory_row_required']");
    expect(transferHook).toContain('Transfersarerow-orserial-scoped');
    expect(transferHook).toContain('Product/locationaggregatemathcan');
    expect(transferHook).toContain('patchthewronglot,disposition,orserializedrow');
    expect(transferHook).not.toContain('setQueriesData<InventoryListResult>');
    expect(transferHook).not.toContain('setQueriesData<InventoryDetailResult>');
  });

  it('persists transfer reason as movement context without container-side notes duplication', () => {
    const transferServer = read('src/server/functions/inventory/transfers.ts');
    const detailContainer = read(
      'src/components/domain/inventory/containers/inventory-detail-container.tsx'
    );

    expect(transferServer).toContain('const transferNotes = data.notes ?? data.reason;');
    expect(transferServer).toContain('...(data.reason ? { reason: data.reason } : {})');
    expect(transferServer).toContain('metadata: transferMetadata');
    expect(transferServer).toContain('notes: transferNotes');
    expect(detailContainer).toContain('reason: data.reason');
    expect(detailContainer).toContain('notes: data.notes');
    expect(detailContainer).not.toContain('notes: data.reason');
  });
});

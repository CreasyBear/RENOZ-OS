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

function sourceBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);

  return source.slice(startIndex, endIndex);
}

function genericStatusUpdateBlock(source: string): string {
  const returnedIndex = source.indexOf("if(data.status==='returned')");
  expect(returnedIndex).toBeGreaterThanOrEqual(0);

  const returnedResponseIndex = source.indexOf(
    'returnserializedMutationSuccess(shipment,`Shipmentstatusupdatedto${data.status}.`',
    returnedIndex
  );
  expect(returnedResponseIndex).toBeGreaterThan(returnedIndex);

  const startIndex = source.indexOf('constshipment=awaitdb.transaction', returnedResponseIndex);
  expect(startIndex).toBeGreaterThan(returnedResponseIndex);

  const endIndex = source.indexOf(
    'returnserializedMutationSuccess(shipment,`Shipmentstatusupdatedto${data.status}.`',
    startIndex
  );
  expect(endIndex).toBeGreaterThan(startIndex);

  return source.slice(startIndex, endIndex);
}

describe('shipment status write-scope contract', () => {
  it('keeps returned shipment status and item reads tenant-scoped', () => {
    const source = compact(read('src/server/functions/orders/order-shipments-status.ts'));
    const block = sourceBetween(
      source,
      "if(data.status==='returned')",
      'returnserializedMutationSuccess(shipment,`Shipmentstatusupdatedto${data.status}.`'
    );

    expect(block).toContain(
      '.where(and(eq(orderShipments.id,data.id),eq(orderShipments.organizationId,ctx.organizationId),eq(orderShipments.status,existing.status))).returning();'
    );
    expect(block).toContain(
      "if(!updatedShipment){thrownewValidationError('Shipmentstatuschangedwhileupdatingreturnstatus'"
    );
    expect(block).toContain(
      '.where(and(eq(shipmentItems.shipmentId,data.id),eq(shipmentItems.organizationId,ctx.organizationId)))'
    );
  });

  it('proves returned serialized item writes before lineage events', () => {
    const source = compact(read('src/server/functions/orders/order-shipments-status.ts'));
    const block = sourceBetween(
      source,
      "if(data.status==='returned')",
      'returnserializedMutationSuccess(shipment,`Shipmentstatusupdatedto${data.status}.`'
    );

    expect(block).toContain(
      '.where(and(eq(serializedItems.id,serializedItem.id),eq(serializedItems.organizationId,ctx.organizationId))).returning({id:serializedItems.id});'
    );
    expect(block).toContain(
      "if(!updatedSerializedItem){thrownewValidationError('Serializeditemrecordnotfound'"
    );
    expect(block.indexOf("if(!updatedSerializedItem){thrownewValidationError('Serializeditemrecordnotfound'")).toBeLessThan(
      block.indexOf('awaitaddSerializedItemEvent')
    );
  });

  it('keeps generic status updates scoped and activity in the same transaction', () => {
    const source = compact(read('src/server/functions/orders/order-shipments-status.ts'));
    const block = genericStatusUpdateBlock(source);

    expect(block).toContain("set_config('app.organization_id'");
    expect(block).toContain(
      '.where(and(eq(orderShipments.id,data.id),eq(orderShipments.organizationId,ctx.organizationId),eq(orderShipments.status,existing.status))).returning();'
    );
    expect(block).toContain(
      "if(!updatedShipment){thrownewValidationError('Shipmentstatuschangedwhileupdatingshipment'"
    );
    expect(block.indexOf("if(!updatedShipment){thrownewValidationError('Shipmentstatuschangedwhileupdatingshipment'")).toBeLessThan(
      block.indexOf('awaittx.insert(activities)')
    );
  });

  it('keeps tracking event updates tenant-scoped and evidence-bearing', () => {
    const source = compact(read('src/server/functions/orders/order-shipments-status.ts'));
    const block = sourceBetween(
      source,
      'exportasyncfunctionaddTrackingEventHandler',
      'returnshipment;'
    );

    expect(block).toContain(
      '.where(and(eq(orderShipments.id,data.shipmentId),eq(orderShipments.organizationId,ctx.organizationId))).returning();'
    );
    expect(block).toContain("if(!shipment){thrownewNotFoundError('Shipmentnotfound');}");
  });
});

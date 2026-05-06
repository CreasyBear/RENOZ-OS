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

function sourceFrom(source: string, start: string): string {
  const startIndex = source.indexOf(start);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  return source.slice(startIndex);
}

describe('draft shipment write-scope contract', () => {
  it('proves saved order shipping address writes during shipment creation', () => {
    const source = compact(read('src/server/functions/orders/order-shipments-draft.ts'));
    const block = sourceBetween(
      source,
      'exportasyncfunctioncreateShipmentHandler',
      'exportasyncfunctionupdateShipmentHandler'
    );

    expect(block).toContain(
      '.where(and(eq(orders.id,data.orderId),eq(orders.organizationId,ctx.organizationId),isNull(orders.deletedAt))).returning({id:orders.id});'
    );
    expect(block).toContain("if(!updatedOrder){thrownewNotFoundError('Ordernotfound');}");
    expect(block.indexOf("if(!updatedOrder){thrownewNotFoundError('Ordernotfound'")).toBeLessThan(
      block.indexOf('const[shipment]=awaittx.insert(orderShipments)')
    );
  });

  it('keeps direct pending shipment edits tenant-scoped, state-scoped, and evidence-bearing', () => {
    const source = compact(read('src/server/functions/orders/order-shipments-draft.ts'));
    const block = sourceBetween(
      source,
      'exportasyncfunctionupdateShipmentHandler',
      'exportasyncfunctiondeleteShipmentHandler'
    );

    expect(block).toContain(
      ".where(and(eq(orderShipments.id,id),eq(orderShipments.organizationId,ctx.organizationId),eq(orderShipments.status,'pending'))).returning();"
    );
    expect(block).toContain(
      "if(!shipment){thrownewValidationError('Onlypendingshipmentscanbeediteddirectly'"
    );
  });

  it('locks pending shipments before deleting draft shipment items', () => {
    const source = compact(read('src/server/functions/orders/order-shipments-draft.ts'));
    const block = sourceFrom(source, 'exportasyncfunctiondeleteShipmentHandler');

    expect(block).toContain(".limit(1).for('update');");
    expect(block).toContain("if(!lockedShipment){thrownewNotFoundError('Shipmentnotfound');}");
    expect(block).toContain("if(lockedShipment.status!=='pending'){thrownewValidationError('Onlypendingshipmentscanbedeleted'");
    expect(block.indexOf("if(lockedShipment.status!=='pending'")).toBeLessThan(
      block.indexOf('awaittx.delete(shipmentItems)')
    );
  });

  it('keeps draft shipment item and shipment deletes tenant-scoped', () => {
    const source = compact(read('src/server/functions/orders/order-shipments-draft.ts'));
    const block = sourceFrom(source, 'exportasyncfunctiondeleteShipmentHandler');

    expect(block).toContain(
      '.delete(shipmentItems).where(and(eq(shipmentItems.shipmentId,data.id),eq(shipmentItems.organizationId,ctx.organizationId)))'
    );
    expect(block).toContain(
      ".delete(orderShipments).where(and(eq(orderShipments.id,data.id),eq(orderShipments.organizationId,ctx.organizationId),eq(orderShipments.status,'pending'))).returning({id:orderShipments.id});"
    );
    expect(block).toContain("if(!deleted){thrownewNotFoundError('Shipmentnotfoundoralreadydeleted');}");
  });
});

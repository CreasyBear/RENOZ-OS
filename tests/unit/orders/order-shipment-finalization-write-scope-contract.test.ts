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

describe('shipment finalization write-scope contract', () => {
  it('keeps mark-shipped shipment and item reads tenant-scoped and state-scoped', () => {
    const source = compact(read('src/server/functions/orders/order-shipments-finalization.ts'));
    const block = sourceBetween(
      source,
      'exportasyncfunctionmarkShipmentAsShipped',
      'exportasyncfunctionmarkShippedHandler'
    );

    expect(block).toContain(
      ".where(and(eq(orderShipments.id,data.id),eq(orderShipments.organizationId,ctx.organizationId),eq(orderShipments.status,'pending'))).returning();"
    );
    expect(block).toContain("if(!updatedShipment){thrownewValidationError('Shipmentalreadyshipped'");
    expect(block).toContain(
      '.where(and(eq(shipmentItems.shipmentId,data.id),eq(shipmentItems.organizationId,ctx.organizationId)))'
    );
  });

  it('proves mark-shipped line-item writes belong to the shipment order', () => {
    const source = compact(read('src/server/functions/orders/order-shipments-finalization.ts'));
    const block = sourceBetween(
      source,
      'exportasyncfunctionmarkShipmentAsShipped',
      'exportasyncfunctionmarkShippedHandler'
    );

    expect(block).toContain(
      '.where(and(eq(orderLineItems.id,item.orderLineItemId),eq(orderLineItems.orderId,existing.orderId),eq(orderLineItems.organizationId,ctx.organizationId))).returning({id:orderLineItems.id});'
    );
    expect(block).toContain(
      "if(!updatedLineItem){thrownewValidationError('Lineitemnotfoundordoesnotbelongtoorder'"
    );
    expect(block.indexOf("if(!updatedLineItem){thrownewValidationError('Lineitemnotfound")).toBeLessThan(
      block.indexOf('const[lineItemWithProduct]')
    );
    expect(block).toContain(
      '.where(and(eq(orderLineItems.id,item.orderLineItemId),eq(orderLineItems.orderId,existing.orderId),eq(orderLineItems.organizationId,ctx.organizationId))).limit(1);'
    );
  });

  it('keeps reopen shipment item reads and reverse shipped-quantity writes scoped', () => {
    const source = compact(read('src/server/functions/orders/order-shipments-finalization.ts'));
    const block = sourceBetween(
      source,
      'exportasyncfunctionreopenShipmentHandler',
      'exportasyncfunctionimportFulfillmentShipmentsHandler'
    );

    expect(block).toContain(
      '.where(and(eq(shipmentItems.shipmentId,existing.id),eq(shipmentItems.organizationId,ctx.organizationId)))'
    );
    expect(block).toContain(
      '.where(and(eq(orderLineItems.id,item.orderLineItemId),eq(orderLineItems.orderId,existing.orderId),eq(orderLineItems.organizationId,ctx.organizationId))).returning({id:orderLineItems.id});'
    );
    expect(block).toContain(
      "if(!updatedLineItem){thrownewValidationError('Lineitemnotfoundordoesnotbelongtoorder'"
    );
    expect(block).toContain(
      '.where(and(eq(orderLineItems.id,item.orderLineItemId),eq(orderLineItems.orderId,existing.orderId),eq(orderLineItems.organizationId,ctx.organizationId))).limit(1);'
    );
  });

  it('keeps reopen shipment status write state-scoped and evidence-bearing', () => {
    const source = compact(read('src/server/functions/orders/order-shipments-finalization.ts'));
    const block = sourceBetween(
      source,
      'exportasyncfunctionreopenShipmentHandler',
      'exportasyncfunctionimportFulfillmentShipmentsHandler'
    );

    expect(block).toContain(
      '.where(and(eq(orderShipments.id,existing.id),eq(orderShipments.organizationId,ctx.organizationId),eq(orderShipments.status,existing.status))).returning();'
    );
    expect(block).toContain(
      "if(!updatedShipment){thrownewValidationError('Shipmentcannotbereopenedfromthecurrentstate'"
    );
    expect(block.indexOf("if(!updatedShipment){thrownewValidationError('Shipmentcannotbereopened")).toBeLessThan(
      block.indexOf('awaitrecomputeOrderFulfillmentStatus')
    );
  });
});

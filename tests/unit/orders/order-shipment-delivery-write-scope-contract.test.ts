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

describe('shipment delivery write-scope contract', () => {
  it('uses one scoped helper for delivered quantity writes', () => {
    const source = compact(read('src/server/functions/orders/order-shipments-status.ts'));
    const helper = sourceBetween(
      source,
      'asyncfunctionincrementDeliveredQuantitiesForShipment',
      'exportasyncfunctionupdateShipmentStatusHandler'
    );

    expect(helper).toContain(
      '.where(and(eq(shipmentItems.shipmentId,params.shipmentId),eq(shipmentItems.organizationId,params.organizationId)))'
    );
    expect(helper).toContain(
      '.where(and(eq(orderLineItems.id,item.orderLineItemId),eq(orderLineItems.orderId,params.orderId),eq(orderLineItems.organizationId,params.organizationId))).returning({id:orderLineItems.id});'
    );
    expect(helper).toContain(
      "if(!updatedLineItem){thrownewValidationError('Lineitemnotfoundordoesnotbelongtoorder'"
    );
  });

  it('keeps delivered status updates state-scoped before entitlements are created', () => {
    const source = compact(read('src/server/functions/orders/order-shipments-status.ts'));
    const block = sourceBetween(
      source,
      "if(data.status==='delivered')",
      "if(data.status==='returned')"
    );

    expect(block).toContain(
      '.where(and(eq(orderShipments.id,data.id),eq(orderShipments.organizationId,ctx.organizationId),eq(orderShipments.status,existing.status))).returning();'
    );
    expect(block).toContain(
      "if(!updatedShipment){thrownewValidationError('Shipmentstatuschangedwhileupdatingdelivery'"
    );
    expect(block.indexOf('awaitincrementDeliveredQuantitiesForShipment')).toBeLessThan(
      block.indexOf('awaitbumpOrderAggregateVersion')
    );
    expect(block.indexOf('awaitbumpOrderAggregateVersion')).toBeLessThan(
      block.indexOf('awaitcreateEntitlementsForDeliveredShipmentTx')
    );
  });

  it('keeps confirm-delivery status updates state-scoped before fulfillment recompute and entitlements', () => {
    const source = compact(read('src/server/functions/orders/order-shipments-status.ts'));
    const block = sourceBetween(
      source,
      'exportasyncfunctionconfirmDeliveryHandler',
      'exportasyncfunctionaddTrackingEventHandler'
    );

    expect(source).toContain(
      "constDELIVERABLE_SHIPMENT_STATUSES=['in_transit','out_for_delivery']asconst;"
    );
    expect(block).toContain(
      '.where(and(eq(orderShipments.id,data.id),eq(orderShipments.organizationId,ctx.organizationId),inArray(orderShipments.status,DELIVERABLE_SHIPMENT_STATUSES))).returning();'
    );
    expect(block).toContain(
      "if(!updatedShipment){thrownewValidationError('Shipmentcannotbeconfirmedasdelivered'"
    );
    expect(block.indexOf('awaitincrementDeliveredQuantitiesForShipment')).toBeLessThan(
      block.indexOf('awaitrecomputeOrderFulfillmentStatus')
    );
    expect(block.indexOf('awaitrecomputeOrderFulfillmentStatus')).toBeLessThan(
      block.indexOf('awaitcreateEntitlementsForDeliveredShipmentTx')
    );
  });

  it('keeps aggregate version bumps scoped to active orders', () => {
    const source = compact(read('src/server/functions/orders/_order-aggregate.ts'));
    const block = sourceFrom(source, 'exportasyncfunctionbumpOrderAggregateVersion');

    expect(block).toContain(
      'eq(orders.id,params.orderId),eq(orders.organizationId,params.organizationId),isNull(orders.deletedAt)'
    );
    expect(block).toContain('.returning({id:orders.id});');
    expect(block).toContain("if(!updated){thrownewNotFoundError('Ordernotfound','order');}");
  });
});

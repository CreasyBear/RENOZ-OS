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

describe('shipment validation contract', () => {
  it('aggregates requested quantities by line before checking picked availability', () => {
    const source = compact(read('src/server/functions/orders/order-shipments-validation.ts'));

    expect(source).toContain('constrequestedQuantityByLineItem=newMap<string,number>();');
    expect(source).toContain(
      'requestedQuantityByLineItem.set(item.orderLineItemId,(requestedQuantityByLineItem.get(item.orderLineItemId)??0)+item.quantity);'
    );
    expect(source).toContain(
      'constrequestedQuantityForLine=requestedQuantityByLineItem.get(item.orderLineItemId)??item.quantity;'
    );
    expect(source).toContain('if(requestedQuantityForLine>available)');
    expect(source).not.toContain('if(item.quantity>available)');
  });

  it('uses aggregate requested quantity for reserved picked inventory checks', () => {
    const source = compact(read('src/server/functions/orders/order-shipments-validation.ts'));

    expect(source).toContain('if(requestedQuantityForLine>reservedQuantity)');
    expect(source).toContain('requested${requestedQuantityForLine}');
    expect(source).not.toContain('if(item.quantity>reservedQuantity)');
  });

  it('rejects duplicate serials across shipment rows for the same line', () => {
    const source = compact(read('src/server/functions/orders/order-shipments-validation.ts'));

    expect(source).toContain('constrequestedSerialsByLineItem=newMap<string,Set<string>>();');
    expect(source).toContain(
      'constrequestedSerialsForLine=requestedSerialsByLineItem.get(item.orderLineItemId)??newSet<string>();'
    );
    expect(source).toContain('if(requestedSerialsForLine.has(sn))');
    expect(source).toContain(
      'requestedSerialsByLineItem.set(item.orderLineItemId,requestedSerialsForLine);'
    );
  });

  it('keeps pending reservation shipment-item reads tenant-scoped', () => {
    const source = compact(read('src/server/functions/orders/order-pending-shipment-reservations.ts'));

    expect(source).toContain('eq(shipmentItems.organizationId,params.organizationId)');
    expect(source).toContain(
      'eq(orderShipments.organizationId,params.organizationId),eq(orderShipments.orderId,params.orderId),eq(orderShipments.status,\'pending\'),eq(shipmentItems.organizationId,params.organizationId)'
    );
  });
});

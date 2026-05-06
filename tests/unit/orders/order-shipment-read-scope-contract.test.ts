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

describe('shipment read scope contract', () => {
  it('scopes shipment detail items by shipment and tenant', () => {
    const source = compact(read('src/server/functions/orders/order-shipments-read.ts'));

    expect(source).toContain(
      '.where(and(eq(shipmentItems.shipmentId,data.id),eq(shipmentItems.organizationId,ctx.organizationId)))'
    );
    expect(source).not.toContain('.where(eq(shipmentItems.shipmentId,data.id));');
  });

  it('scopes order shipment item batches by shipment ids and tenant', () => {
    const source = compact(read('src/server/functions/orders/order-shipments-read.ts'));

    expect(source).toContain(
      '.where(and(inArray(shipmentItems.shipmentId,shipmentIds),eq(shipmentItems.organizationId,ctx.organizationId)))'
    );
    expect(source).not.toContain('.where(inArray(shipmentItems.shipmentId,shipmentIds))');
  });

  it('scopes shipment line quantity lookups by line ids, tenant, and order', () => {
    const source = compact(read('src/server/functions/orders/order-shipments-read.ts'));

    expect(source).toContain(
      '.where(and(inArray(orderLineItems.id,lineItemIds),eq(orderLineItems.organizationId,ctx.organizationId),eq(orderLineItems.orderId,data.orderId)))'
    );
    expect(source).not.toContain('.where(inArray(orderLineItems.id,lineItemIds))');
  });
});

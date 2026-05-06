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

describe('document generation read scope contract', () => {
  it('requires organization scope when resolving shipment serials for documents', () => {
    const source = compact(
      read('src/server/functions/documents/fetch-order-line-items-with-serials.ts')
    );

    expect(source).toContain(
      'exportasyncfunctionfetchShipmentSerialsByOrderLineItem(orderId:string,organizationId:string)'
    );
    expect(source).toContain('eq(orderShipments.orderId,orderId)');
    expect(source).toContain('eq(orderShipments.organizationId,organizationId)');
    expect(source).toContain('eq(shipmentItems.organizationId,organizationId)');
    expect(source).toContain('eq(shipmentItemSerials.organizationId,organizationId)');
    expect(source).toContain('eq(serializedItems.organizationId,organizationId)');
    expect(source).not.toContain('.where(eq(orderShipments.orderId,orderId));');
  });

  it('requires organization scope when resolving allocated serial fallbacks', () => {
    const source = compact(
      read('src/server/functions/documents/fetch-order-line-items-with-serials.ts')
    );

    expect(source).toContain(
      'exportasyncfunctionfetchAllocatedSerialsByOrderLineItem(orderLineItemIds:string[],organizationId:string)'
    );
    expect(source).toContain('eq(orderLineSerialAllocations.organizationId,organizationId)');
    expect(source).toContain('eq(serializedItems.organizationId,organizationId)');
  });

  it('scopes synchronous document order and shipment line reads by tenant and order', () => {
    const source = compact(read('src/server/functions/documents/generate-documents-sync.tsx'));

    expect(source).toContain(
      '.where(and(eq(orderLineItems.orderId,orderId),eq(orderLineItems.organizationId,organizationId)))'
    );
    expect(source).toContain('fetchShipmentSerialsByOrderLineItem(orderId,ctx.organizationId)');
    expect(source).toContain(
      'fetchAllocatedSerialsByOrderLineItem(orderData.lineItems.map((item)=>item.id),ctx.organizationId)'
    );
    expect(source).toContain(
      '.where(and(eq(shipmentItems.shipmentId,shipmentId),eq(shipmentItems.organizationId,organizationId),eq(orderLineItems.organizationId,organizationId),eq(orderLineItems.orderId,shipment.orderId)))'
    );
    expect(source).toContain(
      '.where(and(inArray(orderLineItems.id,lineItemIds),eq(orderLineItems.organizationId,params.organizationId),eq(orderLineItems.orderId,params.orderId)))'
    );
  });

  it('scopes background financial document line reads by tenant', () => {
    for (const path of [
      'src/trigger/jobs/generate-quote-pdf.tsx',
      'src/trigger/jobs/generate-invoice-pdf.tsx',
    ]) {
      const source = compact(read(path));

      expect(source).toContain(
        '.where(and(eq(orderLineItems.orderId,orderId),eq(orderLineItems.organizationId,organizationId)))'
      );
      expect(source).not.toContain('.where(eq(orderLineItems.orderId,orderId))');
    }
  });

  it('scopes background operational document line and serial reads by tenant', () => {
    for (const path of [
      'src/trigger/jobs/generate-packing-slip-pdf.tsx',
      'src/trigger/jobs/generate-delivery-note-pdf.tsx',
    ]) {
      const source = compact(read(path));

      expect(source).toContain(
        '.where(and(eq(orderLineItems.orderId,orderId),eq(orderLineItems.organizationId,organizationId)))'
      );
      expect(source).toContain('fetchShipmentSerialsByOrderLineItem(orderId,organizationId)');
      expect(source).not.toContain('.where(eq(orderLineItems.orderId,orderId))');
    }
  });
});

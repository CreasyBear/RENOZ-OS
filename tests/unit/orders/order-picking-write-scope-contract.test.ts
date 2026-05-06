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

describe('order picking write-scope contract', () => {
  it('locks the active tenant-scoped order inside picking transactions', () => {
    const source = compact(read('src/server/functions/orders/order-picking.ts'));
    const helper = sourceBetween(
      source,
      'asyncfunctionlockActiveOrderForPicking',
      'exportconstpickOrderItems='
    );
    const pickBlock = sourceBetween(
      source,
      'exportconstpickOrderItems=',
      '//============================================================================//UNPICKORDERITEMS'
    );
    const unpickBlock = sourceFrom(source, 'exportconstunpickOrderItems=');

    expect(helper).toContain(
      'eq(orders.id,params.orderId),eq(orders.organizationId,params.organizationId),isNull(orders.deletedAt)'
    );
    expect(helper).toContain(".limit(1).for('update');");
    expect(pickBlock).toContain(
      "currentStatus=awaitlockActiveOrderForPicking(tx,{orderId:data.orderId,organizationId:ctx.organizationId,action:'pickable',});"
    );
    expect(unpickBlock).toContain(
      "currentStatus=awaitlockActiveOrderForPicking(tx,{orderId:data.orderId,organizationId:ctx.organizationId,action:'unpickable',});"
    );
  });

  it('proves pick line-item writes before recording fulfillment identity', () => {
    const source = compact(read('src/server/functions/orders/order-picking.ts'));
    const block = sourceBetween(
      source,
      'exportconstpickOrderItems=',
      '//============================================================================//UNPICKORDERITEMS'
    );

    expect(block).toContain(
      '.where(and(eq(orderLineItems.id,pickItem.lineItemId),eq(orderLineItems.orderId,data.orderId),eq(orderLineItems.organizationId,ctx.organizationId))).returning();'
    );
    expect(block).toContain("if(!updated){thrownewNotFoundError('Lineitemnotfound','orderLineItem');}");
    expect(block.indexOf("if(!updated){thrownewNotFoundError('Lineitemnotfound'")).toBeLessThan(
      block.indexOf('updatedLineItems.push(updated);')
    );
    expect(block.indexOf('updatedLineItems.push(updated);')).toBeLessThan(
      block.indexOf('returnwithFulfillmentInventoryMutationIdentity')
    );
  });

  it('keeps pick status writes active-row scoped and evidence-bearing', () => {
    const source = compact(read('src/server/functions/orders/order-picking.ts'));
    const block = sourceBetween(
      source,
      'exportconstpickOrderItems=',
      '//============================================================================//UNPICKORDERITEMS'
    );

    expect(block).toContain(
      '.where(and(eq(orderLineItems.orderId,data.orderId),eq(orderLineItems.organizationId,ctx.organizationId)))'
    );
    expect(block).toContain(
      '.where(and(eq(orders.id,data.orderId),eq(orders.organizationId,ctx.organizationId),isNull(orders.deletedAt))).returning({id:orders.id});'
    );
    expect(block).toContain("if(!updatedOrder){thrownewNotFoundError('Ordernotfound','order');}");
  });

  it('proves unpick line-item and status writes before recording fulfillment identity', () => {
    const source = compact(read('src/server/functions/orders/order-picking.ts'));
    const block = sourceFrom(source, 'exportconstunpickOrderItems=');

    expect(block).toContain(
      '.where(and(eq(orderLineItems.id,unpickItem.lineItemId),eq(orderLineItems.orderId,data.orderId),eq(orderLineItems.organizationId,ctx.organizationId))).returning();'
    );
    expect(block).toContain("if(!updated){thrownewNotFoundError('Lineitemnotfound','orderLineItem');}");
    expect(block.indexOf("if(!updated){thrownewNotFoundError('Lineitemnotfound'")).toBeLessThan(
      block.indexOf('updatedLineItems.push(updated);')
    );
    expect(block).toContain(
      '.where(and(eq(orderLineItems.orderId,data.orderId),eq(orderLineItems.organizationId,ctx.organizationId)))'
    );
    expect(block).toContain(
      '.where(and(eq(orders.id,data.orderId),eq(orders.organizationId,ctx.organizationId),isNull(orders.deletedAt))).returning({id:orders.id});'
    );
    expect(block).toContain("if(!updatedOrder){thrownewNotFoundError('Ordernotfound','order');}");
    expect(block.indexOf('updatedLineItems.push(updated);')).toBeLessThan(
      block.indexOf('returnwithFulfillmentInventoryMutationIdentity')
    );
  });
});

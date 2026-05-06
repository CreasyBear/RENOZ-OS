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

describe('order line-item write-scope contract', () => {
  it('keeps order aggregate version claims scoped to active orders', () => {
    const source = compact(read('src/server/functions/orders/_order-aggregate.ts'));
    const block = sourceFrom(source, 'exportasyncfunctionclaimOrderAggregateVersion');

    expect(source).toContain("import{and,eq,isNull,sql}from'drizzle-orm';");
    expect(block).toContain(
      'eq(orders.id,params.orderId),eq(orders.organizationId,params.organizationId),eq(orders.version,params.expectedVersion),isNull(orders.deletedAt)'
    );
  });

  it('proves line-item updates touch the requested order before recalculating totals', () => {
    const source = read('src/server/functions/orders/order-line-items.ts');
    const block = compact(
      sourceBetween(source, 'export const updateOrderLineItem', 'export const deleteOrderLineItem')
    );

    expect(block).toContain(
      '.where(and(eq(orderLineItems.id,itemId),eq(orderLineItems.orderId,orderId),eq(orderLineItems.organizationId,ctx.organizationId))).returning();'
    );
    expect(block).toContain("if(!updatedItem){thrownewNotFoundError('Lineitemnotfound','orderLineItem');}");
    expect(block.indexOf("if(!updatedItem){thrownewNotFoundError('Lineitemnotfound'")).toBeLessThan(
      block.indexOf('awaitrecalculateOrderTotals')
    );
  });

  it('proves line-item deletes target an existing requested row before recalculating totals', () => {
    const source = read('src/server/functions/orders/order-line-items.ts');
    const block = compact(sourceFrom(source, 'export const deleteOrderLineItem'));

    expect(block).toContain(
      'const[targetLineItem]=awaittx.select({id:orderLineItems.id}).from(orderLineItems).where(and(eq(orderLineItems.id,data.itemId),eq(orderLineItems.orderId,data.orderId),eq(orderLineItems.organizationId,ctx.organizationId))).limit(1);'
    );
    expect(block).toContain(
      "if(!targetLineItem){thrownewNotFoundError('Lineitemnotfound','orderLineItem');}"
    );
    expect(block.indexOf("if(!targetLineItem){thrownewNotFoundError('Lineitemnotfound'")).toBeLessThan(
      block.indexOf('const[countResult]')
    );
    expect(block).toContain(
      '.delete(orderLineItems).where(and(eq(orderLineItems.id,data.itemId),eq(orderLineItems.orderId,data.orderId),eq(orderLineItems.organizationId,ctx.organizationId))).returning({id:orderLineItems.id});'
    );
    expect(block).toContain(
      "if(!deletedLineItem){thrownewNotFoundError('Lineitemnotfound','orderLineItem');}"
    );
    expect(block.indexOf("if(!deletedLineItem){thrownewNotFoundError('Lineitemnotfound'")).toBeLessThan(
      block.indexOf('awaitrecalculateOrderTotals')
    );
  });
});

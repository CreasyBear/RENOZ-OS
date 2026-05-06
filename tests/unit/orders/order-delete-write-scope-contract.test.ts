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

function exportedFunctionBlock(source: string, functionName: string): string {
  const start = source.indexOf(`exportconst${functionName}=`);
  expect(start, `${functionName} export should exist`).toBeGreaterThanOrEqual(0);

  const nextExport = source.indexOf('exportconst', start + `exportconst${functionName}=`.length);
  return nextExport === -1 ? source.slice(start) : source.slice(start, nextExport);
}

describe('order delete write-scope contract', () => {
  it('keeps draft order soft-delete tenant-scoped, active-row scoped, and evidence-bearing', () => {
    const source = compact(read('src/server/functions/orders/order-write.ts'));
    const block = exportedFunctionBlock(source, 'deleteOrder');

    expect(block).toContain("set_config('app.organization_id'");
    expect(block).toContain(
      '.where(and(eq(orders.id,data.id),eq(orders.organizationId,ctx.organizationId),isNull(orders.deletedAt))).returning({id:orders.id});'
    );
    expect(block).toContain("if(!deletedOrder){thrownewNotFoundError('Ordernotfound','order');}");
    expect(block.indexOf("if(!deletedOrder){thrownewNotFoundError('Ordernotfound'")).toBeLessThan(
      block.indexOf('awaitenqueueSearchIndexOutbox')
    );
    expect(block).not.toContain(
      '.where(and(eq(orders.id,data.id),eq(orders.organizationId,ctx.organizationId)));'
    );
  });
});

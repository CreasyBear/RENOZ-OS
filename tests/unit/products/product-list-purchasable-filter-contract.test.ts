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

describe('product list purchasable filter contract', () => {
  it('threads purchasable product filtering from PO create page to products read model', () => {
    const schema = compact(read('src/lib/schemas/products/products.ts'));
    const hook = compact(read('src/hooks/products/use-products.ts'));
    const server = compact(read('src/server/functions/products/products.ts'));
    const page = compact(read('src/routes/_authenticated/purchase-orders/-create-page.tsx'));

    expect(schema).toContain('isPurchasable:z.coerce.boolean().optional()');
    expect(hook).toContain('isPurchasable?:boolean;');
    expect(server).toContain(
      'if(filters.isPurchasable!==undefined){conditions.push(eq(products.isPurchasable,filters.isPurchasable));}'
    );
    expect(page).toContain(
      'useProducts({page:1,pageSize:100,status:"active",isActive:true,isPurchasable:true,})'
    );
    expect(page).toContain(
      'selectedProductItem.status!=="active"||!selectedProductItem.isActive||!selectedProductItem.isPurchasable'
    );
  });
});

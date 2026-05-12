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

describe('product list inventory filter contract', () => {
  it('threads inventory-tracked product filtering from manual receiving to products read model', () => {
    const schema = compact(read('src/lib/schemas/products/products.ts'));
    const hook = compact(read('src/hooks/products/use-products.ts'));
    const server = compact(read('src/server/functions/products/products.ts'));
    const page = compact(read('src/routes/_authenticated/inventory/receiving-page.tsx'));

    expect(schema).toContain('trackInventory:z.coerce.boolean().optional()');
    expect(hook).toContain('trackInventory?:boolean;');
    expect(server).toContain(
      'if(filters.trackInventory!==undefined){conditions.push(eq(products.trackInventory,filters.trackInventory));}'
    );
    expect(page).toContain(
      'useProducts({search:productSearch,pageSize:50,status:"active",isActive:true,trackInventory:true,})'
    );
    expect(page).toContain(
      'selectedProduct.status!=="active"||selectedProduct.isActive!==true||selectedProduct.trackInventory!==true'
    );
  });
});

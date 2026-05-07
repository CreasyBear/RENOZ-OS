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

function sliceBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);

  return source.slice(startIndex, endIndex);
}

describe('product movement tenant-scope contract', () => {
  it('keeps movement history product and location joins inside the organization boundary', () => {
    const source = read('src/server/functions/products/product-inventory.ts');
    const compactSource = compact(source);
    const movementBlock = compact(
      sliceBetween(source, '// MOVEMENT HISTORY', '// LOW STOCK ALERTS')
    );

    expect(compactSource).toContain('functionmovementProductJoinCondition(organizationId:string)');
    expect(compactSource).toContain('functionmovementLocationJoinCondition(organizationId:string)');
    expect(compactSource).toContain(
      'eq(inventoryMovements.productId,products.id),eq(products.organizationId,organizationId),isNull(products.deletedAt)'
    );
    expect(compactSource).toContain(
      'eq(inventoryMovements.locationId,locations.id),eq(locations.organizationId,organizationId)'
    );
    expect(movementBlock).toContain(
      'innerJoin(products,movementProductJoinCondition(ctx.organizationId))'
    );
    expect(movementBlock).toContain(
      'innerJoin(locations,movementLocationJoinCondition(ctx.organizationId))'
    );
    expect(movementBlock).not.toContain(
      'innerJoin(products,eq(inventoryMovements.productId,products.id))'
    );
    expect(movementBlock).not.toContain(
      'innerJoin(locations,eq(inventoryMovements.locationId,locations.id))'
    );
  });
});

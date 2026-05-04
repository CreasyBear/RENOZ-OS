import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createLocationSchema,
  locationListCursorQuerySchema,
  locationListQuerySchema,
  updateLocationSchema,
} from '@/lib/schemas/inventory';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('inventory location schema ownership', () => {
  it('keeps location CRUD/list schemas owned by the location schema file', () => {
    const locationSchema = read('src/lib/schemas/inventory/locations.ts');
    const inventorySchema = read('src/lib/schemas/inventory/inventory.ts');

    expect(locationSchema).toContain('export const createLocationSchema');
    expect(locationSchema).toContain('export const updateLocationSchema');
    expect(locationSchema).toContain('export const locationListQuerySchema');
    expect(locationSchema).toContain('export const locationListCursorQuerySchema');
    expect(inventorySchema).not.toContain('export const createLocationSchema');
    expect(inventorySchema).not.toContain('export const updateLocationSchema');
    expect(inventorySchema).not.toContain('export const locationListQuerySchema');
    expect(inventorySchema).not.toContain('export const locationListCursorQuerySchema');
  });

  it('preserves the public inventory schema barrel for location callers', () => {
    expect(
      createLocationSchema.parse({
        code: 'MAIN',
        name: 'Main Warehouse',
      })
    ).toMatchObject({
      code: 'MAIN',
      name: 'Main Warehouse',
      isActive: true,
      isDefault: false,
      allowNegative: false,
    });
    expect(updateLocationSchema.parse({ name: 'Receiving Dock' })).toMatchObject({
      name: 'Receiving Dock',
      isActive: true,
      isDefault: false,
      allowNegative: false,
    });
    expect(locationListQuerySchema.parse(undefined)).toMatchObject({
      page: 1,
      pageSize: 20,
    });
    expect(locationListCursorQuerySchema.parse(undefined)).toMatchObject({
      pageSize: 20,
      sortOrder: 'desc',
    });
  });
});

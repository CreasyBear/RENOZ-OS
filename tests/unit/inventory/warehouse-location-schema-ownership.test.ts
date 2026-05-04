import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createWarehouseLocationSchema,
  locationTypeSchema,
  warehouseLocationListQuerySchema,
} from '@/lib/schemas/inventory';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('inventory warehouse location schema ownership', () => {
  it('keeps warehouse-location schemas owned by the warehouse location schema file', () => {
    const warehouseLocationSchema = read('src/lib/schemas/inventory/warehouse-locations.ts');
    const inventorySchema = read('src/lib/schemas/inventory/inventory.ts');

    expect(warehouseLocationSchema).toContain('export const locationTypeSchema');
    expect(warehouseLocationSchema).toContain('export const warehouseLocationListQuerySchema');
    expect(warehouseLocationSchema).toContain('export const createWarehouseLocationSchema');
    expect(inventorySchema).not.toContain('export const locationTypeSchema');
    expect(inventorySchema).not.toContain('export const warehouseLocationListQuerySchema');
    expect(inventorySchema).not.toContain('export const createWarehouseLocationSchema');
  });

  it('preserves the public inventory schema barrel for warehouse-location callers', () => {
    expect(locationTypeSchema.parse('rack')).toBe('rack');
    expect(
      warehouseLocationListQuerySchema.parse({
        isActive: false,
        locationType: 'bin',
      })
    ).toMatchObject({
      isActive: false,
      locationType: 'bin',
    });
    expect(
      createWarehouseLocationSchema.parse({
        locationCode: 'RACK-01',
        name: 'Rack 01',
        locationType: 'rack',
      })
    ).toMatchObject({
      locationCode: 'RACK-01',
      name: 'Rack 01',
      locationType: 'rack',
      isActive: true,
      isPickable: true,
      isReceivable: true,
    });
  });
});

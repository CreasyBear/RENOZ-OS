import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createForecastSchema,
  forecastListQuerySchema,
  forecastParamsSchema,
  updateForecastSchema,
} from '@/lib/schemas/inventory';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('inventory forecasting schema ownership', () => {
  it('keeps forecasting schemas owned by the forecasting schema file', () => {
    const forecastingSchema = read('src/lib/schemas/inventory/forecasting.ts');
    const inventorySchema = read('src/lib/schemas/inventory/inventory.ts');

    expect(forecastingSchema).toContain('export const createForecastSchema');
    expect(forecastingSchema).toContain('export const updateForecastSchema');
    expect(forecastingSchema).toContain('export const forecastListQuerySchema');
    expect(forecastingSchema).toContain('export interface ReorderRecommendation');
    expect(inventorySchema).not.toContain('export const createForecastSchema');
    expect(inventorySchema).not.toContain('export const updateForecastSchema');
    expect(inventorySchema).not.toContain('export const forecastListQuerySchema');
    expect(inventorySchema).not.toContain('export interface ReorderRecommendation');
  });

  it('preserves the public inventory schema barrel for forecasting callers', () => {
    expect(
      createForecastSchema.parse({
        productId: '00000000-0000-4000-8000-000000000001',
        forecastDate: '2026-01-01T00:00:00.000Z',
        forecastPeriod: 'weekly',
        demandQuantity: '12',
      })
    ).toMatchObject({
      productId: '00000000-0000-4000-8000-000000000001',
      forecastPeriod: 'weekly',
      demandQuantity: 12,
    });
    expect(updateForecastSchema.parse({ demandQuantity: '8' })).toMatchObject({
      demandQuantity: 8,
    });
    expect(forecastListQuerySchema.parse(undefined)).toMatchObject({
      page: 1,
      pageSize: 20,
    });
    expect(
      forecastParamsSchema.parse({
        id: '00000000-0000-4000-8000-000000000001',
      })
    ).toMatchObject({
      id: '00000000-0000-4000-8000-000000000001',
    });
  });
});

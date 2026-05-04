import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  alertListQuerySchema,
  alertParamsSchema,
  createAlertSchema,
  updateAlertSchema,
} from '@/lib/schemas/inventory';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('inventory alert schema ownership', () => {
  it('keeps alert rule schemas owned by the alert schema file', () => {
    const alertSchema = read('src/lib/schemas/inventory/alerts.ts');
    const inventorySchema = read('src/lib/schemas/inventory/inventory.ts');

    expect(alertSchema).toContain('export const createAlertSchema');
    expect(alertSchema).toContain('export const updateAlertSchema');
    expect(alertSchema).toContain('export const alertListQuerySchema');
    expect(alertSchema).toContain('export interface TriggeredAlertResult');
    expect(alertSchema).toContain('export interface InventoryAlert');
    expect(inventorySchema).not.toContain('export const createAlertSchema');
    expect(inventorySchema).not.toContain('export const updateAlertSchema');
    expect(inventorySchema).not.toContain('export const alertListQuerySchema');
    expect(inventorySchema).not.toContain('export interface TriggeredAlertResult');
    expect(inventorySchema).not.toContain('export interface InventoryAlert');
  });

  it('preserves the public inventory schema barrel for alert callers', () => {
    expect(
      createAlertSchema.parse({
        alertType: 'low_stock',
        threshold: { minQuantity: 5 },
      })
    ).toMatchObject({
      alertType: 'low_stock',
      threshold: { minQuantity: 5 },
      isActive: true,
      notificationChannels: [],
      escalationUsers: [],
    });
    expect(updateAlertSchema.parse({ isActive: false })).toMatchObject({
      isActive: false,
    });
    expect(alertListQuerySchema.parse(undefined)).toMatchObject({
      page: 1,
      pageSize: 20,
    });
    expect(
      alertParamsSchema.parse({
        id: '00000000-0000-4000-8000-000000000001',
      })
    ).toMatchObject({
      id: '00000000-0000-4000-8000-000000000001',
    });
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createMovementSchema,
  isValidMovementType,
  movementTypeValues,
  stockAdjustmentSchema,
  stockTransferSchema,
} from '@/lib/schemas/inventory';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('inventory movement schema ownership', () => {
  it('keeps movement schemas owned by the movement schema file', () => {
    const movementSchema = read('src/lib/schemas/inventory/movements.ts');
    const inventorySchema = read('src/lib/schemas/inventory/inventory.ts');

    expect(movementSchema).toContain('export const movementTypeValues');
    expect(movementSchema).toContain('export const createMovementSchema');
    expect(movementSchema).toContain('export const stockAdjustmentSchema');
    expect(movementSchema).toContain('export const stockTransferSchema');
    expect(movementSchema).toContain('export interface MovementWithRelations');
    expect(movementSchema).toContain('export interface ListMovementsResult');
    expect(movementSchema).toContain('export interface MovementTypeCount');
    expect(movementSchema).toContain('export interface ProductMovementAggregation');
    expect(movementSchema).toContain('export interface DateGroupAggregation');
    expect(movementSchema).toContain('export interface MovementRecord');
    expect(movementSchema).toContain('export interface InventoryAdjustment');
    expect(movementSchema).toContain('export interface InventoryTransfer');
    expect(inventorySchema).not.toContain('export const movementTypeValues');
    expect(inventorySchema).not.toContain('export const createMovementSchema');
    expect(inventorySchema).not.toContain('export const stockAdjustmentSchema');
    expect(inventorySchema).not.toContain('export const stockTransferSchema');
    expect(inventorySchema).not.toContain('export interface MovementWithRelations');
    expect(inventorySchema).not.toContain('export interface ListMovementsResult');
    expect(inventorySchema).not.toContain('export interface MovementTypeCount');
    expect(inventorySchema).not.toContain('export interface ProductMovementAggregation');
    expect(inventorySchema).not.toContain('export interface DateGroupAggregation');
    expect(inventorySchema).not.toContain('export interface MovementRecord');
    expect(inventorySchema).not.toContain('export interface InventoryAdjustment');
    expect(inventorySchema).not.toContain('export interface InventoryTransfer');
  });

  it('preserves the public inventory schema barrel for movement callers', () => {
    expect(movementTypeValues).toContain('receive');
    expect(isValidMovementType('adjust')).toBe(true);
    expect(isValidMovementType('unknown')).toBe(false);
    expect(
      createMovementSchema.parse({
        productId: '11111111-1111-4111-8111-111111111111',
        locationId: '22222222-2222-4222-8222-222222222222',
        movementType: 'receive',
        quantity: 1,
      })
    ).toMatchObject({
      movementType: 'receive',
      metadata: {},
    });
    expect(
      stockAdjustmentSchema.parse({
        productId: '11111111-1111-4111-8111-111111111111',
        locationId: '22222222-2222-4222-8222-222222222222',
        adjustmentQty: -1,
        reason: 'Cycle count variance',
      })
    ).toMatchObject({ adjustmentQty: -1 });
    expect(
      stockTransferSchema.parse({
        inventoryId: '44444444-4444-4444-8444-444444444444',
        productId: '11111111-1111-4111-8111-111111111111',
        fromLocationId: '22222222-2222-4222-8222-222222222222',
        toLocationId: '33333333-3333-4333-8333-333333333333',
        quantity: 1,
        reason: 'Move to dispatch shelf',
      })
    ).toMatchObject({ quantity: 1 });
  });

  it('requires transfer reasons for warehouse movement evidence', () => {
    expect(() =>
      stockTransferSchema.parse({
        productId: '11111111-1111-4111-8111-111111111111',
        fromLocationId: '22222222-2222-4222-8222-222222222222',
        toLocationId: '33333333-3333-4333-8333-333333333333',
        quantity: 1,
        reason: '   ',
      })
    ).toThrow('Transfer reason is required');
  });

  it('requires transfer source scope to avoid ambiguous product-location movement', () => {
    expect(() =>
      stockTransferSchema.parse({
        productId: '11111111-1111-4111-8111-111111111111',
        fromLocationId: '22222222-2222-4222-8222-222222222222',
        toLocationId: '33333333-3333-4333-8333-333333333333',
        quantity: 1,
        reason: 'Move to dispatch shelf',
      })
    ).toThrow('Select a source inventory row or serial number');

    expect(
      stockTransferSchema.parse({
        productId: '11111111-1111-4111-8111-111111111111',
        fromLocationId: '22222222-2222-4222-8222-222222222222',
        toLocationId: '33333333-3333-4333-8333-333333333333',
        quantity: 1,
        serialNumbers: ['SN-001'],
        reason: 'Move serialized unit to support shelf',
      })
    ).toMatchObject({ serialNumbers: ['SN-001'] });
  });
});

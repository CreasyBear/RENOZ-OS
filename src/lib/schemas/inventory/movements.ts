import { z } from 'zod';
import {
  currencySchema,
  filterSchema,
  normalizeObjectInput,
  paginationSchema,
  quantitySchema,
} from '../_shared/patterns';
import type { FlexibleJson } from '../_shared/patterns';

export const movementTypeValues = [
  'receive',
  'allocate',
  'deallocate',
  'pick',
  'ship',
  'adjust',
  'return',
  'transfer',
] as const;

export const movementTypeSchema = z.enum(movementTypeValues);
export type MovementType = z.infer<typeof movementTypeSchema>;

export function isValidMovementType(value: unknown): value is MovementType {
  return typeof value === 'string' && movementTypeValues.includes(value as MovementType);
}

export const movementMetadataSchema = z
  .object({
    reference: z.string().max(255).optional(),
    orderId: z.string().uuid().optional(),
    purchaseOrderId: z.string().uuid().optional(),
    reason: z.string().max(500).optional(),
  })
  .passthrough();

// FlexibleJson for ServerFn boundary per SCHEMA-TRACE §4
export type MovementMetadata = FlexibleJson | null;

export const createMovementSchema = z.object({
  inventoryId: z.string().uuid().optional(),
  productId: z.string().uuid('Product is required'),
  locationId: z.string().uuid('Location is required'),
  movementType: movementTypeSchema,
  quantity: z.number(), // Can be negative
  unitCost: currencySchema.optional(),
  referenceType: z.string().max(50).optional(),
  referenceId: z.string().uuid().optional(),
  metadata: movementMetadataSchema.default({}),
  notes: z.string().max(500).optional(),
});

export type CreateMovement = z.infer<typeof createMovementSchema>;

export const movementSchema = createMovementSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  inventoryId: z.string().uuid(),
  previousQuantity: quantitySchema,
  newQuantity: quantitySchema,
  totalCost: currencySchema,
  createdAt: z.coerce.date(),
  createdBy: z.string().uuid().nullable(),
});

export type Movement = z.infer<typeof movementSchema>;

export const movementFilterSchema = filterSchema.extend({
  inventoryId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  movementType: movementTypeSchema.optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
});

export type MovementFilter = z.infer<typeof movementFilterSchema>;

export const movementListQuerySchema = normalizeObjectInput(
  paginationSchema.merge(movementFilterSchema)
);

export type MovementListQuery = z.infer<typeof movementListQuerySchema>;

export interface MovementWithRelations {
  id: string;
  organizationId: string;
  inventoryId: string;
  productId: string;
  locationId: string;
  movementType: string;
  quantity: number;
  previousQuantity: number | null;
  newQuantity: number | null;
  unitCost: number | null;
  totalCost: number | null;
  referenceType: string | null;
  referenceId: string | null;
  referenceNumber?: string | null;
  performedByName?: string | null;
  metadata: FlexibleJson | null;
  notes: string | null;
  createdAt: Date;
  createdBy: string | null;
  productName: string | null;
  productSku: string | null;
  locationName: string | null;
  locationCode: string | null;
}

export interface ListMovementsResult {
  movements: MovementWithRelations[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  summary: {
    totalInbound: number;
    totalOutbound: number;
    netChange: number;
  };
}

export interface MovementTypeCount {
  count: number;
  units: number;
  value: number;
}

export interface ProductMovementAggregation {
  productId: string;
  productName: string;
  productSku: string;
  unitsIn: number;
  unitsOut: number;
  count: number;
}

export interface DateGroupAggregation {
  unitsIn: number;
  unitsOut: number;
  count: number;
}

export interface MovementRecord {
  id: string;
  inventoryId: string;
  movementType: 'receive' | 'issue' | 'transfer' | 'adjustment' | 'return';
  quantity: number;
  unitCost: number;
  previousQuantity: number;
  newQuantity: number;
  referenceType?: string;
  referenceId?: string;
  reason?: string;
  notes?: string;
  performedBy: string;
  createdAt: Date;
}

/**
 * Inventory adjustment input for hook-facing callers.
 */
export interface InventoryAdjustment {
  inventoryId: string;
  adjustmentType: 'increase' | 'decrease';
  quantity: number;
  reason: string;
  notes?: string;
}

/**
 * Inventory transfer input for hook-facing callers.
 */
export interface InventoryTransfer {
  fromInventoryId: string;
  toInventoryId: string;
  quantity: number;
  reason: string;
  notes?: string;
}

export const stockAdjustmentSchema = z.object({
  inventoryId: z.string().uuid().optional(),
  productId: z.string().uuid(),
  locationId: z.string().uuid(),
  adjustmentQty: z.number(), // Positive or negative
  reason: z.string().min(1, 'Reason is required').max(500),
  notes: z.string().max(500).optional(),
});

export type StockAdjustment = z.infer<typeof stockAdjustmentSchema>;

export const stockTransferSchema = z.object({
  inventoryId: z.string().uuid().optional(),
  productId: z.string().uuid(),
  fromLocationId: z.string().uuid(),
  toLocationId: z.string().uuid(),
  quantity: quantitySchema,
  serialNumbers: z.array(z.string().min(1)).optional(),
  reason: z.string().trim().min(1, 'Transfer reason is required').max(500),
  notes: z.string().max(500).optional(),
}).superRefine((data, ctx) => {
  if (data.inventoryId || (data.serialNumbers?.length ?? 0) > 0) {
    return;
  }

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: ['inventoryId'],
    message: 'Select a source inventory row or serial number',
  });
});

export type StockTransfer = z.infer<typeof stockTransferSchema>;

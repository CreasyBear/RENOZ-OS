/**
 * Picking Validation Schemas
 *
 * Zod schemas for order picking operations.
 *
 * @see drizzle/schema/orders/orders.ts for database schema
 */

import { z } from 'zod';

// ============================================================================
// PICK LINE ITEM SCHEMA
// ============================================================================

export const pickLineItemSchema = z.object({
  lineItemId: z.string().uuid('Valid line item ID is required'),
  qtyPicked: z.coerce.number().int().min(1, 'Must pick at least 1'),
  serialNumbers: z.array(z.string().trim().min(1)).optional(),
});

export type PickLineItem = z.infer<typeof pickLineItemSchema>;

// ============================================================================
// PICK ORDER ITEMS SCHEMA
// ============================================================================

export const pickOrderItemsSchema = z.object({
  orderId: z.string().uuid('Valid order ID is required'),
  items: z
    .array(pickLineItemSchema)
    .min(1, 'At least one item is required'),
});

export type PickOrderItems = z.infer<typeof pickOrderItemsSchema>;

// ============================================================================
// UNPICK LINE ITEM SCHEMA
// ============================================================================

export const unpickLineItemSchema = z.object({
  lineItemId: z.string().uuid('Valid line item ID is required'),
  qtyToUnpick: z.coerce.number().int().min(1, 'Must unpick at least 1'),
  serialNumbersToRelease: z.array(z.string().trim().min(1)).optional(),
});

export type UnpickLineItem = z.infer<typeof unpickLineItemSchema>;

// ============================================================================
// UNPICK ORDER ITEMS SCHEMA
// ============================================================================

export const unpickOrderItemsSchema = z.object({
  orderId: z.string().uuid('Valid order ID is required'),
  items: z
    .array(unpickLineItemSchema)
    .min(1, 'At least one item is required'),
});

export type UnpickOrderItems = z.infer<typeof unpickOrderItemsSchema>;

// ============================================================================
// PICK ITEMS DIALOG VIEW TYPES (SCHEMA-TRACE: types in schemas, not components)
// ============================================================================

/** Line item shape from order query used by PickItemsDialog */
export interface PickItemsLineInput {
  id: string;
  productId: string | null;
  product: { name: string; sku: string | null; isSerialized?: boolean | null } | null;
  description: string;
  sku: string | null;
  quantity: number;
  qtyPicked: number | null;
  qtyShipped?: number | null;
  allocatedSerialNumbers?: string[] | null;
}

/** Form state per line in PickItemsDialog */
export interface PickLineState {
  lineItemId: string;
  productId: string | null;
  productName: string;
  sku: string | null;
  isSerialized: boolean;
  ordered: number;
  alreadyPicked: number;
  alreadyShipped: number;
  maxUnpickable: number;
  remaining: number;
  pickQty: number;
  selectedSerials: string[];
  unpickQty: number;
  selectedSerialsToRelease: string[];
  allocatedSerials: string[];
}

/** Props for PickSerialSelector (inline serial picker in PickItemsDialog) */
export interface PickSerialSelectorProps {
  productId: string;
  locationId?: string;
  selectedSerials: string[];
  onChange: (serials: string[]) => void;
  maxSelections: number;
  disabled?: boolean;
}

/** Raw line item shape from getOrderWithCustomer — used at boundary (SCHEMA-TRACE §8) */
export interface RawOrderLineItemForPick {
  id: string;
  productId?: string | null;
  product?: { name?: string; sku?: string | null; isSerialized?: boolean | null } | null;
  description?: string;
  sku?: string | null;
  quantity?: number;
  qtyPicked?: number | null;
  qtyShipped?: number | null;
  allocatedSerialNumbers?: string[] | null;
}

/**
 * Normalize raw order line items to PickLineState at component boundary.
 * Replaces type assertion with explicit transformation per SCHEMA-TRACE.
 */
export function normalizeOrderLineItemsToPickLines(
  raw: RawOrderLineItemForPick[]
): PickLineState[] {
  return raw.map((item) => {
    const ordered = Number(item.quantity);
    const alreadyPicked = Number(item.qtyPicked) || 0;
    const alreadyShipped = Number(item.qtyShipped) || 0;
    const maxUnpickable = Math.max(0, alreadyPicked - alreadyShipped);
    const remaining = ordered - alreadyPicked;
    const isSerialized = item.product?.isSerialized ?? false;
    const productId = item.productId ?? null;
    const canPick = remaining > 0 && (!isSerialized || productId != null);
    const allocatedSerials = item.allocatedSerialNumbers ?? [];
    return {
      lineItemId: item.id,
      productId,
      productName: item.product?.name ?? item.description ?? '',
      sku: item.sku ?? item.product?.sku ?? null,
      isSerialized,
      ordered,
      alreadyPicked,
      alreadyShipped,
      maxUnpickable,
      remaining,
      pickQty: canPick ? remaining : 0,
      selectedSerials: [],
      unpickQty: 0,
      selectedSerialsToRelease: [],
      allocatedSerials,
    };
  });
}

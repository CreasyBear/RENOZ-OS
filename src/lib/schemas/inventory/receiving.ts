/**
 * Manual receiving workflow validation helpers.
 *
 * Shared by the receiving UI and receiveInventory server function so serialized
 * stock-in rules stay aligned without coupling either layer to the other.
 */

import { z } from 'zod';

export const manualReceiptReasonValues = [
  'initial_stock',
  'found_stock',
  'sample_or_promo',
  'non_supplier_inbound',
  'other_exception',
] as const;

export const manualReceiptReasonSchema = z.enum(manualReceiptReasonValues);
export type ManualReceiptReason = z.infer<typeof manualReceiptReasonSchema>;

export const manualReceiveSerializationMessages = {
  serializedQuantity: 'Serialized products must be received one unit per serial.',
  serializedSerialRequired: 'Serial number is required for serialized products.',
  nonSerializedSerial: 'Serial number is only allowed for serialized products.',
} as const;

export type ManualReceiveSerializationIssueCode =
  | 'serialized_quantity'
  | 'serialized_serial_required'
  | 'non_serialized_serial';

export interface ManualReceiveSerializationIssue {
  path: 'quantity' | 'serialNumber';
  code: ManualReceiveSerializationIssueCode;
  message: string;
}

export interface ManualReceiveSerializationInput {
  isSerialized: boolean;
  quantity: number;
  serialNumber?: string | null;
}

/**
 * Inventory receiving input for hook-facing callers.
 */
export interface InventoryReceiving {
  inventoryId: string;
  quantity: number;
  unitCost?: number;
  reference?: string;
  notes?: string;
}

/**
 * Live manual stock-in mutation input for receiveInventory.
 */
export const receiveInventorySchema = z.object({
  productId: z.string().uuid(),
  locationId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitCost: z.number().min(0),
  receiptReason: manualReceiptReasonSchema,
  serialNumber: z.string().optional(),
  batchNumber: z.string().optional(),
  lotNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
}).superRefine((data, ctx) => {
  if (data.receiptReason === 'other_exception' && !data.notes?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['notes'],
      message: 'Notes are required when using Other Exception.',
    });
  }
});

export type ReceiveInventoryInput = z.infer<typeof receiveInventorySchema>;

/**
 * Product-domain receiveStock wrapper input.
 *
 * This wrapper delegates to receiveInventory and keeps its legacy optional unitCost
 * surface while the canonical receiveInventory schema enforces final stock-in rules.
 */
export const receiveStockSchema = z.object({
  productId: z.string().uuid(),
  locationId: z.string().uuid(),
  quantity: z.number().positive('Quantity must be positive'),
  unitCost: z.number().min(0).optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export type ReceiveStockInput = z.infer<typeof receiveStockSchema>;

export function getManualReceiveSerializationIssues({
  isSerialized,
  quantity,
  serialNumber,
}: ManualReceiveSerializationInput): ManualReceiveSerializationIssue[] {
  const hasSerialNumber = !!serialNumber?.trim();
  const issues: ManualReceiveSerializationIssue[] = [];

  if (isSerialized) {
    if (quantity !== 1) {
      issues.push({
        path: 'quantity',
        code: 'serialized_quantity',
        message: manualReceiveSerializationMessages.serializedQuantity,
      });
    }
    if (!hasSerialNumber) {
      issues.push({
        path: 'serialNumber',
        code: 'serialized_serial_required',
        message: manualReceiveSerializationMessages.serializedSerialRequired,
      });
    }
    return issues;
  }

  if (hasSerialNumber) {
    issues.push({
      path: 'serialNumber',
      code: 'non_serialized_serial',
      message: manualReceiveSerializationMessages.nonSerializedSerial,
    });
  }

  return issues;
}

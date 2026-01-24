/**
 * Goods Receipt Schemas
 *
 * Zod schemas for goods receipt UI components.
 * Based on purchaseOrderReceipts and purchaseOrderReceiptItems tables.
 *
 * @see drizzle/schema/suppliers/purchase-order-receipts.ts
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Receipt status matches receiptStatusEnum in database
 */
export const receiptStatuses = [
  'pending_inspection',
  'accepted',
  'partially_accepted',
  'rejected',
] as const;

export type ReceiptStatus = (typeof receiptStatuses)[number];

/**
 * Item condition enum
 */
export const itemConditions = ['new', 'refurbished', 'used', 'damaged'] as const;

export type ItemCondition = (typeof itemConditions)[number];

/**
 * Receipt rejection reason enum (for goods receiving)
 */
export const receiptRejectionReasons = [
  'damaged',
  'wrong_item',
  'quality_issue',
  'short_shipment',
  'other',
] as const;

export type ReceiptRejectionReason = (typeof receiptRejectionReasons)[number];

// ============================================================================
// STATUS LABELS
// ============================================================================

export const receiptStatusLabels: Record<ReceiptStatus, string> = {
  pending_inspection: 'Pending Inspection',
  accepted: 'Accepted',
  partially_accepted: 'Partially Accepted',
  rejected: 'Rejected',
};

export const conditionLabels: Record<ItemCondition, string> = {
  new: 'New',
  refurbished: 'Refurbished',
  used: 'Used',
  damaged: 'Damaged',
};

export const receiptRejectionReasonLabels: Record<ReceiptRejectionReason, string> = {
  damaged: 'Damaged in Transit',
  wrong_item: 'Wrong Item Received',
  quality_issue: 'Quality Does Not Meet Standards',
  short_shipment: 'Short Shipment',
  other: 'Other',
};

// ============================================================================
// RECEIPT SCHEMAS
// ============================================================================

/**
 * Receipt item for display in UI
 */
export const receiptItemSchema = z.object({
  id: z.string(),
  receiptId: z.string(),
  purchaseOrderItemId: z.string(),
  lineNumber: z.number(),

  // Product info from PO item
  productName: z.string(),
  productSku: z.string().optional(),
  unit: z.string().optional(),

  // Quantities
  quantityExpected: z.number(),
  quantityReceived: z.number(),
  quantityAccepted: z.number(),
  quantityRejected: z.number(),

  // Quality
  condition: z.enum(itemConditions).optional(),
  rejectionReason: z.enum(receiptRejectionReasons).optional(),
  qualityNotes: z.string().optional(),

  // Storage
  warehouseLocation: z.string().optional(),
  binNumber: z.string().optional(),
  lotNumber: z.string().optional(),
});

export type ReceiptItem = z.infer<typeof receiptItemSchema>;

/**
 * Receipt header for display
 */
export const receiptSchema = z.object({
  id: z.string(),
  purchaseOrderId: z.string(),
  receiptNumber: z.string(),

  // Who received
  receivedBy: z.string(),
  receivedByName: z.string().optional(),
  receivedAt: z.string(), // ISO date

  // Shipping details
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
  deliveryReference: z.string().optional(),

  // Totals
  totalItemsExpected: z.number(),
  totalItemsReceived: z.number(),
  totalItemsAccepted: z.number(),
  totalItemsRejected: z.number(),

  // Status
  status: z.enum(receiptStatuses),

  // Quality control
  inspectionRequired: z.string().optional(),
  inspectionCompletedAt: z.string().optional(),
  inspectionCompletedBy: z.string().optional(),
  inspectionCompletedByName: z.string().optional(),
  qualityNotes: z.string().optional(),

  notes: z.string().optional(),

  // Items
  items: z.array(receiptItemSchema).optional(),
});

export type Receipt = z.infer<typeof receiptSchema>;

// ============================================================================
// FORM SCHEMAS
// ============================================================================

/**
 * Schema for creating a receipt item
 */
export const createReceiptItemSchema = z.object({
  purchaseOrderItemId: z.string(),
  lineNumber: z.number(),
  quantityExpected: z.number().min(0),
  quantityReceived: z.number().min(0),
  quantityAccepted: z.number().min(0),
  quantityRejected: z.number().min(0),
  condition: z.enum(itemConditions).optional(),
  rejectionReason: z.enum(receiptRejectionReasons).optional(),
  qualityNotes: z.string().optional(),
  warehouseLocation: z.string().optional(),
  binNumber: z.string().optional(),
  lotNumber: z.string().optional(),
});

export type CreateReceiptItemInput = z.infer<typeof createReceiptItemSchema>;

/**
 * Schema for creating a goods receipt
 */
export const createReceiptSchema = z.object({
  purchaseOrderId: z.string(),
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
  deliveryReference: z.string().optional(),
  notes: z.string().optional(),
  inspectionRequired: z.enum(['yes', 'no', 'partial']).optional(),
  items: z.array(createReceiptItemSchema),
});

export type CreateReceiptInput = z.infer<typeof createReceiptSchema>;

/**
 * Schema for completing inspection
 */
export const completeInspectionSchema = z.object({
  receiptId: z.string(),
  status: z.enum(['accepted', 'partially_accepted', 'rejected']),
  qualityNotes: z.string().optional(),
  itemUpdates: z.array(
    z.object({
      id: z.string(),
      quantityAccepted: z.number().min(0),
      quantityRejected: z.number().min(0),
      condition: z.enum(itemConditions).optional(),
      rejectionReason: z.enum(receiptRejectionReasons).optional(),
      qualityNotes: z.string().optional(),
    })
  ),
});

export type CompleteInspectionInput = z.infer<typeof completeInspectionSchema>;

// ============================================================================
// UI TYPES
// ============================================================================

/**
 * PO Item with receiving state for ReceiptCreationDialog
 */
export interface POItemForReceipt {
  id: string;
  productName: string;
  productSku?: string;
  unit?: string;
  quantityOrdered: number;
  quantityAlreadyReceived: number;
  quantityPending: number;
}

/**
 * Props for receipt creation dialog
 */
export interface ReceiptCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrderId: string;
  poNumber: string;
  supplierName: string | null;
  items: POItemForReceipt[];
  onSuccess?: () => void;
}

/**
 * Receipt list item for history display
 */
export interface ReceiptHistoryItem {
  id: string;
  receiptNumber: string;
  receivedAt: string;
  receivedByName: string;
  status: ReceiptStatus;
  totalItemsReceived: number;
  totalItemsAccepted: number;
  totalItemsRejected: number;
  carrier?: string;
  trackingNumber?: string;
}

/**
 * Props for receipt history component
 */
export interface ReceiptHistoryProps {
  receipts: ReceiptHistoryItem[];
  isLoading?: boolean;
}

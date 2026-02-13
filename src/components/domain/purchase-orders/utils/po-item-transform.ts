/**
 * Purchase Order Item Transformation Utilities
 *
 * Shared utilities for transforming PO item data between different formats.
 * Follows DRY principle - single source of truth for transformations.
 *
 * @see STANDARDS.md - DRY principle
 */

import type { PurchaseOrderItem } from '@/lib/schemas/purchase-orders';

/**
 * Server PO item response type (from getPurchaseOrder)
 */
export interface ServerPOItem {
  id: string;
  lineNumber: number;
  productId: string | null;
  productName: string;
  productSku: string | null;
  description: string | null;
  quantity: number;
  unitOfMeasure: string | null;
  unitPrice: number | null;
  discountPercent: number | null;
  taxRate: number | null;
  lineTotal: number | null;
  quantityReceived: number;
  quantityRejected: number;
  expectedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  notes: string | null;
}

/**
 * Transform server PO item response to PurchaseOrderItem format for UI components.
 * Calculates quantityPending from quantity, quantityReceived, and quantityRejected.
 *
 * @param items - Server PO items from getPurchaseOrder
 * @returns Transformed items with calculated quantityPending
 */
export function transformPOItemsToReceiptItems(items: ServerPOItem[]): PurchaseOrderItem[] {
  if (!items || items.length === 0) return [];

  return items.map((item) => {
    const quantityReceived = item.quantityReceived ?? 0;
    const quantityRejected = item.quantityRejected ?? 0;
    const quantityPending = Math.max(0, item.quantity - quantityReceived - quantityRejected);

    return {
      id: item.id,
      lineNumber: item.lineNumber,
      productId: item.productId,
      productName: item.productName,
      productSku: item.productSku,
      description: item.description,
      quantity: item.quantity,
      unitOfMeasure: item.unitOfMeasure,
      unitPrice: Number(item.unitPrice) || 0,
      discountPercent: item.discountPercent,
      taxRate: item.taxRate,
      lineTotal: Number(item.lineTotal) || 0,
      quantityReceived,
      quantityRejected,
      quantityPending,
      expectedDeliveryDate: item.expectedDeliveryDate,
      actualDeliveryDate: item.actualDeliveryDate,
      notes: item.notes,
    };
  });
}

/**
 * Filter items to only those with pending quantities > 0.
 * Used to determine if receiving is possible.
 *
 * @param items - PurchaseOrderItem array
 * @returns Items with quantityPending > 0
 */
export function filterItemsWithPendingQuantity(items: PurchaseOrderItem[]): PurchaseOrderItem[] {
  return items.filter((item) => item.quantityPending > 0);
}

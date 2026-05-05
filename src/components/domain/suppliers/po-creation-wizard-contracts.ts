import { GST_RATE, roundCurrency } from "@/lib/order-calculations";

export interface SupplierItem {
  id: string;
  supplierCode: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: "active" | "suspended" | "inactive" | "blacklisted";
  supplierType: "service" | "manufacturer" | "distributor" | "retailer" | "raw_materials" | null;
  primaryContactName: string | null;
  overallRating: number | null;
  leadTimeDays: number | null;
  lastOrderDate: Date | null;
  totalPurchaseOrders: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductItem {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  basePrice: number | null;
  costPrice: number | null;
  status: string;
  isActive: boolean;
  [key: string]: unknown;
}

export interface PurchaseOrderFormData {
  supplierId: string;
  expectedDeliveryDate?: string;
  paymentTerms?: string;
  notes?: string;
  internalNotes?: string;
  items: PurchaseOrderItemFormData[];
}

export interface PurchaseOrderItemFormData {
  productId?: string;
  productName: string;
  productSku?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface PurchaseOrderReviewTotals {
  subtotal: number;
  taxAmount: number;
  total: number;
}

export const CUSTOM_PURCHASE_ORDER_ITEM_NAME = "Custom Item";

export const PURCHASE_ORDER_REVIEW_GST_RATE = GST_RATE;

export function createPurchaseOrderLineItemKey(
  keyPrefix: string,
  sequence: number
): string {
  return `${keyPrefix}-line-${sequence}`;
}

export function buildInitialPurchaseOrderLineItemKeys({
  keyPrefix,
  itemCount,
}: {
  keyPrefix: string;
  itemCount: number;
}): string[] {
  return Array.from({ length: itemCount }, (_, index) =>
    createPurchaseOrderLineItemKey(keyPrefix, index)
  );
}

function getFiniteCurrencyValue(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function getPurchaseOrderProductUnitPrice(
  product: Pick<ProductItem, "costPrice" | "basePrice">
): number {
  return (
    getFiniteCurrencyValue(product.costPrice) ??
    getFiniteCurrencyValue(product.basePrice) ??
    0
  );
}

export function createBlankPurchaseOrderItem(): PurchaseOrderItemFormData {
  return {
    productName: "",
    quantity: 1,
    unitPrice: 0,
  };
}

export function createCustomPurchaseOrderItem(
  item: PurchaseOrderItemFormData
): PurchaseOrderItemFormData {
  return {
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    notes: item.notes,
    productName: CUSTOM_PURCHASE_ORDER_ITEM_NAME,
  };
}

export function isCustomPurchaseOrderItem(
  item: PurchaseOrderItemFormData
): boolean {
  return !item.productId;
}

export function parsePurchaseOrderQuantityInput(value: string): number {
  const quantity = Number(value);
  return Number.isFinite(quantity) ? quantity : 0;
}

export function parsePurchaseOrderUnitPriceInput(value: string): number {
  const unitPrice = Number(value);
  return Number.isFinite(unitPrice) ? unitPrice : 0;
}

export function buildInitialPurchaseOrderFormData({
  initialSupplierId,
  initialItems,
}: {
  initialSupplierId?: string | null;
  initialItems: PurchaseOrderItemFormData[];
}): PurchaseOrderFormData {
  return {
    supplierId: initialSupplierId ?? "",
    items: initialItems.map((item) => ({ ...item })),
  };
}

export function getPurchaseOrderWizardStartingStep({
  initialSupplierId,
  initialStep,
}: {
  initialSupplierId?: string | null;
  initialStep: 1 | 2;
}): 1 | 2 {
  return initialSupplierId?.trim() && initialStep === 2 ? 2 : 1;
}

export function getSupplierSelectionValidationError(
  supplierId: string | null | undefined
): string | null {
  return supplierId?.trim() ? null : "Please select a supplier";
}

export function getLineItemValidationError(items: PurchaseOrderItemFormData[]): string | null {
  if (items.length === 0) return "Please add at least one item";

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const row = i + 1;

    if (!item.productName?.trim()) {
      return `Line item #${row} is missing a product name`;
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      return `Line item #${row} must have a quantity greater than 0`;
    }
    if (!Number.isInteger(item.quantity)) {
      return `Line item #${row} must have a whole number quantity`;
    }
    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      return `Line item #${row} has an invalid unit price`;
    }
  }

  return null;
}

export function getPurchaseOrderSubmissionValidationError(
  formData: PurchaseOrderFormData
): string | null {
  return (
    getSupplierSelectionValidationError(formData.supplierId) ??
    getLineItemValidationError(formData.items)
  );
}

export function calculatePurchaseOrderReviewTotals(
  items: PurchaseOrderItemFormData[]
): PurchaseOrderReviewTotals {
  const subtotal = roundCurrency(
    items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  );
  const taxAmount = roundCurrency(subtotal * PURCHASE_ORDER_REVIEW_GST_RATE);
  const total = roundCurrency(subtotal + taxAmount);

  return { subtotal, taxAmount, total };
}

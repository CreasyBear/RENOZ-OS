/**
 * Document Data Builders
 *
 * Shared builders for transforming order/customer data into document-ready shapes.
 * Used by preview, generate-documents-sync, generate-quote-pdf, and quote-versions.
 *
 * @see docs/DOCUMENT_DESIGN_SYSTEM.md
 */

import type { DocumentOrder, DocumentCustomer, DocumentAddress, DocumentLineItem } from "./types";

// ============================================================================
// TYPES - Input shapes from DB fetches
// ============================================================================

export interface OrderDataFromDb {
  id: string;
  orderNumber: string;
  orderDate: Date | string | null;
  dueDate: Date | string | null;
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  taxAmount: number;
  total: number;
  customerNotes: string | null;
  internalNotes: string | null;
  paymentStatus?: string | null;
  lineItems: Array<{
    id: string;
    lineNumber: string;
    sku: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    discountAmount: number;
    taxAmount: number;
    lineTotal: number;
    notes: string | null;
  }>;
}

export interface CustomerDataFromDb {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address?: {
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string | null;
    postalCode: string;
    country: string;
  };
}

// ============================================================================
// TYPES - Preview document data shape
// ============================================================================

export interface PreviewDocumentData {
  organization: Record<string, unknown>;
  customer: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    postcode?: string;
    country?: string;
  };
  order: {
    orderNumber: string;
    createdAt: string;
    dueDate?: string;
    validUntil: string;
    lineItems: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
      sku?: string;
    }>;
    subtotal: number;
    taxRate?: number;
    taxAmount: number;
    discount?: number;
    total: number;
    notes?: string;
    terms?: string;
  };
}

// ============================================================================
// BUILDERS
// ============================================================================

/**
 * Build DocumentOrder from DB order and customer data.
 * Use with fetchOrderData + fetchCustomerData results.
 */
export function buildDocumentOrderFromDb(
  orderData: OrderDataFromDb,
  customerData: CustomerDataFromDb,
  options?: { orderId?: string; dueDate?: Date }
): DocumentOrder {
  const orderDate = orderData.orderDate ? new Date(orderData.orderDate) : new Date();
  const dueDate =
    options?.dueDate ??
    (orderData.dueDate ? new Date(orderData.dueDate) : undefined);
  const taxRate =
    orderData.subtotal > 0 ? (orderData.taxAmount / orderData.subtotal) * 100 : 10;

  const customer: DocumentCustomer = {
    id: customerData.id,
    name: customerData.name,
    email: customerData.email,
    phone: customerData.phone,
    address: customerData.address,
  };

  const billingAddress: DocumentAddress | undefined = customerData.address
    ? {
        addressLine1: customerData.address.addressLine1,
        addressLine2: customerData.address.addressLine2,
        city: customerData.address.city,
        state: customerData.address.state,
        postalCode: customerData.address.postalCode,
        country: customerData.address.country,
      }
    : undefined;

  const lineItems: DocumentLineItem[] = orderData.lineItems.map((item) => ({
    id: item.id,
    lineNumber: item.lineNumber,
    sku: item.sku,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discountPercent: item.discountPercent,
    discountAmount: item.discountAmount,
    taxAmount: item.taxAmount,
    total: item.lineTotal,
    notes: item.notes,
  }));

  return {
    id: options?.orderId ?? orderData.id,
    orderNumber: orderData.orderNumber,
    orderDate,
    dueDate,
    status: (orderData as { status?: string }).status,
    paymentStatus: orderData.paymentStatus,
    customer,
    billingAddress,
    lineItems,
    subtotal: orderData.subtotal,
    discount: orderData.discountAmount,
    discountType: orderData.discountPercent ? "percentage" : "fixed",
    discountPercent: orderData.discountPercent,
    taxRate,
    taxAmount: orderData.taxAmount,
    total: orderData.total,
    customerNotes: orderData.customerNotes,
    internalNotes: orderData.internalNotes,
  };
}

/**
 * Build DocumentOrder from preview document data.
 * Use when rendering preview with sample or real data.
 */
export function buildDocumentOrderFromPreviewData(
  documentData: PreviewDocumentData,
  options?: { orderId?: string; customerId?: string }
): DocumentOrder {
  const orderDate = new Date(documentData.order.createdAt);
  const dueDate = documentData.order.dueDate
    ? new Date(documentData.order.dueDate)
    : new Date(orderDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  const addressLine1 = documentData.customer.address ?? "";
  const addressLine2 = documentData.customer.addressLine2;
  const postalCode =
    documentData.customer.postalCode ?? documentData.customer.postcode ?? "";

  const customer: DocumentCustomer = {
    id: options?.customerId ?? "preview-customer",
    name: documentData.customer.name,
    email: documentData.customer.email,
    phone: documentData.customer.phone,
    address: {
      addressLine1,
      addressLine2: addressLine2 ?? undefined,
      city: documentData.customer.city ?? "",
      state: documentData.customer.state ?? "",
      postalCode,
      country: documentData.customer.country ?? "",
    },
  };

  const billingAddress: DocumentAddress = {
    addressLine1,
    addressLine2: addressLine2 ?? undefined,
    city: documentData.customer.city ?? "",
    state: documentData.customer.state ?? "",
    postalCode,
    country: documentData.customer.country ?? "",
  };

  const lineItems: DocumentLineItem[] = documentData.order.lineItems.map(
    (item, index) => ({
      id: `line-${index}`,
      lineNumber: String(index + 1),
      sku: item.sku ?? null,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercent: 0,
      discountAmount: 0,
      taxAmount: 0,
      total: item.total,
      notes: null,
    })
  );

  return {
    id: options?.orderId ?? "preview-order",
    orderNumber: documentData.order.orderNumber,
    orderDate,
    dueDate,
    customer,
    billingAddress,
    lineItems,
    subtotal: documentData.order.subtotal,
    discount: documentData.order.discount,
    discountPercent: 0,
    taxRate: (documentData.order.taxRate ?? 0.1) * 100,
    taxAmount: documentData.order.taxAmount,
    total: documentData.order.total,
    customerNotes: documentData.order.notes ?? null,
    internalNotes: null,
  };
}

'use server';

/**
 * Get Invoice Server Function
 *
 * Gets a single invoice/order with full details for the detail view.
 *
 * SECURITY: Uses withAuth for authentication and filters by
 * organizationId for multi-tenant isolation.
 *
 * @source invoice from orders table (invoice data is derived from orders)
 * @source lineItems from orderLineItems table
 * @source customer from customers table
 *
 * @see docs/design-system/INVOICE-STANDARDS.md
 */

import { cache } from 'react';
import { createServerFn } from '@tanstack/react-start';
import { setResponseStatus } from '@tanstack/react-start/server';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders, orderLineItems, customers } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError } from '@/lib/server/errors';
import { idParamSchema, flexibleJsonSchema, type FlexibleJson } from '@/lib/schemas/_shared/patterns';
import type { InvoiceStatus } from '@/lib/constants/invoice-status';

// ============================================================================
// TYPES
// ============================================================================

export interface InvoiceLineItem {
  id: string;
  lineNumber: string | null;
  sku: string | null;
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  discountPercent: number | null;
  discountAmount: number | null;
  taxType: string | null;
  taxAmount: number | null;
  lineTotal: number | null;
  notes: string | null;
}

export interface InvoiceDetail {
  id: string;
  orderNumber: string;
  invoiceNumber: string | null;
  invoiceStatus: InvoiceStatus | null;
  invoiceDueDate: string | null;
  invoiceSentAt: Date | null;
  invoiceViewedAt: Date | null;
  invoiceReminderSentAt: Date | null;
  paidAt: Date | null;
  status: string;
  paymentStatus: string;
  orderDate: string | null;
  dueDate: string | null;
  shippedDate: string | null;
  deliveredDate: string | null;
  subtotal: number | null;
  discountAmount: number | null;
  discountPercent: number | null;
  taxAmount: number | null;
  shippingAmount: number | null;
  total: number | null;
  paidAmount: number | null;
  balanceDue: number | null;
  internalNotes: string | null;
  customerNotes: string | null;
  invoicePdfUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  billingAddress: FlexibleJson | null;
  shippingAddress: FlexibleJson | null;
  lineItems: InvoiceLineItem[];
}

// ============================================================================
// SERVER FUNCTION
// ============================================================================

/**
 * Cached invoice fetch for per-request deduplication.
 * @performance Uses React.cache() for automatic request deduplication
 */
const _getInvoiceCached = cache(async (id: string, organizationId: string): Promise<InvoiceDetail | null> => {
  const [orderResult, lineItemRows] = await Promise.all([
    db
      .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          invoiceNumber: orders.invoiceNumber,
          invoiceStatus: orders.invoiceStatus,
          invoiceDueDate: orders.invoiceDueDate,
          invoiceSentAt: orders.invoiceSentAt,
          invoiceViewedAt: orders.invoiceViewedAt,
          invoiceReminderSentAt: orders.invoiceReminderSentAt,
          paidAt: orders.paidAt,
          status: orders.status,
          paymentStatus: orders.paymentStatus,
          orderDate: orders.orderDate,
          dueDate: orders.dueDate,
          shippedDate: orders.shippedDate,
          deliveredDate: orders.deliveredDate,
          subtotal: orders.subtotal,
          discountAmount: orders.discountAmount,
          discountPercent: orders.discountPercent,
          taxAmount: orders.taxAmount,
          shippingAmount: orders.shippingAmount,
          total: orders.total,
          paidAmount: orders.paidAmount,
          balanceDue: orders.balanceDue,
          internalNotes: orders.internalNotes,
          customerNotes: orders.customerNotes,
          invoicePdfUrl: orders.invoicePdfUrl,
          billingAddress: orders.billingAddress,
          shippingAddress: orders.shippingAddress,
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt,
          customerId: orders.customerId,
          customerName: customers.name,
          customerEmail: customers.email,
          customerPhone: customers.phone,
        })
        .from(orders)
        .innerJoin(
          customers,
          and(
            eq(orders.customerId, customers.id),
            eq(customers.organizationId, organizationId), // SECURITY: Multi-tenant isolation
            isNull(customers.deletedAt)
          )
        )
        .where(
          and(
            eq(orders.id, id),
            eq(orders.organizationId, organizationId),
            isNull(orders.deletedAt)
          )
        )
        .limit(1),
    db
      .select()
      .from(orderLineItems)
      .where(eq(orderLineItems.orderId, id)),
  ]);

  const [orderRow] = orderResult;
  if (!orderRow) return null;

  return {
      id: orderRow.id,
      orderNumber: orderRow.orderNumber,
      invoiceNumber: orderRow.invoiceNumber,
      invoiceStatus: orderRow.invoiceStatus as InvoiceStatus | null,
      invoiceDueDate: orderRow.invoiceDueDate,
      invoiceSentAt: orderRow.invoiceSentAt,
      invoiceViewedAt: orderRow.invoiceViewedAt,
      invoiceReminderSentAt: orderRow.invoiceReminderSentAt,
      paidAt: orderRow.paidAt,
      status: orderRow.status,
      paymentStatus: orderRow.paymentStatus,
      orderDate: orderRow.orderDate,
      dueDate: orderRow.dueDate,
      shippedDate: orderRow.shippedDate,
      deliveredDate: orderRow.deliveredDate,
      subtotal: orderRow.subtotal ? Number(orderRow.subtotal) : null,
      discountAmount: orderRow.discountAmount ? Number(orderRow.discountAmount) : null,
      discountPercent: orderRow.discountPercent ? Number(orderRow.discountPercent) : null,
      taxAmount: orderRow.taxAmount ? Number(orderRow.taxAmount) : null,
      shippingAmount: orderRow.shippingAmount ? Number(orderRow.shippingAmount) : null,
      total: orderRow.total ? Number(orderRow.total) : null,
      paidAmount: orderRow.paidAmount ? Number(orderRow.paidAmount) : null,
      balanceDue: orderRow.balanceDue ? Number(orderRow.balanceDue) : null,
      internalNotes: orderRow.internalNotes,
      customerNotes: orderRow.customerNotes,
      invoicePdfUrl: orderRow.invoicePdfUrl,
      billingAddress:
        orderRow.billingAddress != null && typeof orderRow.billingAddress === 'object' && !Array.isArray(orderRow.billingAddress)
          ? flexibleJsonSchema.parse(orderRow.billingAddress)
          : null,
      shippingAddress:
        orderRow.shippingAddress != null && typeof orderRow.shippingAddress === 'object' && !Array.isArray(orderRow.shippingAddress)
          ? flexibleJsonSchema.parse(orderRow.shippingAddress)
          : null,
      createdAt: orderRow.createdAt,
      updatedAt: orderRow.updatedAt,
      customer: {
        id: orderRow.customerId,
        name: orderRow.customerName,
        email: orderRow.customerEmail,
        phone: orderRow.customerPhone,
      },
      lineItems: lineItemRows.map((item) => ({
        id: item.id,
        lineNumber: item.lineNumber,
        sku: item.sku,
        description: item.description,
        quantity: item.quantity ? Number(item.quantity) : null,
        unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
        discountPercent: item.discountPercent ? Number(item.discountPercent) : null,
        discountAmount: item.discountAmount ? Number(item.discountAmount) : null,
        taxType: item.taxType,
        taxAmount: item.taxAmount ? Number(item.taxAmount) : null,
        lineTotal: item.lineTotal ? Number(item.lineTotal) : null,
        notes: item.notes,
      })),
  };
});

/**
 * Get a single invoice by ID with full details
 */
export const getInvoice = createServerFn({ method: 'GET' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const result = await _getInvoiceCached(data.id, ctx.organizationId);
    if (!result) {
      setResponseStatus(404);
      throw new NotFoundError('Invoice not found');
    }
    return result;
  });

'use server';

/**
 * Synchronous Document Generation Server Functions
 *
 * Generates PDF documents immediately (like quotes) rather than via background jobs.
 * Returns the PDF URL directly for immediate use.
 *
 * @see src/server/functions/pipeline/quote-versions.tsx for the quote pattern
 */
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { orders, orderLineItems, customers, addresses, organizations } from 'drizzle/schema';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  renderPdfToBuffer,
  generateQRCode,
  QuotePdfDocument,
  InvoicePdfDocument,
  PackingSlipPdfDocument,
  DeliveryNotePdfDocument,
  generateFilename,
  generateStoragePath,
  calculateChecksum,
  type QuoteDocumentData,
  type InvoiceDocumentData,
  type DocumentOrganization,
} from '@/lib/documents';
import type {
  PackingSlipDocumentData,
  PackingSlipLineItem,
  DeliveryNoteDocumentData,
  DeliveryNoteLineItem,
} from '@/lib/documents/templates/operational';
import { NotFoundError } from '@/lib/server/errors';

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_BUCKET = 'documents';
const QUOTE_VALIDITY_DAYS = 30;

// ============================================================================
// SCHEMAS
// ============================================================================

const generateOrderDocumentSchema = z.object({
  orderId: z.string().uuid(),
  documentType: z.enum(['quote', 'invoice', 'packing-slip', 'delivery-note']),
  regenerate: z.boolean().optional().default(false),
  // Optional metadata for specific document types
  dueDate: z.string().datetime().optional(),
  shipDate: z.string().datetime().optional(),
  shippingMethod: z.string().optional(),
  carrier: z.string().optional(),
  specialInstructions: z.string().optional(),
  packageCount: z.number().int().min(1).optional(),
  totalWeight: z.number().positive().optional(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch complete order data with line items
 */
async function fetchOrderData(orderId: string, organizationId: string) {
  const [order] = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      organizationId: orders.organizationId,
      customerId: orders.customerId,
      orderDate: orders.orderDate,
      dueDate: orders.dueDate,
      subtotal: orders.subtotal,
      discountAmount: orders.discountAmount,
      discountPercent: orders.discountPercent,
      taxAmount: orders.taxAmount,
      total: orders.total,
      customerNotes: orders.customerNotes,
      internalNotes: orders.internalNotes,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      shippingAddress: orders.shippingAddress,
      quotePdfUrl: orders.quotePdfUrl,
      invoicePdfUrl: orders.invoicePdfUrl,
    })
    .from(orders)
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.organizationId, organizationId),
        sql`${orders.deletedAt} IS NULL`
      )
    )
    .limit(1);

  if (!order) {
    throw new NotFoundError('Order not found', 'order');
  }

  // Fetch line items
  const lineItems = await db
    .select({
      id: orderLineItems.id,
      lineNumber: orderLineItems.lineNumber,
      sku: orderLineItems.sku,
      description: orderLineItems.description,
      quantity: orderLineItems.quantity,
      unitPrice: orderLineItems.unitPrice,
      discountPercent: orderLineItems.discountPercent,
      discountAmount: orderLineItems.discountAmount,
      taxAmount: orderLineItems.taxAmount,
      lineTotal: orderLineItems.lineTotal,
      notes: orderLineItems.notes,
    })
    .from(orderLineItems)
    .where(eq(orderLineItems.orderId, orderId))
    .orderBy(orderLineItems.lineNumber);

  return {
    ...order,
    lineItems: lineItems.map((item) => ({
      ...item,
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      discountPercent: Number(item.discountPercent) || 0,
      discountAmount: Number(item.discountAmount) || 0,
      taxAmount: Number(item.taxAmount) || 0,
      lineTotal: Number(item.lineTotal) || 0,
    })),
    subtotal: Number(order.subtotal) || 0,
    discountAmount: Number(order.discountAmount) || 0,
    discountPercent: Number(order.discountPercent) || 0,
    taxAmount: Number(order.taxAmount) || 0,
    total: Number(order.total) || 0,
  };
}

/**
 * Fetch customer with address
 */
async function fetchCustomerData(customerId: string, organizationId: string) {
  const [customer] = await db
    .select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
      phone: customers.phone,
    })
    .from(customers)
    .where(
      and(
        eq(customers.id, customerId),
        eq(customers.organizationId, organizationId),
        sql`${customers.deletedAt} IS NULL`
      )
    )
    .limit(1);

  if (!customer) {
    throw new NotFoundError('Customer not found', 'customer');
  }

  // Fetch primary billing address
  const [billingAddress] = await db
    .select({
      street1: addresses.street1,
      street2: addresses.street2,
      city: addresses.city,
      state: addresses.state,
      postcode: addresses.postcode,
      country: addresses.country,
    })
    .from(addresses)
    .where(
      and(
        eq(addresses.customerId, customerId),
        eq(addresses.organizationId, organizationId),
        eq(addresses.type, 'billing'),
        eq(addresses.isPrimary, true)
      )
    )
    .limit(1);

  // Fallback to any primary address
  let customerAddress = billingAddress;
  if (!customerAddress) {
    const [anyPrimary] = await db
      .select({
        street1: addresses.street1,
        street2: addresses.street2,
        city: addresses.city,
        state: addresses.state,
        postcode: addresses.postcode,
        country: addresses.country,
      })
      .from(addresses)
      .where(
        and(
          eq(addresses.customerId, customerId),
          eq(addresses.organizationId, organizationId),
          eq(addresses.isPrimary, true)
        )
      )
      .limit(1);
    customerAddress = anyPrimary;
  }

  return {
    ...customer,
    address: customerAddress
      ? {
          addressLine1: customerAddress.street1,
          addressLine2: customerAddress.street2,
          city: customerAddress.city,
          state: customerAddress.state,
          postalCode: customerAddress.postcode,
          country: customerAddress.country,
        }
      : undefined,
  };
}

/**
 * Fetch organization with branding
 */
async function fetchOrganizationData(organizationId: string): Promise<DocumentOrganization> {
  const [org] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      email: organizations.email,
      phone: organizations.phone,
      website: organizations.website,
      abn: organizations.abn,
      address: organizations.address,
      currency: organizations.currency,
      locale: organizations.locale,
      branding: organizations.branding,
    })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org) {
    throw new NotFoundError('Organization not found', 'organization');
  }

  const address = org.address as { street1?: string; street2?: string; city?: string; state?: string; postcode?: string; country?: string } | null;
  const branding = org.branding as { logoUrl?: string; primaryColor?: string; secondaryColor?: string } | null;

  return {
    id: org.id,
    name: org.name,
    email: org.email,
    phone: org.phone,
    website: org.website || branding?.logoUrl,
    taxId: org.abn,
    currency: org.currency || 'AUD',
    locale: org.locale || 'en-AU',
    address: address
      ? {
          addressLine1: address.street1,
          addressLine2: address.street2,
          city: address.city,
          state: address.state,
          postalCode: address.postcode,
          country: address.country,
        }
      : undefined,
    branding: {
      logoUrl: branding?.logoUrl,
      primaryColor: branding?.primaryColor,
      secondaryColor: branding?.secondaryColor,
    },
  };
}

/**
 * Upload PDF to storage and return signed URL
 */
async function uploadPdf(
  buffer: Buffer,
  organizationId: string,
  documentType: string,
  orderNumber: string
): Promise<{ url: string; filename: string; storagePath: string }> {
  const filename = generateFilename(documentType, orderNumber);
  const storagePath = generateStoragePath(organizationId, documentType, filename);

  // Upload to Supabase Storage
  const { error: uploadError } = await createAdminClient()
    .storage.from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload PDF: ${uploadError.message}`);
  }

  // Generate signed URL (valid for 1 year)
  const { data: signedUrlData, error: signedUrlError } = await createAdminClient()
    .storage.from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

  if (signedUrlError) {
    throw new Error(`Failed to generate signed URL: ${signedUrlError.message}`);
  }

  return {
    url: signedUrlData.signedUrl,
    filename,
    storagePath,
  };
}

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================

/**
 * Generate any order document synchronously
 */
export const generateOrderDocument = createServerFn({ method: 'POST' })
  .inputValidator(generateOrderDocumentSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.order.read });
    const { orderId, documentType, regenerate } = data;

    // Fetch all required data
    const [orderData, orgData] = await Promise.all([
      fetchOrderData(orderId, ctx.organizationId),
      fetchOrganizationData(ctx.organizationId),
    ]);

    const customerData = await fetchCustomerData(orderData.customerId, ctx.organizationId);

    // Check if document already exists and shouldn't be regenerated
    if (!regenerate) {
      const filename = generateFilename(documentType, orderData.orderNumber);

      if (documentType === 'quote' && orderData.quotePdfUrl) {
        return {
          orderId,
          documentType,
          status: 'completed' as const,
          url: orderData.quotePdfUrl,
          filename,
          storagePath: `/${ctx.organizationId}/orders/${orderId}/${filename}`,
          fileSize: 0, // Size not tracked for existing docs
          checksum: '', // Checksum not tracked for existing docs
        };
      }
      if (documentType === 'invoice' && orderData.invoicePdfUrl) {
        return {
          orderId,
          documentType,
          status: 'completed' as const,
          url: orderData.invoicePdfUrl,
          filename,
          storagePath: `/${ctx.organizationId}/orders/${orderId}/${filename}`,
          fileSize: 0, // Size not tracked for existing docs
          checksum: '', // Checksum not tracked for existing docs
        };
      }
    }

    // Generate QR code
    const documentUrl = `${process.env.APP_URL || 'https://app.renoz.com.au'}/orders/${orderId}`;
    const qrCodeDataUrl = await generateQRCode(documentUrl, {
      width: 240,
      margin: 0,
      errorCorrectionLevel: 'M',
    });

    // Build common order data
    const orderDate = orderData.orderDate ? new Date(orderData.orderDate) : new Date();
    const dueDate = data.dueDate
      ? new Date(data.dueDate)
      : orderData.dueDate
        ? new Date(orderData.dueDate)
        : new Date(orderDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const baseOrderData = {
      id: orderData.id,
      orderNumber: orderData.orderNumber,
      orderDate,
      dueDate,
      customer: {
        id: customerData.id,
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        address: customerData.address,
      },
      billingAddress: customerData.address,
      lineItems: orderData.lineItems.map((item) => ({
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
      })),
      subtotal: orderData.subtotal,
      discount: orderData.discountAmount,
      discountPercent: orderData.discountPercent,
      discountType: (orderData.discountPercent ? 'percentage' : 'fixed') as 'percentage' | 'fixed',
      taxRate: orderData.subtotal > 0 ? (orderData.taxAmount / orderData.subtotal) * 100 : 10,
      taxAmount: orderData.taxAmount,
      total: orderData.total,
      customerNotes: orderData.customerNotes,
      internalNotes: orderData.internalNotes,
    };

    // Generate PDF based on document type
    let buffer: Buffer;
    let filename: string;

    switch (documentType) {
      case 'quote': {
        const validUntil = new Date(orderDate);
        validUntil.setDate(validUntil.getDate() + QUOTE_VALIDITY_DAYS);

        const quoteData: QuoteDocumentData = {
          type: 'quote',
          documentNumber: `Q-${orderData.orderNumber}`,
          issueDate: orderDate,
          validUntil,
          notes: orderData.customerNotes,
          generatedAt: new Date(),
          order: baseOrderData,
        };

        const result = await renderPdfToBuffer(
          <QuotePdfDocument organization={orgData} data={quoteData} qrCodeDataUrl={qrCodeDataUrl} />
        );
        buffer = result.buffer;
        filename = generateFilename('quote', orderData.orderNumber);
        break;
      }

      case 'invoice': {
        const isPaid = orderData.paymentStatus === 'paid';
        const invoiceData: InvoiceDocumentData = {
          type: 'invoice',
          documentNumber: `INV-${orderData.orderNumber}`,
          issueDate: orderDate,
          dueDate,
          notes: orderData.customerNotes,
          generatedAt: new Date(),
          order: baseOrderData,
          isPaid,
          paidAt: isPaid ? new Date() : undefined,
        };

        const result = await renderPdfToBuffer(
          <InvoicePdfDocument organization={orgData} data={invoiceData} qrCodeDataUrl={qrCodeDataUrl} />
        );
        buffer = result.buffer;
        filename = generateFilename('invoice', orderData.orderNumber);
        break;
      }

      case 'packing-slip': {
        // Map line items to PackingSlipLineItem format
        const packingSlipLineItems: PackingSlipLineItem[] = orderData.lineItems.map((item, index) => ({
          id: item.id,
          lineNumber: String(index + 1),
          sku: item.sku,
          description: item.description,
          quantity: item.quantity,
          notes: item.notes,
          location: null,
          isFragile: false,
          weight: undefined, // Weight not stored in line items schema
        }));

        const packingSlipData: PackingSlipDocumentData = {
          documentNumber: `PS-${orderData.orderNumber}`,
          orderNumber: orderData.orderNumber,
          issueDate: orderDate,
          shipDate: data.shipDate ? new Date(data.shipDate) : new Date(),
          customer: {
            id: customerData.id,
            name: customerData.name,
            email: customerData.email,
            phone: customerData.phone,
          },
          shippingAddress: orderData.shippingAddress ? {
            name: orderData.shippingAddress.contactName || customerData.name,
            addressLine1: orderData.shippingAddress.street1,
            addressLine2: orderData.shippingAddress.street2,
            city: orderData.shippingAddress.city,
            state: orderData.shippingAddress.state,
            postalCode: orderData.shippingAddress.postalCode,
            country: orderData.shippingAddress.country,
            contactName: orderData.shippingAddress.contactName,
            contactPhone: orderData.shippingAddress.contactPhone,
          } : null,
          lineItems: packingSlipLineItems,
          carrier: data.carrier,
          shippingMethod: data.shippingMethod,
          packageCount: data.packageCount,
          totalWeight: data.totalWeight,
          specialInstructions: data.specialInstructions,
          notes: orderData.customerNotes || orderData.internalNotes || undefined,
        };

        const result = await renderPdfToBuffer(
          <PackingSlipPdfDocument organization={orgData} data={packingSlipData} qrCodeDataUrl={qrCodeDataUrl} />
        );
        buffer = result.buffer;
        filename = generateFilename('packing-slip', orderData.orderNumber);
        break;
      }

      case 'delivery-note': {
        // Map line items to DeliveryNoteLineItem format
        const deliveryNoteLineItems: DeliveryNoteLineItem[] = orderData.lineItems.map((item, index) => ({
          id: item.id,
          lineNumber: String(index + 1),
          sku: item.sku,
          description: item.description,
          quantity: item.quantity,
          notes: item.notes,
          isFragile: false,
          weight: undefined, // Weight not stored in line items schema
          dimensions: null,
        }));

        const deliveryNoteData: DeliveryNoteDocumentData = {
          documentNumber: `DN-${orderData.orderNumber}`,
          orderNumber: orderData.orderNumber,
          issueDate: orderDate,
          deliveryDate: data.shipDate ? new Date(data.shipDate) : new Date(),
          customer: {
            id: customerData.id,
            name: customerData.name,
            email: customerData.email,
            phone: customerData.phone,
          },
          shippingAddress: orderData.shippingAddress ? {
            name: orderData.shippingAddress.contactName || customerData.name,
            addressLine1: orderData.shippingAddress.street1,
            addressLine2: orderData.shippingAddress.street2,
            city: orderData.shippingAddress.city,
            state: orderData.shippingAddress.state,
            postalCode: orderData.shippingAddress.postalCode,
            country: orderData.shippingAddress.country,
            contactName: orderData.shippingAddress.contactName,
            contactPhone: orderData.shippingAddress.contactPhone,
          } : null,
          lineItems: deliveryNoteLineItems,
          carrier: data.carrier,
          trackingNumber: undefined, // trackingNumber not in input schema
          specialInstructions: data.specialInstructions,
          notes: orderData.customerNotes || orderData.internalNotes || undefined,
        };

        const result = await renderPdfToBuffer(
          <DeliveryNotePdfDocument organization={orgData} data={deliveryNoteData} qrCodeDataUrl={qrCodeDataUrl} />
        );
        buffer = result.buffer;
        filename = generateFilename('delivery-note', orderData.orderNumber);
        break;
      }

      default:
        throw new Error(`Unsupported document type: ${documentType}`);
    }

    // Upload to storage
    const { url, storagePath } = await uploadPdf(buffer, ctx.organizationId, documentType, orderData.orderNumber);

    // Update order with PDF URL
    if (documentType === 'quote') {
      await db
        .update(orders)
        .set({ quotePdfUrl: url, updatedAt: new Date() })
        .where(eq(orders.id, orderId));
    } else if (documentType === 'invoice') {
      await db
        .update(orders)
        .set({ invoicePdfUrl: url, updatedAt: new Date() })
        .where(eq(orders.id, orderId));
    }

    return {
      orderId,
      documentType,
      status: 'completed' as const,
      url,
      filename,
      storagePath,
      fileSize: buffer.length,
      checksum: calculateChecksum(buffer),
    };
  });

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/**
 * Generate Quote PDF for order
 */
export const generateOrderQuotePdf = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ orderId: z.string().uuid(), regenerate: z.boolean().optional() }))
  .handler(async ({ data }) => {
    return generateOrderDocument({
      data: { ...data, documentType: 'quote' },
    });
  });

/**
 * Generate Invoice PDF for order
 */
export const generateOrderInvoicePdf = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      orderId: z.string().uuid(),
      dueDate: z.string().datetime().optional(),
      regenerate: z.boolean().optional(),
    })
  )
  .handler(async ({ data }) => {
    return generateOrderDocument({
      data: { ...data, documentType: 'invoice' },
    });
  });

/**
 * Generate Packing Slip PDF for order
 */
export const generateOrderPackingSlipPdf = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      orderId: z.string().uuid(),
      shipDate: z.string().datetime().optional(),
      shippingMethod: z.string().optional(),
      carrier: z.string().optional(),
      specialInstructions: z.string().optional(),
      packageCount: z.number().int().min(1).optional(),
      totalWeight: z.number().positive().optional(),
    })
  )
  .handler(async ({ data }) => {
    return generateOrderDocument({
      data: { ...data, documentType: 'packing-slip' },
    });
  });

/**
 * Generate Delivery Note PDF for order
 */
export const generateOrderDeliveryNotePdf = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      orderId: z.string().uuid(),
      shipDate: z.string().datetime().optional(),
      carrier: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    return generateOrderDocument({
      data: { ...data, documentType: 'delivery-note' },
    });
  });

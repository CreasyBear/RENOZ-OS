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
import { eq, and, isNull, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  orders,
  orderLineItems,
  customers,
  addresses,
  generatedDocuments,
  orderShipments,
  shipmentItems,
} from 'drizzle/schema';
import { createActivityLogger } from '@/lib/activity-logger';
import { createAdminSupabase } from '@/lib/supabase/server';
import {
  renderPdfToBuffer,
  QuotePdfDocument,
  InvoicePdfDocument,
  ProFormaPdfDocument,
  PackingSlipPdfDocument,
  DispatchNotePdfDocument,
  DeliveryNotePdfDocument,
  generateFilename,
  generateStoragePath,
  calculateChecksum,
  type QuoteDocumentData,
  type InvoiceDocumentData,
} from '@/lib/documents';
import type { ProFormaDocumentData } from '@/lib/documents/templates/financial/pro-forma';
import { buildDocumentOrderFromDb } from '@/lib/documents/builders';
import type {
  PackingSlipDocumentData,
  PackingSlipLineItem,
  DispatchNoteDocumentData,
  DispatchNoteLineItem,
  DeliveryNoteDocumentData,
  DeliveryNoteLineItem,
} from '@/lib/documents/templates/operational';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { fetchOrganizationForDocument } from './organization-for-pdf';
import {
  fetchAllocatedSerialsByOrderLineItem,
  fetchShipmentSerialsByOrderLineItem,
} from './fetch-order-line-items-with-serials';
import { getPendingShipmentReservations } from '@/server/functions/orders/order-pending-shipment-reservations';

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_BUCKET = 'documents';
const QUOTE_VALIDITY_DAYS = 30;
const ORDER_SCOPED_DOCUMENT_TYPES = new Set(['quote', 'invoice', 'pro-forma']);

// ============================================================================
// SCHEMAS
// ============================================================================

const generateOrderDocumentSchema = z.object({
  orderId: z.string().uuid(),
  documentType: z.enum(['quote', 'invoice', 'pro-forma', 'packing-slip', 'delivery-note']),
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

const generateShipmentDocumentSchema = z.object({
  shipmentId: z.string().uuid(),
  documentType: z.enum(['packing-slip', 'dispatch-note', 'delivery-note']),
  regenerate: z.boolean().optional().default(false),
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
      billingAddress: orders.billingAddress,
      subtotal: orders.subtotal,
      discountAmount: orders.discountAmount,
      discountPercent: orders.discountPercent,
      taxAmount: orders.taxAmount,
      shippingAmount: orders.shippingAmount,
      total: orders.total,
      paidAmount: orders.paidAmount,
      balanceDue: orders.balanceDue,
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
        isNull(orders.deletedAt)
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
    shippingAmount: Number(order.shippingAmount) || 0,
    total: Number(order.total) || 0,
    paidAmount: Number(order.paidAmount) || 0,
    balanceDue: Number(order.balanceDue) || 0,
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
        isNull(customers.deletedAt)
      )
    )
    .limit(1);

  if (!customer) {
    throw new NotFoundError('Customer not found', 'customer');
  }

  const addressRows = await db
    .select({
      id: addresses.id,
      type: addresses.type,
      isPrimary: addresses.isPrimary,
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
        eq(addresses.organizationId, organizationId)
      )
    );

  const toDocumentAddress = (
    address:
      | {
          street1: string | null;
          street2: string | null;
          city: string | null;
          state: string | null;
          postcode: string | null;
          country: string | null;
        }
      | undefined
  ) =>
    address?.street1 && address.city && address.postcode && address.country
      ? {
          addressLine1: address.street1,
          addressLine2: address.street2,
          city: address.city,
          state: address.state,
          postalCode: address.postcode,
          country: address.country,
        }
      : undefined;

  const shippingAddress =
    addressRows.find((address) => address.type === 'shipping' && address.isPrimary) ??
    addressRows.find((address) => address.type === 'shipping');
  const billingAddress =
    addressRows.find((address) => address.type === 'billing' && address.isPrimary) ??
    addressRows.find((address) => address.type === 'billing');
  const primaryAddress =
    addressRows.find((address) => address.isPrimary) ?? addressRows[0];

  return {
    ...customer,
    address: toDocumentAddress(primaryAddress ?? billingAddress ?? shippingAddress),
    shippingAddress: toDocumentAddress(shippingAddress),
    billingAddress: toDocumentAddress(billingAddress),
    primaryAddress: toDocumentAddress(primaryAddress),
  };
}

function resolveOperationalShippingAddress(params: {
  shipmentShippingAddress?: typeof orderShipments.$inferSelect['shippingAddress'] | null;
  orderShippingAddress?: typeof orders.$inferSelect['shippingAddress'] | null;
  customerShippingAddress?: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
  } | null;
  customerBillingAddress?: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
  } | null;
  customerName: string;
}) {
  const shipmentAddress = params.shipmentShippingAddress;
  if (shipmentAddress?.street1) {
    return {
      name: shipmentAddress.name || params.customerName,
      addressLine1: shipmentAddress.street1,
      addressLine2: shipmentAddress.street2,
      city: shipmentAddress.city,
      state: shipmentAddress.state,
      postalCode: shipmentAddress.postcode,
      country: shipmentAddress.country,
      contactName: shipmentAddress.name,
      contactPhone: shipmentAddress.phone,
    };
  }

  const orderAddress = params.orderShippingAddress;
  if (orderAddress?.street1) {
    return {
      name: orderAddress.contactName || params.customerName,
      addressLine1: orderAddress.street1,
      addressLine2: orderAddress.street2,
      city: orderAddress.city,
      state: orderAddress.state,
      postalCode: orderAddress.postalCode,
      country: orderAddress.country,
      contactName: orderAddress.contactName,
      contactPhone: orderAddress.contactPhone,
    };
  }

  const customerAddress = params.customerShippingAddress ?? params.customerBillingAddress;
  if (customerAddress?.addressLine1) {
    return {
      name: params.customerName,
      addressLine1: customerAddress.addressLine1,
      addressLine2: customerAddress.addressLine2,
      city: customerAddress.city,
      state: customerAddress.state,
      postalCode: customerAddress.postalCode,
      country: customerAddress.country,
      contactName: customerAddress.contactName,
      contactPhone: customerAddress.contactPhone,
    };
  }

  return null;
}

async function fetchShipmentDocumentData(
  shipmentId: string,
  organizationId: string
) {
  const [shipment] = await db
    .select({
      id: orderShipments.id,
      orderId: orderShipments.orderId,
      shipmentNumber: orderShipments.shipmentNumber,
      status: orderShipments.status,
      carrier: orderShipments.carrier,
      carrierService: orderShipments.carrierService,
      trackingNumber: orderShipments.trackingNumber,
      operationalDocumentRevision: orderShipments.operationalDocumentRevision,
      createdAt: orderShipments.createdAt,
      shippedAt: orderShipments.shippedAt,
      deliveredAt: orderShipments.deliveredAt,
      shippingAddress: orderShipments.shippingAddress,
      notes: orderShipments.notes,
    })
    .from(orderShipments)
    .where(
      and(
        eq(orderShipments.id, shipmentId),
        eq(orderShipments.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!shipment) {
    throw new NotFoundError('Shipment not found', 'shipment');
  }

  const orderData = await fetchOrderData(shipment.orderId, organizationId);
  const customerData = await fetchCustomerData(orderData.customerId, organizationId);

  const shipmentLineItems = await db
    .select({
      id: shipmentItems.id,
      orderLineItemId: shipmentItems.orderLineItemId,
      quantity: shipmentItems.quantity,
      serialNumbers: shipmentItems.serialNumbers,
      notes: shipmentItems.notes,
      sku: orderLineItems.sku,
      description: orderLineItems.description,
    })
    .from(shipmentItems)
    .innerJoin(orderLineItems, eq(shipmentItems.orderLineItemId, orderLineItems.id))
    .where(eq(shipmentItems.shipmentId, shipmentId))
    .orderBy(shipmentItems.createdAt);

  return {
    shipment,
    orderData,
    customerData,
    shipmentLineItems,
    shippingAddress: resolveOperationalShippingAddress({
      shipmentShippingAddress: shipment.shippingAddress,
      orderShippingAddress: orderData.shippingAddress,
      customerShippingAddress: customerData.shippingAddress,
      customerBillingAddress: customerData.billingAddress ?? customerData.primaryAddress,
      customerName: customerData.name,
    }),
  };
}

async function getShipmentDocumentCapabilities(params: {
  organizationId: string;
  orderId: string;
  shipmentStatus: typeof orderShipments.$inferSelect['status'];
  shipmentLineItems: Array<{
    orderLineItemId: string;
    quantity: number | string | null;
  }>;
}) {
  const lineItemIds = Array.from(
    new Set(params.shipmentLineItems.map((item) => item.orderLineItemId))
  );

  const lineItemQuantities =
    lineItemIds.length > 0
      ? await db
          .select({
            id: orderLineItems.id,
            qtyPicked: orderLineItems.qtyPicked,
            qtyShipped: orderLineItems.qtyShipped,
          })
          .from(orderLineItems)
          .where(inArray(orderLineItems.id, lineItemIds))
      : [];

  const lineItemMap = new Map(
    lineItemQuantities.map((item) => [
      item.id,
      {
        qtyPicked: Number(item.qtyPicked ?? 0),
        qtyShipped: Number(item.qtyShipped ?? 0),
      },
    ])
  );

  const pendingReservations = await getPendingShipmentReservations(db, {
    organizationId: params.organizationId,
    orderId: params.orderId,
  });

  const isDispatchReady =
    params.shipmentStatus !== 'pending'
      ? true
      : params.shipmentLineItems.length > 0 &&
        params.shipmentLineItems.every((item) => {
          const line = lineItemMap.get(item.orderLineItemId);
          if (!line) return false;
          const globallyReserved = Number(
            pendingReservations.quantitiesByLineItem.get(item.orderLineItemId) ?? 0
          );
          return line.qtyPicked - line.qtyShipped >= globallyReserved;
        });

  return {
    canGenerateDispatchNote: isDispatchReady,
    canGenerateDeliveryNote: params.shipmentStatus === 'delivered',
  };
}

/**
 * Upload PDF to storage and return signed URL
 * Uses authenticated user's session with RLS instead of admin client
 */
async function uploadPdf(
  buffer: Buffer,
  organizationId: string,
  documentType: string,
  orderNumber: string
): Promise<{ url: string; filename: string; storagePath: string }> {
  const filename = generateFilename(documentType, orderNumber);
  const storagePath = generateStoragePath(organizationId, documentType, filename);

  // Use admin client for storage (service role bypasses RLS)
  const supabase = createAdminSupabase();

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase
    .storage.from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload PDF: ${uploadError.message}`);
  }

  // Generate signed URL (valid for 1 year)
  const { data: signedUrlData, error: signedUrlError } = await supabase
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

    if (!ORDER_SCOPED_DOCUMENT_TYPES.has(documentType)) {
      const shipments = await db
        .select({
          id: orderShipments.id,
        })
        .from(orderShipments)
        .where(
          and(
            eq(orderShipments.organizationId, ctx.organizationId),
            eq(orderShipments.orderId, orderId)
          )
        );

      if (shipments.length === 0) {
        throw new ValidationError(
          'Create a shipment before generating shipment-backed operational documents.',
          {
            shipmentId: ['Shipment context is required for packing slips and delivery notes.'],
          }
        );
      }

      if (shipments.length > 1) {
        throw new ValidationError(
          'Multiple shipments exist for this order. Generate the document from a specific shipment.',
          {
            shipmentId: ['Choose the shipment that owns this operational document.'],
          }
        );
      }

      return generateShipmentDocument({
        data: {
          shipmentId: shipments[0].id,
          documentType: documentType as 'packing-slip' | 'delivery-note',
          regenerate,
        },
      });
    }

    // Fetch all required data
    const [orderData, orgData] = await Promise.all([
      fetchOrderData(orderId, ctx.organizationId),
      fetchOrganizationForDocument(ctx.organizationId),
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

    // Build common order data
    const orderDate = orderData.orderDate ? new Date(orderData.orderDate) : new Date();
    const dueDate = data.dueDate
      ? new Date(data.dueDate)
      : orderData.dueDate
        ? new Date(orderData.dueDate)
        : new Date(orderDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const baseOrderData = buildDocumentOrderFromDb(orderData, customerData, {
      dueDate,
    });

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
          <QuotePdfDocument organization={orgData} data={quoteData} />
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
          <InvoicePdfDocument organization={orgData} data={invoiceData} />
        );
        buffer = result.buffer;
        filename = generateFilename('invoice', orderData.orderNumber);
        break;
      }

      case 'pro-forma': {
        const validUntil = new Date(orderDate);
        validUntil.setDate(validUntil.getDate() + QUOTE_VALIDITY_DAYS);

        const proFormaData: ProFormaDocumentData = {
          type: 'pro-forma',
          documentNumber: `PF-${orderData.orderNumber}`,
          issueDate: orderDate,
          validUntil,
          notes: orderData.customerNotes,
          generatedAt: new Date(),
          order: baseOrderData,
        };

        const result = await renderPdfToBuffer(
          <ProFormaPdfDocument organization={orgData} data={proFormaData} />
        );
        buffer = result.buffer;
        filename = generateFilename('pro-forma', orderData.orderNumber);
        break;
      }

      case 'packing-slip': {
        const shippingAddress = resolveOperationalShippingAddress({
          orderShippingAddress: orderData.shippingAddress,
          customerShippingAddress: customerData.shippingAddress,
          customerBillingAddress: customerData.billingAddress ?? customerData.primaryAddress,
          customerName: customerData.name,
        });
        const shipmentSerialMap = await fetchShipmentSerialsByOrderLineItem(orderId);
        const allocationSerialMap = await fetchAllocatedSerialsByOrderLineItem(
          orderData.lineItems.map((item) => item.id)
        );
        const packingSlipLineItems: PackingSlipLineItem[] = orderData.lineItems.map((item, index) => {
          const serialNumbers =
            shipmentSerialMap.get(item.id) ??
            allocationSerialMap.get(item.id) ??
            undefined;
          return {
            id: item.id,
            lineNumber: String(index + 1),
            sku: item.sku,
            description: item.description,
            quantity: item.quantity,
            notes: item.notes,
            location: null,
            isFragile: false,
            weight: undefined,
            serialNumbers: serialNumbers && serialNumbers.length > 0 ? serialNumbers : undefined,
          };
        });

        const packingSlipData: PackingSlipDocumentData = {
          documentNumber: `PS-${orderData.orderNumber}`,
          orderNumber: orderData.orderNumber,
          issueDate: orderDate,
          shipDate: data.shipDate ? new Date(data.shipDate) : new Date(),
          shipDateLabel: 'Ship Date',
          customer: {
            id: customerData.id,
            name: customerData.name,
            email: customerData.email,
            phone: customerData.phone,
          },
          shippingAddress,
          lineItems: packingSlipLineItems,
          carrier: data.carrier,
          shippingMethod: data.shippingMethod,
          packageCount: data.packageCount,
          totalWeight: data.totalWeight,
          specialInstructions: data.specialInstructions,
          notes: orderData.customerNotes || orderData.internalNotes || undefined,
        };

        const result = await renderPdfToBuffer(
          <PackingSlipPdfDocument organization={orgData} data={packingSlipData} />
        );
        buffer = result.buffer;
        filename = generateFilename('packing-slip', orderData.orderNumber);
        break;
      }

      case 'delivery-note': {
        const shippingAddress = resolveOperationalShippingAddress({
          orderShippingAddress: orderData.shippingAddress,
          customerShippingAddress: customerData.shippingAddress,
          customerBillingAddress: customerData.billingAddress ?? customerData.primaryAddress,
          customerName: customerData.name,
        });
        const shipmentSerialMap = await fetchShipmentSerialsByOrderLineItem(orderId);
        const allocationSerialMap = await fetchAllocatedSerialsByOrderLineItem(
          orderData.lineItems.map((item) => item.id)
        );

        // Map line items to DeliveryNoteLineItem format
        const deliveryNoteLineItems: DeliveryNoteLineItem[] = orderData.lineItems.map((item, index) => {
          // Use shipment serial numbers if available, otherwise fall back to canonical active allocations.
          const serialNumbers = shipmentSerialMap.get(item.id)
            ?? allocationSerialMap.get(item.id)
            ?? undefined;
          return {
            id: item.id,
            lineNumber: String(index + 1),
            sku: item.sku,
            description: item.description,
            quantity: item.quantity,
            notes: item.notes,
            isFragile: false,
            weight: undefined, // Weight not stored in line items schema
            dimensions: null,
            serialNumbers: serialNumbers && serialNumbers.length > 0 ? serialNumbers : undefined,
          };
        });

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
          shippingAddress,
          lineItems: deliveryNoteLineItems,
          carrier: data.carrier,
          trackingNumber: undefined, // trackingNumber not in input schema
          specialInstructions: data.specialInstructions,
          notes: orderData.customerNotes || orderData.internalNotes || undefined,
        };

        const result = await renderPdfToBuffer(
          <DeliveryNotePdfDocument organization={orgData} data={deliveryNoteData} />
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
    const checksum = await calculateChecksum(buffer);
    const fileSize = buffer.length;

    // Upsert generated_documents: one row per (org, entity, docType)
    // On regenerate: update metadata + increment regeneration count
    const [upsertResult] = await db
      .insert(generatedDocuments)
      .values({
        organizationId: ctx.organizationId,
        documentType,
        entityType: 'order',
        entityId: orderId,
        filename,
        storageUrl: url,
        fileSize,
        generatedById: ctx.user.id,
        regenerationCount: 0,
        sourceRevision: null,
      })
      .onConflictDoUpdate({
        target: [
          generatedDocuments.organizationId,
          generatedDocuments.entityType,
          generatedDocuments.entityId,
          generatedDocuments.documentType,
        ],
        set: {
          filename,
          storageUrl: url,
          fileSize,
          generatedById: ctx.user.id,
          generatedAt: new Date(),
          updatedAt: new Date(),
          regenerationCount: sql`${generatedDocuments.regenerationCount} + 1`,
          sourceRevision: null,
        },
      })
      .returning({ regenerationCount: generatedDocuments.regenerationCount });

    // Log activity for audit trail (async, non-blocking)
    const activityLogger = createActivityLogger({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
    });
    const isRegeneration = (upsertResult?.regenerationCount ?? 0) > 0;
    activityLogger.logAsync({
      entityType: 'order',
      entityId: orderId,
      action: 'exported',
      entityName: orderData.orderNumber,
      description: isRegeneration
        ? `Regenerated ${documentType} PDF (version ${upsertResult?.regenerationCount ?? 1})`
        : `Generated ${documentType} PDF`,
      metadata: {
        documentType,
        filename,
        fileSize,
        isRegeneration,
        regenerationCount: upsertResult?.regenerationCount ?? 0,
      },
    });

    // Update order with PDF URL (includes orgId check for multi-tenant security)
    if (documentType === 'quote') {
      await db
        .update(orders)
        .set({ quotePdfUrl: url, updatedAt: new Date() })
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.organizationId, ctx.organizationId)
          )
        );
    } else if (documentType === 'invoice') {
      await db
        .update(orders)
        .set({ invoicePdfUrl: url, updatedAt: new Date() })
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.organizationId, ctx.organizationId)
          )
        );
    }

    return {
      orderId,
      documentType,
      status: 'completed' as const,
      entityType: 'order' as const,
      entityId: orderId,
      url,
      filename,
      storagePath,
      fileSize,
      checksum,
    };
  });

export const generateShipmentDocument = createServerFn({ method: 'POST' })
  .inputValidator(generateShipmentDocumentSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.order.read });
    const { shipmentId, documentType, regenerate } = data;

    const [{ shipment, orderData, customerData, shipmentLineItems, shippingAddress }, orgData] =
      await Promise.all([
        fetchShipmentDocumentData(shipmentId, ctx.organizationId),
        fetchOrganizationForDocument(ctx.organizationId),
      ]);

    const capabilities = await getShipmentDocumentCapabilities({
      organizationId: ctx.organizationId,
      orderId: orderData.id,
      shipmentStatus: shipment.status,
      shipmentLineItems,
    });

    if (!regenerate) {
      const existingFilename = generateFilename(documentType, shipment.shipmentNumber);
      const [existingDocument] = await db
        .select({
          storageUrl: generatedDocuments.storageUrl,
          filename: generatedDocuments.filename,
          fileSize: generatedDocuments.fileSize,
          sourceRevision: generatedDocuments.sourceRevision,
        })
        .from(generatedDocuments)
        .where(
          and(
            eq(generatedDocuments.organizationId, ctx.organizationId),
            eq(generatedDocuments.entityType, 'shipment'),
            eq(generatedDocuments.entityId, shipmentId),
            eq(generatedDocuments.documentType, documentType)
          )
        )
        .limit(1);

      const isStale =
        existingDocument != null &&
        Number(existingDocument.sourceRevision ?? 0) <
          Number(shipment.operationalDocumentRevision ?? 0);

      if (existingDocument?.storageUrl && !isStale) {
        return {
          orderId: orderData.id,
          shipmentId,
          documentType,
          status: 'completed' as const,
          entityType: 'shipment' as const,
          entityId: shipmentId,
          url: existingDocument.storageUrl,
          filename: existingDocument.filename ?? existingFilename,
          storagePath: `/${ctx.organizationId}/shipments/${shipmentId}/${existingFilename}`,
          fileSize: existingDocument.fileSize ?? 0,
          checksum: '',
        };
      }
    }

    const issueDate = shipment.createdAt ? new Date(shipment.createdAt) : new Date();
    let buffer: Buffer;
    let filename: string;

    if (documentType === 'packing-slip') {
      const packingSlipData: PackingSlipDocumentData = {
        documentNumber: `PS-${shipment.shipmentNumber}`,
        orderNumber: orderData.orderNumber,
        issueDate,
        shipDate: shipment.shippedAt ? new Date(shipment.shippedAt) : issueDate,
        shipDateLabel: shipment.shippedAt ? 'Ship Date' : 'Prepared',
        customer: {
          id: customerData.id,
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
        },
        shippingAddress,
        lineItems: shipmentLineItems.map((item, index) => ({
          id: item.orderLineItemId,
          lineNumber: String(index + 1),
          sku: item.sku,
          description: item.description,
          quantity: Number(item.quantity),
          notes: item.notes,
          location: null,
          isFragile: false,
          weight: undefined,
          serialNumbers:
            item.serialNumbers && item.serialNumbers.length > 0 ? item.serialNumbers : undefined,
        })),
        carrier: shipment.carrier ?? undefined,
        shippingMethod: shipment.carrierService ?? undefined,
        notes: shipment.notes ?? orderData.customerNotes ?? orderData.internalNotes ?? undefined,
      };

      const result = await renderPdfToBuffer(
        <PackingSlipPdfDocument organization={orgData} data={packingSlipData} />
      );
      buffer = result.buffer;
      filename = generateFilename('packing-slip', shipment.shipmentNumber);
    } else if (documentType === 'dispatch-note') {
      if (!capabilities.canGenerateDispatchNote) {
        throw new Error(
          'Dispatch note is only available once every item in this shipment draft is fully picked.'
        );
      }

      const dispatchNoteData: DispatchNoteDocumentData = {
        documentNumber: `DS-${shipment.shipmentNumber}`,
        orderNumber: orderData.orderNumber,
        issueDate,
        dispatchDate: shipment.shippedAt ? new Date(shipment.shippedAt) : issueDate,
        customer: {
          id: customerData.id,
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
        },
        shippingAddress,
        lineItems: shipmentLineItems.map<DispatchNoteLineItem>((item, index) => ({
          id: item.orderLineItemId,
          lineNumber: String(index + 1),
          sku: item.sku,
          description: item.description,
          quantity: Number(item.quantity),
          notes: item.notes,
          isFragile: false,
          weight: undefined,
          dimensions: null,
          serialNumbers:
            item.serialNumbers && item.serialNumbers.length > 0 ? item.serialNumbers : undefined,
        })),
        carrier: shipment.carrier ?? undefined,
        trackingNumber: shipment.trackingNumber ?? undefined,
        notes: shipment.notes ?? orderData.customerNotes ?? orderData.internalNotes ?? undefined,
      };

      const result = await renderPdfToBuffer(
        <DispatchNotePdfDocument organization={orgData} data={dispatchNoteData} />
      );
      buffer = result.buffer;
      filename = generateFilename('dispatch-note', shipment.shipmentNumber);
    } else {
      if (!capabilities.canGenerateDeliveryNote || !shipment.deliveredAt) {
        throw new Error('Delivery note is only available after delivery is confirmed.');
      }

      const deliveryNoteData: DeliveryNoteDocumentData = {
        documentNumber: `DN-${shipment.shipmentNumber}`,
        orderNumber: orderData.orderNumber,
        issueDate: new Date(shipment.deliveredAt),
        deliveryDate: new Date(shipment.deliveredAt),
        customer: {
          id: customerData.id,
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
        },
        shippingAddress,
        lineItems: shipmentLineItems.map((item, index) => ({
          id: item.orderLineItemId,
          lineNumber: String(index + 1),
          sku: item.sku,
          description: item.description,
          quantity: Number(item.quantity),
          notes: item.notes,
          isFragile: false,
          weight: undefined,
          dimensions: null,
          serialNumbers:
            item.serialNumbers && item.serialNumbers.length > 0 ? item.serialNumbers : undefined,
        })),
        carrier: shipment.carrier ?? undefined,
        trackingNumber: shipment.trackingNumber ?? undefined,
        notes: shipment.notes ?? orderData.customerNotes ?? orderData.internalNotes ?? undefined,
      };

      const result = await renderPdfToBuffer(
        <DeliveryNotePdfDocument organization={orgData} data={deliveryNoteData} />
      );
      buffer = result.buffer;
      filename = generateFilename('delivery-note', shipment.shipmentNumber);
    }

    const { url, storagePath } = await uploadPdf(
      buffer,
      ctx.organizationId,
      documentType,
      shipment.shipmentNumber
    );
    const checksum = await calculateChecksum(buffer);
    const fileSize = buffer.length;

    const [upsertResult] = await db
      .insert(generatedDocuments)
      .values({
        organizationId: ctx.organizationId,
        documentType,
        entityType: 'shipment',
        entityId: shipmentId,
        filename,
        storageUrl: url,
        fileSize,
        generatedById: ctx.user.id,
        regenerationCount: 0,
        sourceRevision: shipment.operationalDocumentRevision ?? 0,
      })
      .onConflictDoUpdate({
        target: [
          generatedDocuments.organizationId,
          generatedDocuments.entityType,
          generatedDocuments.entityId,
          generatedDocuments.documentType,
        ],
        set: {
          filename,
          storageUrl: url,
          fileSize,
          generatedById: ctx.user.id,
          generatedAt: new Date(),
          updatedAt: new Date(),
          regenerationCount: sql`${generatedDocuments.regenerationCount} + 1`,
          sourceRevision: shipment.operationalDocumentRevision ?? 0,
        },
      })
      .returning({ regenerationCount: generatedDocuments.regenerationCount });

    const activityLogger = createActivityLogger({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
    });
    const isRegeneration = (upsertResult?.regenerationCount ?? 0) > 0;
    activityLogger.logAsync({
      entityType: 'shipment',
      entityId: shipmentId,
      action: 'exported',
      entityName: shipment.shipmentNumber,
      description: isRegeneration
        ? `Regenerated ${documentType} PDF (version ${upsertResult?.regenerationCount ?? 1})`
        : `Generated ${documentType} PDF`,
      metadata: {
        documentType,
        filename,
        fileSize,
        orderId: orderData.id,
        isRegeneration,
        regenerationCount: upsertResult?.regenerationCount ?? 0,
      },
    });

    return {
      orderId: orderData.id,
      shipmentId,
      documentType,
      status: 'completed' as const,
      entityType: 'shipment' as const,
      entityId: shipmentId,
      url,
      filename,
      storagePath,
      fileSize,
      checksum,
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
 * Generate Pro-Forma Invoice PDF for order
 */
export const generateOrderProFormaPdf = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ orderId: z.string().uuid(), regenerate: z.boolean().optional() }))
  .handler(async ({ data }) => {
    return generateOrderDocument({
      data: { ...data, documentType: 'pro-forma' },
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

export const generateShipmentPackingSlipPdf = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      shipmentId: z.string().uuid(),
      regenerate: z.boolean().optional(),
    })
  )
  .handler(async ({ data }) => {
    return generateShipmentDocument({
      data: { ...data, documentType: 'packing-slip' },
    });
  });

export const generateShipmentDispatchNotePdf = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      shipmentId: z.string().uuid(),
      regenerate: z.boolean().optional(),
    })
  )
  .handler(async ({ data }) => {
    return generateShipmentDocument({
      data: { ...data, documentType: 'dispatch-note' },
    });
  });

export const generateShipmentDeliveryNotePdf = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      shipmentId: z.string().uuid(),
      regenerate: z.boolean().optional(),
    })
  )
  .handler(async ({ data }) => {
    return generateShipmentDocument({
      data: { ...data, documentType: 'delivery-note' },
    });
  });

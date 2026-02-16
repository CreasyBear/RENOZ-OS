'use server'

/**
 * Generate Quote PDF Task (Trigger.dev v3)
 *
 * Background task to generate PDF quotes for orders.
 * Uses @react-pdf/renderer with organization branding.
 *
 * @see https://trigger.dev/docs/v3/tasks
 */
import { task, logger } from "@trigger.dev/sdk/v3";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { createAdminSupabase } from "@/lib/supabase/server";
import {
  orders,
  orderLineItems,
  customers,
  addresses,
} from "drizzle/schema";
import { fetchOrganizationForDocument } from "@/server/functions/documents/organization-for-pdf";
import {
  renderPdfToBuffer,
  QuotePdfDocument,
  generateFilename,
  generateStoragePath,
  calculateChecksum,
  type QuoteDocumentData,
} from "@/lib/documents";
import { buildDocumentOrderFromDb } from "@/lib/documents/builders";

// ============================================================================
// TYPES
// ============================================================================

export interface GenerateQuotePdfPayload {
  orderId: string;
  orderNumber: string;
  organizationId: string;
  customerId: string;
  /** Optional: regenerate existing document */
  regenerate?: boolean;
  /** Optional: ID of existing document to regenerate */
  existingDocumentId?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_BUCKET = "documents";
const QUOTE_VALIDITY_DAYS = 30;

// ============================================================================
// TASK DEFINITION
// ============================================================================

/**
 * Generate Quote PDF Task
 *
 * This task:
 * 1. Fetches order details with line items
 * 2. Fetches organization branding
 * 3. Fetches customer information
 * 4. Generates PDF using QuotePdfDocument template
 * 5. Uploads to Supabase Storage
 * 6. Returns document metadata
 */
export const generateQuotePdf = task({
  id: "generate-quote-pdf",
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: GenerateQuotePdfPayload) => {
    const { orderId, orderNumber, organizationId, customerId } = payload;

    logger.info("Starting quote PDF generation", {
      orderId,
      orderNumber,
      organizationId,
    });

    // Step 1: Fetch order with line items
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
      throw new Error(`Order ${orderId} not found`);
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

    const orderData = {
      ...order,
      subtotal: Number(order.subtotal) || 0,
      discountAmount: Number(order.discountAmount) || 0,
      discountPercent: Number(order.discountPercent) || 0,
      taxAmount: Number(order.taxAmount) || 0,
      total: Number(order.total) || 0,
      lineItems: lineItems.map((item) => ({
        ...item,
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        discountPercent: Number(item.discountPercent) || 0,
        discountAmount: Number(item.discountAmount) || 0,
        taxAmount: Number(item.taxAmount) || 0,
        lineTotal: Number(item.lineTotal) || 0,
      })),
    };

    // Step 2: Fetch organization details (with logo pre-fetched for PDF)
    const orgData = await fetchOrganizationForDocument(organizationId);

    // Step 3: Fetch customer details with primary billing address
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
      throw new Error(`Customer ${customerId} not found`);
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
          eq(addresses.type, "billing"),
          eq(addresses.isPrimary, true)
        )
      )
      .limit(1);

    // Fallback to any primary address if no billing address
    let customerAddress = billingAddress;
    if (!billingAddress) {
      const [anyPrimaryAddress] = await db
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
      customerAddress = anyPrimaryAddress;
    }

    const customerData = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
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

    // Step 4: Build document data and render PDF
    // Calculate valid until date
    const orderDate = orderData.orderDate
      ? new Date(orderData.orderDate)
      : new Date();
    const validUntil = new Date(orderDate);
    validUntil.setDate(validUntil.getDate() + QUOTE_VALIDITY_DAYS);

    // Build document data with all comprehensive fields
    const orderForQuote = buildDocumentOrderFromDb(orderData, customerData);
    const quoteData: QuoteDocumentData = {
      type: "quote",
      documentNumber: `Q-${orderData.orderNumber}`,
      issueDate: orderDate,
      validUntil,
      notes: orderData.customerNotes,
      generatedAt: new Date(),
      order: orderForQuote,
    };

    // Render PDF to buffer
    const { buffer } = await renderPdfToBuffer(
      <QuotePdfDocument
        organization={orgData}
        data={quoteData}
      />
    );

    const pdfResult = {
      buffer,
      fileSize: buffer.length,
    };

    // Step 6: Upload to Supabase Storage
    const filename = generateFilename("quote", orderData.orderNumber);
    const storagePath = generateStoragePath(organizationId, "quote", filename);
    const checksum = calculateChecksum(pdfResult.buffer);

    logger.info("Uploading PDF to storage", {
      filename,
      storagePath,
      fileSize: pdfResult.fileSize,
    });

    // Upload to Supabase Storage
    const { error: uploadError } = await createAdminSupabase()
      .storage.from(STORAGE_BUCKET)
      .upload(storagePath, pdfResult.buffer, {
        contentType: "application/pdf",
        upsert: true, // Allow overwriting for regeneration
      });

    if (uploadError) {
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    // Generate signed URL (valid for 1 year)
    const { data: signedUrlData, error: signedUrlError } =
      await createAdminSupabase()
        .storage.from(STORAGE_BUCKET)
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 year

    if (signedUrlError) {
      throw new Error(
        `Failed to generate signed URL: ${signedUrlError.message}`
      );
    }

    logger.info("Quote PDF generated successfully", {
      orderId,
      orderNumber,
      storagePath,
      fileSize: pdfResult.fileSize,
    });

    // Return task result
    return {
      success: true,
      orderId,
      orderNumber,
      organizationId,
      documentType: "quote" as const,
      storagePath,
      signedUrl: signedUrlData.signedUrl,
      filename,
      fileSize: pdfResult.fileSize,
      checksum,
    };
  },
});

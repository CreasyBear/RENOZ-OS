'use server'

/**
 * Generate Invoice PDF Task (Trigger.dev v3)
 *
 * Background task to generate PDF invoices for orders.
 * Uses @react-pdf/renderer with organization branding and payment details.
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
  InvoicePdfDocument,
  generateFilename,
  generateStoragePath,
  calculateChecksum,
  type InvoiceDocumentData,
  type DocumentPaymentDetails,
} from "@/lib/documents";

// ============================================================================
// TYPES
// ============================================================================

export interface GenerateInvoicePdfPayload {
  orderId: string;
  orderNumber: string;
  organizationId: string;
  customerId: string;
  /** Due date for the invoice */
  dueDate?: string;
  /** Optional: regenerate existing document */
  regenerate?: boolean;
  /** Optional: ID of existing document to regenerate */
  existingDocumentId?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_BUCKET = "documents";
const DEFAULT_PAYMENT_TERMS_DAYS = 30;

// ============================================================================
// TASK DEFINITION
// ============================================================================

/**
 * Generate Invoice PDF Task
 *
 * This task:
 * 1. Fetches order details with line items
 * 2. Fetches organization branding and payment details
 * 3. Fetches customer information
 * 4. Generates PDF using InvoicePdfDocument template
 * 5. Uploads to Supabase Storage
 * 6. Returns document metadata
 */
export const generateInvoicePdf = task({
  id: "generate-invoice-pdf",
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: GenerateInvoicePdfPayload) => {
    const { orderId, orderNumber, organizationId, customerId, dueDate } =
      payload;

    logger.info("Starting invoice PDF generation", {
      orderId,
      orderNumber,
      organizationId,
      dueDate,
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
        paidAmount: orders.paidAmount,
        paymentStatus: orders.paymentStatus,
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
      paidAmount: Number(order.paidAmount) || 0,
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
    const defaultPaymentTerms = orgData.settings?.defaultPaymentTerms;

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
    // Calculate issue date and due date
    const orderDate = orderData.orderDate
      ? new Date(orderData.orderDate)
      : new Date();

    // Use provided due date or calculate from payment terms
    const invoiceDueDate = dueDate
      ? new Date(dueDate)
      : orderData.dueDate
        ? new Date(orderData.dueDate)
        : new Date(
            orderDate.getTime() +
              (defaultPaymentTerms || DEFAULT_PAYMENT_TERMS_DAYS) *
                24 *
                60 *
                60 *
                1000
          );

    // Determine payment status
    const isPaid = orderData.paymentStatus === "paid";
    const paidAt = isPaid ? new Date() : null; // In production, fetch actual payment date

    // Build payment details (placeholder - would come from organization payment settings)
    const paymentDetails: DocumentPaymentDetails = {
      bankName: "Commonwealth Bank",
      accountName: orgData.name,
      bsb: "000-000",
      accountNumber: "12345678",
      paymentInstructions: `Please include invoice number INV-${orderData.orderNumber} as payment reference.`,
    };

    // Calculate balance due
    const balanceDue = orderData.total - orderData.paidAmount;

    // Build document data with all comprehensive fields
    const invoiceData: InvoiceDocumentData = {
      type: "invoice",
      documentNumber: `INV-${orderData.orderNumber}`,
      issueDate: orderDate,
      dueDate: invoiceDueDate,
      notes: orderData.customerNotes,
      generatedAt: new Date(),
      order: {
        id: orderData.id,
        orderNumber: orderData.orderNumber,
        orderDate,
        dueDate: invoiceDueDate,
        paymentStatus: orderData.paymentStatus,
        customer: {
          id: customerData.id,
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          address: customerData.address,
        },
        // Pass billing address from customer
        billingAddress: customerData.address,
        // Pass all line item fields for comprehensive display
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
        discountType: orderData.discountPercent
          ? ("percentage" as const)
          : ("fixed" as const),
        taxRate:
          orderData.subtotal > 0
            ? (orderData.taxAmount / orderData.subtotal) * 100
            : 10,
        taxAmount: orderData.taxAmount,
        total: orderData.total,
        paidAmount: orderData.paidAmount,
        balanceDue: balanceDue > 0 ? balanceDue : 0,
        customerNotes: orderData.customerNotes,
        internalNotes: orderData.internalNotes,
      },
      paymentDetails,
      isPaid,
      paidAt,
    };

    // Render PDF to buffer
    const { buffer } = await renderPdfToBuffer(
      <InvoicePdfDocument
        organization={orgData}
        data={invoiceData}
      />
    );

    const pdfResult = {
      buffer,
      fileSize: buffer.length,
    };

    // Step 6: Upload to Supabase Storage
    const filename = generateFilename("invoice", orderData.orderNumber);
    const storagePath = generateStoragePath(
      organizationId,
      "invoice",
      filename
    );
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

    logger.info("Invoice PDF generated successfully", {
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
      documentType: "invoice" as const,
      storagePath,
      signedUrl: signedUrlData.signedUrl,
      filename,
      fileSize: pdfResult.fileSize,
      checksum,
    };
  },
});

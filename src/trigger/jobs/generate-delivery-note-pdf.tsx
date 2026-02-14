'use server'

/**
 * Generate Delivery Note PDF Task (Trigger.dev v3)
 *
 * Background task to generate PDF delivery notes for orders.
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
import { fetchShipmentSerialsByOrderLineItem } from "@/server/functions/documents/fetch-order-line-items-with-serials";
import { fetchOrganizationForDocument } from "@/server/functions/documents/organization-for-pdf";
import {
  renderPdfToBuffer,
  generateFilename,
  generateStoragePath,
  calculateChecksum,
} from "@/lib/documents";
import {
  DeliveryNotePdfDocument,
  type DeliveryNoteDocumentData,
  type DeliveryNoteLineItem,
} from "@/lib/documents/templates/operational";

// ============================================================================
// TYPES
// ============================================================================

export interface GenerateDeliveryNotePdfPayload {
  orderId: string;
  orderNumber: string;
  organizationId: string;
  customerId: string;
  /** Optional delivery date */
  deliveryDate?: string | null;
  /** Optional delivery time window */
  deliveryTimeWindow?: string | null;
  /** Optional carrier name */
  carrier?: string | null;
  /** Optional tracking number */
  trackingNumber?: string | null;
  /** Optional special instructions */
  specialInstructions?: string | null;
  /** Show checkbox column for picking */
  showCheckboxes?: boolean;
  /** Show weight/dimensions */
  showDimensions?: boolean;
  /** Optional: regenerate existing document */
  regenerate?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_BUCKET = "documents";

// ============================================================================
// TASK DEFINITION
// ============================================================================

/**
 * Generate Delivery Note PDF Task
 *
 * This task:
 * 1. Fetches order details with line items
 * 2. Fetches organization branding
 * 3. Fetches customer and shipping address
 * 4. Generates PDF using DeliveryNotePdfDocument template
 * 5. Uploads to Supabase Storage
 * 6. Returns document metadata
 */
export const generateDeliveryNotePdf = task({
  id: "generate-delivery-note-pdf",
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: GenerateDeliveryNotePdfPayload) => {
    const {
      orderId,
      orderNumber,
      organizationId,
      customerId,
      deliveryDate,
      carrier,
      trackingNumber,
      specialInstructions,
    } = payload;

    logger.info("Starting delivery note PDF generation", {
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
        customerNotes: orders.customerNotes,
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

    // Fetch line items (without pricing for delivery note)
    const lineItems = await db
      .select({
        id: orderLineItems.id,
        lineNumber: orderLineItems.lineNumber,
        sku: orderLineItems.sku,
        description: orderLineItems.description,
        quantity: orderLineItems.quantity,
        notes: orderLineItems.notes,
        allocatedSerialNumbers: orderLineItems.allocatedSerialNumbers,
      })
      .from(orderLineItems)
      .where(eq(orderLineItems.orderId, orderId))
      .orderBy(orderLineItems.lineNumber);

    const shipmentSerialMap = await fetchShipmentSerialsByOrderLineItem(orderId);
    const deliveryLineItems: DeliveryNoteLineItem[] = lineItems.map((item, index) => {
      const serialNumbers =
        shipmentSerialMap.get(item.id) ??
        (item.allocatedSerialNumbers as string[] | null) ??
        undefined;
      return {
        id: item.id,
        lineNumber: item.lineNumber ?? String(index + 1),
        sku: item.sku,
        description: item.description,
        quantity: Number(item.quantity) || 1,
        notes: item.notes,
        serialNumbers: serialNumbers && serialNumbers.length > 0 ? serialNumbers : undefined,
      };
    });

    // Step 2: Fetch organization details (with logo pre-fetched for PDF)
    const orgData = await fetchOrganizationForDocument(organizationId);

    // Step 3: Fetch customer details
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

    // Fetch shipping address (prefer shipping type, fallback to any primary)
    const [shippingAddress] = await db
      .select({
        street1: addresses.street1,
        street2: addresses.street2,
        city: addresses.city,
        state: addresses.state,
        postcode: addresses.postcode,
        country: addresses.country,
        notes: addresses.notes,
      })
      .from(addresses)
      .where(
        and(
          eq(addresses.customerId, customerId),
          eq(addresses.organizationId, organizationId),
          eq(addresses.type, "shipping")
        )
      )
      .limit(1);

    let customerShippingAddress = shippingAddress;
    if (!customerShippingAddress) {
      const [primaryAddress] = await db
        .select({
          street1: addresses.street1,
          street2: addresses.street2,
          city: addresses.city,
          state: addresses.state,
          postcode: addresses.postcode,
          country: addresses.country,
          notes: addresses.notes,
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
      customerShippingAddress = primaryAddress;
    }

    // Step 4: Build document data
    const documentNumber = `DN-${order.orderNumber}`;
    const issueDate = new Date();

    // DeliveryNoteDocumentData requires deliveryDate to be Date, not null
    // Use issueDate as fallback if deliveryDate not provided
    const effectiveDeliveryDate = deliveryDate ? new Date(deliveryDate) : issueDate;

    const deliveryNoteData: DeliveryNoteDocumentData = {
      documentNumber,
      orderNumber: order.orderNumber,
      issueDate,
      deliveryDate: effectiveDeliveryDate,
      // deliveryTimeWindow not in DeliveryNoteDocumentData schema - remove
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
      shippingAddress: customerShippingAddress
        ? {
            name: customer.name,
            addressLine1: customerShippingAddress.street1,
            addressLine2: customerShippingAddress.street2,
            city: customerShippingAddress.city,
            state: customerShippingAddress.state,
            postalCode: customerShippingAddress.postcode,
            country: customerShippingAddress.country,
          }
        : null,
      lineItems: deliveryLineItems,
      carrier: carrier || null,
      trackingNumber: trackingNumber || null,
      specialInstructions: specialInstructions || null,
      notes: order.customerNotes,
    };

    // Step 5: Render PDF to buffer
    // Note: showCheckboxes/showDimensions are not props - they're always rendered in the template
    const { buffer, size } = await renderPdfToBuffer(
      <DeliveryNotePdfDocument
        organization={orgData}
        data={deliveryNoteData}
      />
    );

    // Step 6: Upload to Supabase Storage
    const filename = generateFilename("delivery-note", order.orderNumber);
    const storagePath = generateStoragePath(
      organizationId,
      "delivery-note",
      filename
    );
    const checksum = await calculateChecksum(buffer);

    logger.info("Uploading PDF to storage", {
      filename,
      storagePath,
      fileSize: size,
    });

    const { error: uploadError } = await createAdminSupabase()
      .storage.from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    // Generate signed URL (valid for 1 year)
    const { data: signedUrlData, error: signedUrlError } =
      await createAdminSupabase()
        .storage.from(STORAGE_BUCKET)
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

    if (signedUrlError) {
      throw new Error(
        `Failed to generate signed URL: ${signedUrlError.message}`
      );
    }

    logger.info("Delivery note PDF generated successfully", {
      orderId,
      orderNumber,
      storagePath,
      fileSize: size,
    });

    return {
      success: true,
      orderId,
      orderNumber,
      organizationId,
      documentType: "delivery-note" as const,
      storagePath,
      signedUrl: signedUrlData.signedUrl,
      filename,
      fileSize: size,
      checksum,
    };
  },
});

// Legacy export for v2 naming convention
export const generateDeliveryNotePdfJob = generateDeliveryNotePdf;

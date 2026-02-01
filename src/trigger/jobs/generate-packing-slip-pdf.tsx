'use server'

/**
 * Generate Packing Slip PDF Task (Trigger.dev v3)
 *
 * Background task to generate PDF packing slips for orders.
 * Uses @react-pdf/renderer with organization branding.
 *
 * @see https://trigger.dev/docs/v3/tasks
 */
import { task, logger } from "@trigger.dev/sdk/v3";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  orders,
  orderLineItems,
  customers,
  addresses,
  organizations,
  type OrganizationBranding,
  type OrganizationAddress,
} from "drizzle/schema";
import {
  renderPdfToBuffer,
  generateFilename,
  generateStoragePath,
  calculateChecksum,
  generateQRCode,
  type DocumentOrganization,
} from "@/lib/documents";
import {
  PackingSlipPdfDocument,
  type PackingSlipDocumentData,
  type PackingSlipLineItem,
} from "@/lib/documents/templates/operational";

// ============================================================================
// TYPES
// ============================================================================

export interface GeneratePackingSlipPdfPayload {
  orderId: string;
  orderNumber: string;
  organizationId: string;
  customerId: string;
  /** Expected ship date */
  shipDate?: string | null;
  /** Shipping method */
  shippingMethod?: string | null;
  /** Carrier/shipping provider */
  carrier?: string | null;
  /** Special packing instructions */
  specialInstructions?: string | null;
  /** Number of packages */
  packageCount?: number | null;
  /** Total weight in kg */
  totalWeight?: number | null;
  /** Show warehouse location column */
  showLocation?: boolean;
  /** Optional: regenerate existing document */
  regenerate?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_BUCKET = "documents";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate the order lookup URL for QR code
 */
function getOrderLookupUrl(orderId: string): string {
  const baseUrl = process.env.APP_URL || "https://app.renoz.com.au";
  return `${baseUrl}/orders/${orderId}`;
}

// ============================================================================
// TASK DEFINITION
// ============================================================================

/**
 * Generate Packing Slip PDF Task
 *
 * This task:
 * 1. Fetches order details with line items
 * 2. Fetches organization branding
 * 3. Fetches customer and shipping address
 * 4. Generates QR code for order lookup
 * 5. Generates PDF using PackingSlipPdfDocument template
 * 6. Uploads to Supabase Storage
 * 7. Returns document metadata
 */
export const generatePackingSlipPdf = task({
  id: "generate-packing-slip-pdf",
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: GeneratePackingSlipPdfPayload) => {
    const {
      orderId,
      orderNumber,
      organizationId,
      customerId,
      shipDate,
      shippingMethod,
      carrier,
      specialInstructions,
      packageCount,
      totalWeight,
    } = payload;

    logger.info("Starting packing slip PDF generation", {
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

    // Fetch line items (without pricing for packing slip)
    const lineItems = await db
      .select({
        id: orderLineItems.id,
        lineNumber: orderLineItems.lineNumber,
        sku: orderLineItems.sku,
        description: orderLineItems.description,
        quantity: orderLineItems.quantity,
        notes: orderLineItems.notes,
      })
      .from(orderLineItems)
      .where(eq(orderLineItems.orderId, orderId))
      .orderBy(orderLineItems.lineNumber);

    const packingLineItems: PackingSlipLineItem[] = lineItems.map((item) => ({
      id: item.id,
      lineNumber: item.lineNumber,
      sku: item.sku,
      description: item.description,
      quantity: Number(item.quantity) || 1,
      notes: item.notes,
      // TODO: Add location from inventory when available
      location: null,
    }));

    // Step 2: Fetch organization details
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
      throw new Error(`Organization ${organizationId} not found`);
    }

    const address = org.address as OrganizationAddress | null;
    const branding = org.branding as OrganizationBranding | null;

    const orgData: DocumentOrganization = {
      id: org.id,
      name: org.name,
      email: org.email,
      phone: org.phone,
      website: org.website || branding?.websiteUrl,
      taxId: org.abn,
      currency: org.currency || "AUD",
      locale: org.locale || "en-AU",
      address: address
        ? {
            addressLine1: address.street1,
            addressLine2: address.street2,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
            country: address.country,
          }
        : undefined,
      branding: {
        logoUrl: branding?.logoUrl,
        primaryColor: branding?.primaryColor,
        secondaryColor: branding?.secondaryColor,
      },
    };

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

    // Step 4: Generate QR code for order lookup
    const orderLookupUrl = getOrderLookupUrl(orderId);
    const qrCodeDataUrl = await generateQRCode(orderLookupUrl, {
      width: 280, // Higher res for 70pt display
      margin: 0,
      errorCorrectionLevel: "M",
    });

    // Step 5: Build document data
    const documentNumber = `PS-${order.orderNumber}`;
    const issueDate = new Date();

    const packingSlipData: PackingSlipDocumentData = {
      documentNumber,
      orderNumber: order.orderNumber,
      issueDate,
      shipDate: shipDate ? new Date(shipDate) : null,
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
      lineItems: packingLineItems,
      shippingMethod: shippingMethod || null,
      carrier: carrier || null,
      specialInstructions: specialInstructions || null,
      notes: order.customerNotes,
      packageCount: packageCount || null,
      totalWeight: totalWeight || null,
    };

    // Step 6: Render PDF to buffer
    // Note: showLocation is not a prop - location column is always rendered in the template
    const { buffer, size } = await renderPdfToBuffer(
      <PackingSlipPdfDocument
        organization={orgData}
        data={packingSlipData}
        qrCodeDataUrl={qrCodeDataUrl}
      />
    );

    // Step 7: Upload to Supabase Storage
    const filename = generateFilename("packing-slip", order.orderNumber);
    const storagePath = generateStoragePath(
      organizationId,
      "packing-slip",
      filename
    );
    const checksum = await calculateChecksum(buffer);

    logger.info("Uploading PDF to storage", {
      filename,
      storagePath,
      fileSize: size,
    });

    const { error: uploadError } = await createAdminClient()
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
      await createAdminClient()
        .storage.from(STORAGE_BUCKET)
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

    if (signedUrlError) {
      throw new Error(
        `Failed to generate signed URL: ${signedUrlError.message}`
      );
    }

    logger.info("Packing slip PDF generated successfully", {
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
      documentType: "packing-slip" as const,
      storagePath,
      signedUrl: signedUrlData.signedUrl,
      filename,
      fileSize: size,
      checksum,
    };
  },
});

// Legacy export for v2 naming convention
export const generatePackingSlipPdfJob = generatePackingSlipPdf;

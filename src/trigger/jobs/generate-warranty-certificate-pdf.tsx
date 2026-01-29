'use server'

/**
 * Generate Warranty Certificate PDF Task (Trigger.dev v3)
 *
 * Background task to generate PDF warranty certificates.
 * Uses @react-pdf/renderer with organization branding.
 *
 * @see https://trigger.dev/docs/v3/tasks
 */
import { task, logger } from "@trigger.dev/sdk/v3";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  warranties,
  warrantyPolicies,
  customers,
  products,
  organizations,
  type OrganizationBranding,
  type OrganizationAddress,
} from "drizzle/schema";
import {
  renderPdfToBuffer,
  generateQRCode,
  WarrantyCertificatePdfDocument,
  generateFilename,
  generateStoragePath,
  calculateChecksum,
  type WarrantyCertificateData,
  type DocumentOrganization,
} from "@/lib/documents";

// ============================================================================
// TYPES
// ============================================================================

export interface GenerateWarrantyCertificatePdfPayload {
  warrantyId: string;
  warrantyNumber: string;
  organizationId: string;
  /** Optional: regenerate existing document */
  regenerate?: boolean;
  /** Optional: ID of existing document to regenerate */
  existingDocumentId?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_BUCKET = "documents";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate the public URL for viewing a warranty certificate
 */
function getWarrantyViewUrl(warrantyId: string): string {
  const baseUrl = process.env.APP_URL || "https://app.renoz.com.au";
  return `${baseUrl}/warranty/${warrantyId}`;
}

/**
 * Calculate warranty duration from dates
 */
function calculateWarrantyDuration(
  registrationDate: Date,
  expiryDate: Date
): string {
  const diffMs = expiryDate.getTime() - registrationDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const years = Math.floor(diffDays / 365);
  const months = Math.floor((diffDays % 365) / 30);

  if (years > 0 && months > 0) {
    return `${years} Year${years > 1 ? "s" : ""} ${months} Month${months > 1 ? "s" : ""}`;
  } else if (years > 0) {
    return `${years} Year${years > 1 ? "s" : ""}`;
  } else if (months > 0) {
    return `${months} Month${months > 1 ? "s" : ""}`;
  } else {
    return `${diffDays} Day${diffDays > 1 ? "s" : ""}`;
  }
}

// ============================================================================
// TASK DEFINITION
// ============================================================================

/**
 * Generate Warranty Certificate PDF Task
 *
 * This task:
 * 1. Fetches warranty details with related data
 * 2. Fetches organization branding
 * 3. Generates PDF using WarrantyCertificatePdfDocument template
 * 4. Uploads to Supabase Storage
 * 5. Updates warranty with certificate URL
 * 6. Returns document metadata
 */
export const generateWarrantyCertificatePdf = task({
  id: "generate-warranty-certificate-pdf",
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: GenerateWarrantyCertificatePdfPayload) => {
    const { warrantyId, warrantyNumber, organizationId } = payload;

    logger.info("Starting warranty certificate PDF generation", {
      warrantyId,
      warrantyNumber,
      organizationId,
    });

    // Step 1: Fetch warranty with related data
    const [warranty] = await db
      .select({
        id: warranties.id,
        warrantyNumber: warranties.warrantyNumber,
        organizationId: warranties.organizationId,
        customerId: warranties.customerId,
        productId: warranties.productId,
        productSerial: warranties.productSerial,
        registrationDate: warranties.registrationDate,
        expiryDate: warranties.expiryDate,
        status: warranties.status,
        currentCycleCount: warranties.currentCycleCount,
      })
      .from(warranties)
      .where(
        and(
          eq(warranties.id, warrantyId),
          eq(warranties.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!warranty) {
      throw new Error(`Warranty ${warrantyId} not found`);
    }

    // Fetch warranty policy
    const [policy] = await db
      .select({
        name: warrantyPolicies.name,
        durationMonths: warrantyPolicies.durationMonths,
        cycleLimit: warrantyPolicies.cycleLimit,
        terms: warrantyPolicies.terms,
        type: warrantyPolicies.type,
      })
      .from(warrantyPolicies)
      .innerJoin(
        warranties,
        eq(warranties.warrantyPolicyId, warrantyPolicies.id)
      )
      .where(eq(warranties.id, warrantyId))
      .limit(1);

    // Step 2: Fetch customer details
    const [customer] = await db
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
      })
      .from(customers)
      .where(
        and(
          eq(customers.id, warranty.customerId),
          eq(customers.organizationId, organizationId),
          sql`${customers.deletedAt} IS NULL`
        )
      )
      .limit(1);

    if (!customer) {
      throw new Error(`Customer ${warranty.customerId} not found`);
    }

    // Step 3: Fetch product details
    const [product] = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
      })
      .from(products)
      .where(
        and(
          eq(products.id, warranty.productId),
          eq(products.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!product) {
      throw new Error(`Product ${warranty.productId} not found`);
    }

    // Step 4: Fetch organization details
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
        settings: organizations.settings,
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

    // Step 5: Generate QR code for verification
    const warrantyUrl = getWarrantyViewUrl(warrantyId);
    const qrCodeDataUrl = await generateQRCode(warrantyUrl, {
      width: 240,
      margin: 0,
      errorCorrectionLevel: "M",
    });

    // Step 6: Build certificate data and render PDF
    const registrationDate = new Date(warranty.registrationDate);
    const expiryDate = new Date(warranty.expiryDate);

    // Extract coverage type from policy type
    const getCoverageType = (type?: string | null) => {
      switch (type) {
        case "battery_performance":
          return "Battery Performance";
        case "inverter_manufacturer":
          return "Manufacturer Warranty";
        case "installation_workmanship":
          return "Parts & Labor";
        default:
          return undefined;
      }
    };

    // Extract terms as string from JSONB
    const getTermsString = (terms: unknown): string | undefined => {
      if (!terms || typeof terms !== "object") return undefined;
      const termsObj = terms as Record<string, unknown>;
      const coverage = termsObj.coverage as string[] | undefined;
      const exclusions = termsObj.exclusions as string[] | undefined;
      const parts: string[] = [];
      if (coverage && coverage.length > 0) {
        parts.push(`Coverage: ${coverage.join(", ")}`);
      }
      if (exclusions && exclusions.length > 0) {
        parts.push(`Exclusions: ${exclusions.join(", ")}`);
      }
      return parts.length > 0 ? parts.join(". ") : undefined;
    };

    const certificateData: WarrantyCertificateData = {
      warrantyNumber: warranty.warrantyNumber,
      customerName: customer.name,
      productName: product.name,
      productSerial: warranty.productSerial,
      registrationDate,
      expiryDate,
      warrantyDuration: calculateWarrantyDuration(registrationDate, expiryDate),
      coverageType: getCoverageType(policy?.type),
      terms: getTermsString(policy?.terms),
      status: warranty.status,
      cycleLimit: policy?.cycleLimit,
      currentCycleCount: warranty.currentCycleCount,
    };

    // Render PDF to buffer
    const pdfResult = await renderPdfToBuffer(
      <WarrantyCertificatePdfDocument
        organization={orgData}
        data={certificateData}
        qrCodeDataUrl={qrCodeDataUrl}
      />
    );

    // Step 7: Upload to Supabase Storage
    const filename = generateFilename(
      "warranty-certificate",
      warranty.warrantyNumber
    );
    const storagePath = generateStoragePath(
      organizationId,
      "warranty-certificate",
      filename
    );
    const checksum = calculateChecksum(pdfResult.buffer);

    logger.info("Uploading PDF to storage", {
      filename,
      storagePath,
      fileSize: pdfResult.size,
    });

    // Upload to Supabase Storage
    const { error: uploadError } = await createAdminClient()
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
      await createAdminClient()
        .storage.from(STORAGE_BUCKET)
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 year

    if (signedUrlError) {
      throw new Error(
        `Failed to generate signed URL: ${signedUrlError.message}`
      );
    }

    // Step 8: Update warranty with certificate URL
    await db
      .update(warranties)
      .set({
        certificateUrl: signedUrlData.signedUrl,
        updatedAt: new Date(),
      })
      .where(eq(warranties.id, warrantyId));

    logger.info("Warranty certificate PDF generated successfully", {
      warrantyId,
      warrantyNumber,
      storagePath,
      fileSize: pdfResult.size,
    });

    // Return task result
    return {
      success: true,
      warrantyId,
      warrantyNumber,
      organizationId,
      documentType: "warranty-certificate" as const,
      storagePath,
      signedUrl: signedUrlData.signedUrl,
      filename,
      fileSize: pdfResult.size,
      checksum,
    };
  },
});

// ============================================================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================================================

/** @deprecated Use generateWarrantyCertificatePdf instead */
export const generateWarrantyCertificatePdfJob = generateWarrantyCertificatePdf;

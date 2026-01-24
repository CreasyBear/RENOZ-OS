/**
 * Warranty Certificate Server Functions
 *
 * Server-side operations for generating, storing, and retrieving warranty certificates.
 *
 * Architecture:
 * 1. generateWarrantyCertificate: Fetches warranty data, renders HTML template, generates PDF
 * 2. Uploads PDF to R2 storage (warranty-certificates bucket/folder)
 * 3. Updates warranty.certificateUrl with the public URL
 *
 * Note: This implementation uses server-side HTML rendering. PDF generation requires
 * either @react-pdf/renderer or puppeteer. If neither is available, it returns
 * the HTML as a fallback (see note in progress.txt).
 *
 * @see src/components/domain/warranty/warranty-certificate-template.tsx
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-004b
 */

import { eq, and } from 'drizzle-orm';
import { renderToStaticMarkup } from 'react-dom/server';
import * as React from 'react';
import { db } from '@/lib/db';
import {
  warranties,
  warrantyPolicies,
  slaConfigurations,
  customers,
  products,
  categories,
  organizations,
  addresses,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { generatePresignedUploadUrl, generatePresignedDownloadUrl } from '@/lib/storage';
import {
  generateWarrantyCertificateSchema,
  getWarrantyCertificateSchema,
  regenerateWarrantyCertificateSchema,
  type CertificateGenerationResult,
  type GetCertificateResult,
} from '@/lib/schemas/warranty/certificates';
import { typedGetFn, typedPostFn } from '@/lib/server/typed-server-fn';
import {
  WarrantyCertificateTemplate,
  type WarrantyCertificateProps,
  type WarrantyCoverageDetails,
} from '@/components/domain/warranty/warranty-certificate-template';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Storage path prefix for warranty certificates */
const CERTIFICATE_STORAGE_PREFIX = 'warranty-certificates';

/** Base URL for warranty verification (used in QR code) */
const APP_BASE_URL = process.env.VITE_APP_URL ?? 'https://app.renoz.energy';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate storage key for a warranty certificate.
 * Format: warranty-certificates/{orgId}/{warrantyNumber}.pdf
 */
function generateCertificateStorageKey(organizationId: string, warrantyNumber: string): string {
  // Sanitize warranty number for filesystem safety
  const sanitizedNumber = warrantyNumber.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
  return `${CERTIFICATE_STORAGE_PREFIX}/${organizationId}/${sanitizedNumber}.pdf`;
}

/**
 * Generate certificate filename for download.
 */
function generateCertificateFilename(warrantyNumber: string): string {
  return `warranty-certificate-${warrantyNumber}.pdf`;
}

/**
 * Build customer address for certificate template.
 */
function buildCustomerAddress(
  street1: string,
  street2: string | null,
  city: string,
  state: string | null,
  postcode: string,
  country: string
): WarrantyCertificateProps['customerAddress'] | undefined {
  if (!street1 && !city) {
    return undefined;
  }

  return {
    street: [street1, street2].filter(Boolean).join(', '),
    suburb: city ?? undefined,
    state: state ?? undefined,
    postcode: postcode ?? undefined,
    country: country ?? undefined,
  };
}

/**
 * Parse warranty policy terms to coverage details.
 */
function parseTermsToCoverage(
  terms: Record<string, unknown> | null
): WarrantyCoverageDetails | undefined {
  if (!terms) return undefined;

  return {
    coverage: Array.isArray(terms.coverage) ? (terms.coverage as string[]) : undefined,
    exclusions: Array.isArray(terms.exclusions) ? (terms.exclusions as string[]) : undefined,
    claimRequirements: Array.isArray(terms.claimRequirements)
      ? (terms.claimRequirements as string[])
      : undefined,
    transferable: typeof terms.transferable === 'boolean' ? terms.transferable : undefined,
    proratedAfterMonths:
      typeof terms.proratedAfterMonths === 'number' ? terms.proratedAfterMonths : undefined,
  };
}

/**
 * Render the warranty certificate to HTML.
 */
function renderCertificateHtml(props: WarrantyCertificateProps): string {
  const element = React.createElement(WarrantyCertificateTemplate, props);
  return '<!DOCTYPE html>\n' + renderToStaticMarkup(element);
}

/**
 * Upload HTML content to R2 storage.
 * Returns the public URL of the uploaded file.
 *
 * Note: This uploads HTML directly. For actual PDF generation, you would:
 * 1. Use puppeteer/playwright to convert HTML to PDF buffer
 * 2. Upload the PDF buffer instead
 *
 * This placeholder implementation uploads the HTML so the feature is functional
 * while PDF rendering can be added later.
 */
async function uploadCertificateToStorage(
  organizationId: string,
  warrantyNumber: string,
  htmlContent: string
): Promise<{ storageKey: string; publicUrl: string }> {
  const storageKey = generateCertificateStorageKey(organizationId, warrantyNumber);

  // Generate presigned upload URL
  // Note: Using text/html as mime type since we're uploading HTML
  // When PDF generation is added, this should be application/pdf
  const { uploadUrl } = await generatePresignedUploadUrl({
    key: storageKey,
    mimeType: 'text/html', // TODO: Change to 'application/pdf' when PDF generation is implemented
  });

  // Upload the HTML content
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'text/html',
    },
    body: htmlContent,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload certificate: ${response.statusText}`);
  }

  // Generate presigned download URL for the uploaded file
  const { downloadUrl } = await generatePresignedDownloadUrl({
    key: storageKey,
  });

  return {
    storageKey,
    publicUrl: downloadUrl,
  };
}

// ============================================================================
// SERVER FUNCTIONS
// ============================================================================

/**
 * Generate a warranty certificate for a warranty.
 *
 * This function:
 * 1. Fetches warranty with customer, product, policy data
 * 2. Renders the certificate template to HTML
 * 3. Uploads to R2 storage
 * 4. Updates warranty.certificateUrl with the public URL
 * 5. Returns the certificate URL
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-004b
 */
export const generateWarrantyCertificate = typedPostFn(
  generateWarrantyCertificateSchema,
  async ({ data }): Promise<CertificateGenerationResult> => {
    const ctx = await withAuth();
    const { warrantyId, forceRegenerate } = data;

    try {
      // 1. Fetch warranty with all related data
      const warrantyData = await db
        .select({
          warranty: warranties,
          customer: customers,
          product: products,
          category: categories,
          policy: warrantyPolicies,
          slaConfig: slaConfigurations,
          organization: organizations,
          address: addresses,
        })
        .from(warranties)
        .innerJoin(customers, eq(warranties.customerId, customers.id))
        .innerJoin(products, eq(warranties.productId, products.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .innerJoin(warrantyPolicies, eq(warranties.warrantyPolicyId, warrantyPolicies.id))
        .leftJoin(slaConfigurations, eq(warrantyPolicies.slaConfigurationId, slaConfigurations.id))
        .innerJoin(organizations, eq(warranties.organizationId, organizations.id))
        // Left join to get the customer's primary address (if exists)
        .leftJoin(
          addresses,
          and(eq(addresses.customerId, customers.id), eq(addresses.isPrimary, true))
        )
        .where(
          and(eq(warranties.id, warrantyId), eq(warranties.organizationId, ctx.organizationId))
        )
        .limit(1);

      if (warrantyData.length === 0) {
        return {
          success: false,
          certificateUrl: null,
          filename: '',
          wasRegenerated: false,
          generatedAt: new Date().toISOString(),
          error: 'Warranty not found',
        };
      }

      const { warranty, customer, product, category, policy, slaConfig, organization, address } =
        warrantyData[0];

      // Check if certificate already exists and regeneration not forced
      if (warranty.certificateUrl && !forceRegenerate) {
        return {
          success: true,
          certificateUrl: warranty.certificateUrl,
          filename: generateCertificateFilename(warranty.warrantyNumber),
          wasRegenerated: false,
          generatedAt: new Date().toISOString(),
        };
      }

      // 2. Build certificate props
      const verificationUrl = `${APP_BASE_URL}/verify/${warranty.warrantyNumber}`;

      const certificateProps: WarrantyCertificateProps = {
        // Certificate identification
        warrantyNumber: warranty.warrantyNumber,
        registrationDate: warranty.registrationDate,

        // Customer information
        customerName: customer.name,
        customerAddress: address
          ? buildCustomerAddress(
              address.street1,
              address.street2,
              address.city,
              address.state,
              address.postcode,
              address.country
            )
          : undefined,
        customerEmail: customer.email ?? undefined,
        customerPhone: customer.phone ?? undefined,

        // Product information
        productName: product.name,
        productSerial: warranty.productSerial ?? undefined,
        productCategory: category?.name ?? undefined,
        productSku: product.sku ?? undefined,

        // Policy details
        policyType: policy.type as WarrantyCertificateProps['policyType'],
        policyName: policy.name,
        durationMonths: policy.durationMonths,
        cycleLimit: policy.cycleLimit ?? undefined,
        expiryDate: warranty.expiryDate,
        coverageDetails: parseTermsToCoverage(policy.terms as Record<string, unknown> | null),

        // SLA information
        slaResponseHours: slaConfig?.responseTargetValue ?? 24,
        slaResolutionDays: slaConfig?.resolutionTargetValue ?? 5,

        // Verification
        verificationUrl,

        // Branding (from organization settings if available)
        companyName: organization.name,
        // TODO: Add organization logo, support email, etc. when available
      };

      // 3. Render certificate to HTML
      const htmlContent = renderCertificateHtml(certificateProps);

      // 4. Upload to storage
      // Note: This uploads HTML. PDF generation can be added here when library is available.
      // TODO: Implement actual PDF generation using puppeteer or @react-pdf/renderer
      const { publicUrl } = await uploadCertificateToStorage(
        ctx.organizationId,
        warranty.warrantyNumber,
        htmlContent
      );

      // 5. Update warranty with certificate URL
      await db
        .update(warranties)
        .set({
          certificateUrl: publicUrl,
          updatedBy: ctx.user.id,
        })
        .where(eq(warranties.id, warrantyId));

      const filename = generateCertificateFilename(warranty.warrantyNumber);

      return {
        success: true,
        certificateUrl: publicUrl,
        filename,
        wasRegenerated: !!warranty.certificateUrl,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[warranty-certificate] Generation failed:', error);
      return {
        success: false,
        certificateUrl: null,
        filename: '',
        wasRegenerated: false,
        generatedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Certificate generation failed',
      };
    }
  }
);

/**
 * Get existing warranty certificate URL for a warranty.
 *
 * Returns the certificate URL if it exists, or null if not generated yet.
 * Does NOT trigger generation - use generateWarrantyCertificate for that.
 */
export const getWarrantyCertificate = typedGetFn(
  getWarrantyCertificateSchema,
  async ({ data }): Promise<GetCertificateResult> => {
    const ctx = await withAuth();
    const { warrantyId } = data;

    // Fetch warranty with basic info for display
    const warrantyData = await db
      .select({
        warranty: {
          id: warranties.id,
          warrantyNumber: warranties.warrantyNumber,
          certificateUrl: warranties.certificateUrl,
          expiryDate: warranties.expiryDate,
        },
        customer: {
          name: customers.name,
        },
        product: {
          name: products.name,
        },
      })
      .from(warranties)
      .innerJoin(customers, eq(warranties.customerId, customers.id))
      .innerJoin(products, eq(warranties.productId, products.id))
      .where(and(eq(warranties.id, warrantyId), eq(warranties.organizationId, ctx.organizationId)))
      .limit(1);

    if (warrantyData.length === 0) {
      return {
        exists: false,
        certificateUrl: null,
        warranty: null,
      };
    }

    const { warranty, customer, product } = warrantyData[0];

    return {
      exists: !!warranty.certificateUrl,
      certificateUrl: warranty.certificateUrl,
      warranty: {
        id: warranty.id,
        warrantyNumber: warranty.warrantyNumber,
        customerName: customer.name,
        productName: product.name,
        expiryDate: warranty.expiryDate.toISOString(),
      },
    };
  }
);

/**
 * Regenerate a warranty certificate.
 *
 * Used when warranty data has changed (e.g., ownership transfer, policy update).
 * Always generates a new certificate regardless of existing one.
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-004b
 */
export const regenerateWarrantyCertificate = typedPostFn(
  regenerateWarrantyCertificateSchema,
  async ({ data }): Promise<CertificateGenerationResult> => {
    // Auth check - ensures user has access (auth context used for audit logging)
    const ctx = await withAuth();
    const { warrantyId, reason } = data;

    // Log regeneration reason for audit (includes user info from auth context)
    console.log(
      `[warranty-certificate] Regenerating certificate for warranty ${warrantyId}` +
        ` by user ${ctx.user.id}${reason ? `: ${reason}` : ''}`
    );

    // Delegate to generateWarrantyCertificate with forceRegenerate=true
    return generateWarrantyCertificate({
      data: {
        warrantyId,
        forceRegenerate: true,
      },
    });
  }
);

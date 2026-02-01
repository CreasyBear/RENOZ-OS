'use server'

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
 * @see src/components/domain/warranty/templates/warranty-certificate-template.tsx
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-004b
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, asc } from 'drizzle-orm';
import * as React from 'react';
import { db } from '@/lib/db';
import {
  warranties,
  warrantyItems,
  warrantyPolicies,
  slaConfigurations,
  customers,
  products,
  categories,
  organizations,
  addresses,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { uploadFile, createSignedUrl } from '@/lib/storage';
import {
  generateWarrantyCertificateSchema,
  getWarrantyCertificateSchema,
  regenerateWarrantyCertificateSchema,
  type CertificateGenerationResult,
  type GetCertificateResult,
} from '@/lib/schemas/warranty/certificates';

// PDF Generation imports
import {
  renderPdfToBuffer,
  WarrantyCertificatePdfDocument,
  type WarrantyCertificateData,
  type DocumentOrganization,
} from '@/lib/documents';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Storage path prefix for warranty certificates */
const CERTIFICATE_STORAGE_PREFIX = 'warranty-certificates';

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
 * Build customer address string.
 */
function buildCustomerAddress(
  street1: string,
  street2: string | null,
  city: string,
  state: string | null,
  postcode: string,
  country: string
): string | undefined {
  if (!street1 && !city) {
    return undefined;
  }

  const parts = [
    [street1, street2].filter(Boolean).join(', '),
    city,
    [state, postcode].filter(Boolean).join(' '),
    country,
  ].filter(Boolean);

  return parts.join(', ');
}





/**
 * Upload PDF certificate to Supabase Storage.
 * Returns the public URL of the uploaded file.
 */
async function uploadCertificateToStorage(
  organizationId: string,
  warrantyNumber: string,
  pdfBuffer: Buffer
): Promise<{ storageKey: string; publicUrl: string }> {
  const storageKey = generateCertificateStorageKey(organizationId, warrantyNumber);

  // Upload PDF to Supabase Storage
  // Convert Buffer to ArrayBuffer for upload
  const arrayBuffer = pdfBuffer.buffer.slice(
    pdfBuffer.byteOffset,
    pdfBuffer.byteOffset + pdfBuffer.byteLength
  ) as ArrayBuffer;
  await uploadFile({
    path: storageKey,
    fileBody: arrayBuffer,
    contentType: 'application/pdf',
    bucket: 'warranty-certificates',
  });

  // Generate signed download URL for the uploaded file
  const { signedUrl } = await createSignedUrl({
    path: storageKey,
    bucket: 'warranty-certificates',
    expiresIn: 86400, // 24 hours
  });

  return {
    storageKey,
    publicUrl: signedUrl,
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
export const generateWarrantyCertificate = createServerFn({ method: 'POST' })
  .inputValidator(generateWarrantyCertificateSchema)
  .handler(async ({ data }): Promise<CertificateGenerationResult> => {
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

      const { warranty, customer, product, policy, organization, address } =
        warrantyData[0];

      const items = await db
        .select({
          id: warrantyItems.id,
          productId: warrantyItems.productId,
          productName: products.name,
          productSku: products.sku,
          productSerial: warrantyItems.productSerial,
          warrantyStartDate: warrantyItems.warrantyStartDate,
          warrantyEndDate: warrantyItems.warrantyEndDate,
          warrantyPeriodMonths: warrantyItems.warrantyPeriodMonths,
          installationNotes: warrantyItems.installationNotes,
        })
        .from(warrantyItems)
        .innerJoin(products, eq(warrantyItems.productId, products.id))
        .where(
          and(
            eq(warrantyItems.warrantyId, warrantyId),
            eq(warrantyItems.organizationId, ctx.organizationId)
          )
        )
        .orderBy(asc(warrantyItems.warrantyStartDate));

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

      // 2. Build PDF certificate data
      const certificateData: WarrantyCertificateData = {
        warrantyNumber: warranty.warrantyNumber,
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
        productName: product.name,
        productSerial: warranty.productSerial,
        items: items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          productSerial: item.productSerial,
          warrantyStartDate: item.warrantyStartDate,
          warrantyEndDate: item.warrantyEndDate,
          warrantyPeriodMonths: item.warrantyPeriodMonths,
          installationNotes: item.installationNotes,
        })),
        registrationDate: new Date(warranty.registrationDate),
        expiryDate: new Date(warranty.expiryDate),
        warrantyDuration: `${policy.durationMonths} Months`,
        coverageType: policy.type,
        terms: policy.terms ? JSON.stringify(policy.terms) : undefined,
        status: (warranty.status as WarrantyCertificateData['status']) || 'active',
      };

      // Build organization data for branding
      const orgData: DocumentOrganization = {
        id: organization.id,
        name: organization.name,
        email: organization.email,
        phone: organization.phone,
        taxId: organization.abn,
        currency: 'AUD',
        locale: 'en-AU',
      };

      // 3. Render certificate to PDF
      const { buffer: pdfBuffer } = await renderPdfToBuffer(
        React.createElement(WarrantyCertificatePdfDocument, {
          organization: orgData,
          data: certificateData,
        }) as React.ReactElement<import('@react-pdf/renderer').DocumentProps>
      );

      // 4. Upload to storage
      const { publicUrl } = await uploadCertificateToStorage(
        ctx.organizationId,
        warranty.warrantyNumber,
        pdfBuffer
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
  });

/**
 * Get existing warranty certificate URL for a warranty.
 *
 * Returns the certificate URL if it exists, or null if not generated yet.
 * Does NOT trigger generation - use generateWarrantyCertificate for that.
 */
export const getWarrantyCertificate = createServerFn({ method: 'GET' })
  .inputValidator(getWarrantyCertificateSchema)
  .handler(async ({ data }): Promise<GetCertificateResult> => {
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
  });

/**
 * Regenerate a warranty certificate.
 *
 * Used when warranty data has changed (e.g., ownership transfer, policy update).
 * Always generates a new certificate regardless of existing one.
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-004b
 */
export const regenerateWarrantyCertificate = createServerFn({ method: 'POST' })
  .inputValidator(regenerateWarrantyCertificateSchema)
  .handler(async ({ data }): Promise<CertificateGenerationResult> => {
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
  });

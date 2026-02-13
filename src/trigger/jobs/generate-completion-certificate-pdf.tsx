'use server'

/**
 * Generate Completion Certificate PDF Task (Trigger.dev v3)
 *
 * Background task to generate PDF job completion certificates.
 * Uses @react-pdf/renderer with organization branding.
 *
 * @see https://trigger.dev/docs/v3/tasks
 */
import { task, logger } from "@trigger.dev/sdk/v3";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  jobAssignments,
  customers,
  addresses,
  orders,
  users,
} from "drizzle/schema";
import { fetchOrganizationForDocument } from "@/server/functions/documents/organization-for-pdf";
import {
  renderPdfToBuffer,
  generateQRCode,
  CompletionCertificatePdfDocument,
  generateFilename,
  generateStoragePath,
  calculateChecksum,
  type CompletionCertificateData,
} from "@/lib/documents";

// ============================================================================
// TYPES
// ============================================================================

export interface GenerateCompletionCertificatePdfPayload {
  jobAssignmentId: string;
  jobNumber: string;
  organizationId: string;
  /** Optional: Work items performed (if not fetched from tasks) */
  workPerformed?: string[];
  /** Optional: regenerate existing document */
  regenerate?: boolean;
  /** Optional: ID of existing document to regenerate */
  existingDocumentId?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_BUCKET = "documents";

import { buildDocumentViewUrl } from "@/lib/documents/urls";

/**
 * Format address as single string
 */
function formatAddress(address: {
  street1?: string | null;
  street2?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  country?: string | null;
}): string {
  const parts = [
    address.street1,
    address.street2,
    [address.city, address.state, address.postcode].filter(Boolean).join(" "),
    address.country,
  ].filter(Boolean);

  return parts.join(", ");
}

// ============================================================================
// TASK DEFINITION
// ============================================================================

/**
 * Generate Completion Certificate PDF Task
 *
 * This task:
 * 1. Fetches job assignment details
 * 2. Fetches customer and address information
 * 3. Fetches organization branding
 * 4. Generates PDF using CompletionCertificatePdfDocument template
 * 5. Uploads to Supabase Storage
 * 6. Returns document metadata
 */
export const generateCompletionCertificatePdf = task({
  id: "generate-completion-certificate-pdf",
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: GenerateCompletionCertificatePdfPayload) => {
    const { jobAssignmentId, jobNumber, organizationId, workPerformed } =
      payload;

    logger.info("Starting completion certificate PDF generation", {
      jobAssignmentId,
      jobNumber,
      organizationId,
    });

    // Step 1: Fetch job assignment with related data
    const [job] = await db
      .select({
        id: jobAssignments.id,
        jobNumber: jobAssignments.jobNumber,
        title: jobAssignments.title,
        description: jobAssignments.description,
        jobType: jobAssignments.jobType,
        scheduledDate: jobAssignments.scheduledDate,
        completedAt: jobAssignments.completedAt,
        customerId: jobAssignments.customerId,
        installerId: jobAssignments.installerId,
        orderId: jobAssignments.orderId,
        signatureUrl: jobAssignments.signatureUrl,
        signedByName: jobAssignments.signedByName,
        status: jobAssignments.status,
      })
      .from(jobAssignments)
      .where(
        and(
          eq(jobAssignments.id, jobAssignmentId),
          eq(jobAssignments.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!job) {
      throw new Error(`Job assignment ${jobAssignmentId} not found`);
    }

    // Verify job is completed
    if (job.status !== "completed") {
      throw new Error(
        `Job ${jobAssignmentId} is not completed (status: ${job.status})`
      );
    }

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
          eq(customers.id, job.customerId),
          eq(customers.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!customer) {
      throw new Error(`Customer ${job.customerId} not found`);
    }

    // Step 3: Fetch job site address (primary address for customer)
    const [siteAddress] = await db
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
          eq(addresses.customerId, job.customerId),
          eq(addresses.organizationId, organizationId),
          eq(addresses.isPrimary, true)
        )
      )
      .limit(1);

    // Step 4: Fetch technician/installer details
    const [installer] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, job.installerId))
      .limit(1);

    if (!installer) {
      throw new Error(`Installer ${job.installerId} not found`);
    }

    // Step 5: Fetch order number if job is linked to order
    let orderNumber: string | null = null;
    if (job.orderId) {
      const [order] = await db
        .select({
          orderNumber: orders.orderNumber,
        })
        .from(orders)
        .where(eq(orders.id, job.orderId))
        .limit(1);
      orderNumber = order?.orderNumber || null;
    }

    // Step 6: Fetch organization details (with logo pre-fetched for PDF)
    const orgData = await fetchOrganizationForDocument(organizationId);

    // Step 7: Generate QR code for verification
    const jobUrl = buildDocumentViewUrl("job", jobAssignmentId);
    const qrCodeDataUrl = await generateQRCode(jobUrl, {
      width: 240,
      margin: 0,
      errorCorrectionLevel: "M",
    });

    // Step 8: Build certificate data and render PDF
    const scheduledDate = new Date(job.scheduledDate);
    const completedAt = job.completedAt ? new Date(job.completedAt) : new Date();

    const certificateData: CompletionCertificateData = {
      jobNumber: job.jobNumber,
      jobTitle: job.title,
      jobDescription: job.description || undefined,
      customerName: customer.name,
      jobAddress: siteAddress ? formatAddress(siteAddress) : undefined,
      scheduledDate,
      completedAt,
      technicianName: installer.name || "Technician",
      workPerformed: workPerformed || undefined,
      customerSignatureUrl: job.signatureUrl,
      signedByName: job.signedByName,
      orderNumber,
      jobType: job.jobType,
    };

    // Render PDF to buffer
    const pdfResult = await renderPdfToBuffer(
      <CompletionCertificatePdfDocument
        organization={orgData}
        data={certificateData}
        qrCodeDataUrl={qrCodeDataUrl}
      />
    );

    // Step 9: Upload to Supabase Storage
    const filename = generateFilename("completion-certificate", job.jobNumber);
    const storagePath = generateStoragePath(
      organizationId,
      "completion-certificate",
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

    logger.info("Completion certificate PDF generated successfully", {
      jobAssignmentId,
      jobNumber,
      storagePath,
      fileSize: pdfResult.size,
    });

    // Return task result
    return {
      success: true,
      jobAssignmentId,
      jobNumber,
      organizationId,
      documentType: "completion-certificate" as const,
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

/** @deprecated Use generateCompletionCertificatePdf instead */
export const generateCompletionCertificatePdfJob =
  generateCompletionCertificatePdf;

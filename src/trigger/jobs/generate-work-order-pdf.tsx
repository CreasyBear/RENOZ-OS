/**
 * Generate Work Order PDF Task (Trigger.dev v3)
 *
 * Background task to generate PDF work orders.
 * Uses @react-pdf/renderer with organization branding.
 *
 * Note: This task accepts all work order data in the payload rather than
 * fetching from the database, as the work order domain schema may vary
 * between implementations.
 *
 * @see https://trigger.dev/docs/v3/tasks
 */
import { task, logger } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  organizations,
  type OrganizationBranding,
  type OrganizationAddress,
} from "drizzle/schema";
import {
  renderPdfToBuffer,
  generateFilename,
  generateStoragePath,
  calculateChecksum,
  type DocumentOrganization,
} from "@/lib/documents";
import {
  WorkOrderPdfDocument,
  type WorkOrderDocumentData,
  type WorkOrderChecklistItem,
  type WorkOrderMaterial,
  type WorkOrderPriority,
} from "@/lib/documents/templates/operational";

// ============================================================================
// TYPES
// ============================================================================

export interface GenerateWorkOrderPdfPayload {
  /** Unique identifier for the work order */
  workOrderId: string;
  /** Work order number for display */
  workOrderNumber: string;
  /** Organization ID for branding */
  organizationId: string;
  /** Work order document data */
  data: {
    /** Work order title */
    title: string;
    /** Detailed description */
    description?: string | null;
    /** Related order number (optional) */
    orderNumber?: string | null;
    /** Scheduled date (ISO string) */
    scheduledDate?: string | null;
    /** Time window (e.g., "9:00 AM - 12:00 PM") */
    scheduledTimeWindow?: string | null;
    /** Estimated duration (e.g., "2-3 hours") */
    estimatedDuration?: string | null;
    /** Priority level */
    priority?: WorkOrderPriority | null;
    /** Job type/category */
    jobType?: string | null;
    /** Customer information */
    customer: {
      id: string;
      name: string;
      email?: string | null;
      phone?: string | null;
    };
    /** Site address */
    siteAddress?: {
      name?: string | null;
      addressLine1?: string | null;
      addressLine2?: string | null;
      city?: string | null;
      state?: string | null;
      postalCode?: string | null;
      country?: string | null;
      accessInstructions?: string | null;
    } | null;
    /** Assigned technician */
    assignedTechnician?: {
      id: string;
      name: string;
      phone?: string | null;
      email?: string | null;
    } | null;
    /** Checklist items */
    checklist?: WorkOrderChecklistItem[];
    /** Required materials */
    materials?: WorkOrderMaterial[];
    /** Safety notes */
    safetyNotes?: string | null;
    /** Technician notes */
    technicianNotes?: string | null;
    /** Internal notes */
    internalNotes?: string | null;
  };
  /** Show checklist section */
  showChecklist?: boolean;
  /** Show materials section */
  showMaterials?: boolean;
  /** Show customer signature section */
  showCustomerSignature?: boolean;
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
 * Generate Work Order PDF Task
 *
 * This task:
 * 1. Fetches organization branding
 * 2. Builds work order document from payload data
 * 3. Generates PDF using WorkOrderPdfDocument template
 * 4. Uploads to Supabase Storage
 * 5. Returns document metadata
 */
export const generateWorkOrderPdf = task({
  id: "generate-work-order-pdf",
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: GenerateWorkOrderPdfPayload) => {
    const {
      workOrderId,
      workOrderNumber,
      organizationId,
      data,
      showChecklist = true,
      showMaterials = true,
      showCustomerSignature = true,
    } = payload;

    logger.info("Starting work order PDF generation", {
      workOrderId,
      workOrderNumber,
      organizationId,
    });

    // Step 1: Fetch organization details for branding
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

    // Step 2: Build work order document data
    const documentNumber = workOrderNumber.startsWith("WO-")
      ? workOrderNumber
      : `WO-${workOrderNumber}`;
    const issueDate = new Date();

    const workOrderData: WorkOrderDocumentData = {
      documentNumber,
      orderNumber: data.orderNumber || null,
      title: data.title,
      description: data.description,
      issueDate,
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
      scheduledTimeWindow: data.scheduledTimeWindow,
      estimatedDuration: data.estimatedDuration,
      priority: data.priority,
      jobType: data.jobType,
      customer: data.customer,
      siteAddress: data.siteAddress,
      assignedTechnician: data.assignedTechnician,
      checklist: data.checklist || [],
      materials: data.materials || [],
      safetyNotes: data.safetyNotes,
      technicianNotes: data.technicianNotes,
      internalNotes: data.internalNotes,
    };

    // Step 3: Render PDF to buffer
    const { buffer, size } = await renderPdfToBuffer(
      <WorkOrderPdfDocument
        organization={orgData}
        data={workOrderData}
        showChecklist={showChecklist}
        showMaterials={showMaterials}
        showCustomerSignature={showCustomerSignature}
      />
    );

    // Step 4: Upload to Supabase Storage
    const filename = generateFilename("work-order", workOrderNumber);
    const storagePath = generateStoragePath(
      organizationId,
      "work-order",
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

    logger.info("Work order PDF generated successfully", {
      workOrderId,
      workOrderNumber,
      storagePath,
      fileSize: size,
    });

    return {
      success: true,
      workOrderId,
      workOrderNumber,
      organizationId,
      documentType: "work-order" as const,
      storagePath,
      signedUrl: signedUrlData.signedUrl,
      filename,
      fileSize: size,
      checksum,
    };
  },
});

// Legacy export for v2 naming convention
export const generateWorkOrderPdfJob = generateWorkOrderPdf;

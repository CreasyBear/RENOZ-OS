'use server';

/**
 * Synchronous Project Document Generation Server Functions
 *
 * Generates PDF documents for projects (work orders, completion certificates).
 * Returns the PDF URL directly for immediate use.
 *
 * @see src/server/functions/documents/generate-documents-sync.tsx for order pattern
 */
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { projects, customers, generatedDocuments, jobMaterials, products } from 'drizzle/schema';
import { createActivityLogger } from '@/lib/activity-logger';
import { createAdminSupabase } from '@/lib/supabase/server';
import {
  renderPdfToBuffer,
  WorkOrderPdfDocument,
  CompletionCertificatePdfDocument,
  HandoverPackPdfDocument,
  generateFilename,
  generateStoragePath,
  calculateChecksum,
} from '@/lib/documents';
import type { WorkOrderDocumentData, WorkOrderMaterial } from '@/lib/documents/templates/operational/work-order';
import type { CompletionCertificateData } from '@/lib/documents/templates/certificates/completion';
import type { HandoverPackData } from '@/lib/documents/templates/certificates/handover-pack';
import type { ProjectScope, ProjectKeyFeatures } from '@/lib/schemas/jobs/projects';
import { NotFoundError } from '@/lib/server/errors';
import { fetchOrganizationForDocument } from './organization-for-pdf';

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_BUCKET = 'documents';

const DEFAULT_HANDOVER_WARRANTY_INFO =
  'Standard product warranties apply. Contact your installer for warranty details.';

// ============================================================================
// SCHEMAS
// ============================================================================

const generateProjectDocumentSchema = z.object({
  projectId: z.string().uuid(),
  documentType: z.enum(['work-order', 'completion-certificate', 'handover-pack']),
  regenerate: z.boolean().optional().default(false),
  // Optional metadata for work orders
  scheduledDate: z.string().datetime().optional(),
  scheduledTimeWindow: z.string().optional(),
  estimatedDuration: z.string().optional(),
  technicianId: z.string().uuid().optional(),
  technicianName: z.string().optional(),
  safetyNotes: z.string().optional(),
  technicianNotes: z.string().optional(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch complete project data
 */
async function fetchProjectData(projectId: string, organizationId: string) {
  const [project] = await db
    .select({
      id: projects.id,
      projectNumber: projects.projectNumber,
      title: projects.title,
      description: projects.description,
      projectType: projects.projectType,
      status: projects.status,
      priority: projects.priority,
      customerId: projects.customerId,
      startDate: projects.startDate,
      targetCompletionDate: projects.targetCompletionDate,
      actualCompletionDate: projects.actualCompletionDate,
      siteAddress: projects.siteAddress,
      scope: projects.scope,
      outcomes: projects.outcomes,
      keyFeatures: projects.keyFeatures,
    })
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!project) {
    throw new NotFoundError('Project not found', 'project');
  }

  return project;
}

/** Format site address for document display (single-line string) */
function formatSiteAddressForDocument(
  address: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  } | null
): string | undefined {
  if (!address) return undefined;
  const parts = [address.street, address.city, address.state, address.postalCode, address.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : undefined;
}

/**
 * Fetch customer data
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

  return customer;
}

/**
 * Fetch project materials (join with products to get name/sku)
 */
async function fetchProjectMaterials(projectId: string): Promise<WorkOrderMaterial[]> {
  const materials = await db
    .select({
      id: jobMaterials.id,
      productName: products.name,
      productSku: products.sku,
      quantityRequired: jobMaterials.quantityRequired,
      notes: jobMaterials.notes,
    })
    .from(jobMaterials)
    .innerJoin(products, eq(jobMaterials.productId, products.id))
    .where(eq(jobMaterials.projectId, projectId));

  return materials.map((m) => ({
    id: m.id,
    name: m.productName,
    sku: m.productSku,
    quantity: Number(m.quantityRequired) || 1,
    notes: m.notes,
  }));
}

/**
 * Upload PDF to storage and return signed URL
 */
async function uploadPdf(
  buffer: Buffer,
  organizationId: string,
  documentType: string,
  projectNumber: string
): Promise<{ url: string; filename: string; storagePath: string }> {
  const filename = generateFilename(documentType, projectNumber);
  const storagePath = generateStoragePath(organizationId, documentType, filename);

  const supabase = createAdminSupabase();

  const { error: uploadError } = await supabase
    .storage.from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload PDF: ${uploadError.message}`);
  }

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
 * Generate any project document synchronously
 */
export const generateProjectDocument = createServerFn({ method: 'POST' })
  .inputValidator(generateProjectDocumentSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });
    const { projectId, documentType, regenerate: _regenerate } = data;

    // Fetch all required data
    const [projectData, orgData] = await Promise.all([
      fetchProjectData(projectId, ctx.organizationId),
      fetchOrganizationForDocument(ctx.organizationId),
    ]);

    const customerData = await fetchCustomerData(projectData.customerId, ctx.organizationId);
    const materials = await fetchProjectMaterials(projectId);

    // Parse site address
    const siteAddress = projectData.siteAddress as {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
      accessInstructions?: string;
    } | null;

    // Generate PDF based on document type
    let buffer: Buffer;
    let filename: string;

    switch (documentType) {
      case 'work-order': {
        const workOrderData: WorkOrderDocumentData = {
          documentNumber: `WO-${projectData.projectNumber}`,
          orderNumber: projectData.projectNumber,
          title: projectData.title,
          description: projectData.description,
          issueDate: new Date(),
          scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : projectData.startDate ? new Date(projectData.startDate) : null,
          scheduledTimeWindow: data.scheduledTimeWindow,
          estimatedDuration: data.estimatedDuration,
          priority: projectData.priority as 'low' | 'medium' | 'high' | 'urgent' | null,
          jobType: projectData.projectType,
          customer: {
            id: customerData.id,
            name: customerData.name,
            email: customerData.email,
            phone: customerData.phone,
          },
          siteAddress: siteAddress ? {
            addressLine1: siteAddress.street,
            city: siteAddress.city,
            state: siteAddress.state,
            postalCode: siteAddress.postalCode,
            country: siteAddress.country,
            accessInstructions: siteAddress.accessInstructions,
          } : null,
          assignedTechnician: data.technicianName ? {
            id: data.technicianId || '',
            name: data.technicianName,
          } : null,
          materials: materials.length > 0 ? materials : undefined,
          safetyNotes: data.safetyNotes,
          technicianNotes: data.technicianNotes,
        };

        const result = await renderPdfToBuffer(
          <WorkOrderPdfDocument
            organization={orgData}
            data={workOrderData}
            showMaterials={materials.length > 0}
            showChecklist={false}
          />
        );
        buffer = result.buffer;
        filename = generateFilename('work-order', projectData.projectNumber);
        break;
      }

      case 'completion-certificate': {
        const completionData: CompletionCertificateData = {
          jobNumber: projectData.projectNumber,
          jobTitle: projectData.title,
          jobDescription: projectData.description || undefined,
          customerName: customerData.name,
          jobAddress: formatSiteAddressForDocument(siteAddress),
          scheduledDate: projectData.startDate ? new Date(projectData.startDate) : new Date(),
          completedAt: projectData.actualCompletionDate ? new Date(projectData.actualCompletionDate) : new Date(),
          technicianName: data.technicianName || 'Installation Team',
          jobType: (projectData.projectType as 'installation' | 'service' | 'warranty' | 'inspection' | 'commissioning') || 'installation',
        };

        const result = await renderPdfToBuffer(
          <CompletionCertificatePdfDocument
            organization={orgData}
            data={completionData}
          />
        );
        buffer = result.buffer;
        filename = generateFilename('completion-certificate', projectData.projectNumber);
        break;
      }

      case 'handover-pack': {
        const scope = projectData.scope as ProjectScope | null;
        const keyFeatures = projectData.keyFeatures as ProjectKeyFeatures | null;
        const allKeyFeatures = [
          ...(keyFeatures?.p0 ?? []),
          ...(keyFeatures?.p1 ?? []),
          ...(keyFeatures?.p2 ?? []),
        ].filter(Boolean);
        const systemSpecs = [
          ...(scope?.inScope ?? []),
          ...(keyFeatures?.p0 ?? []),
          ...(keyFeatures?.p1 ?? []),
        ].filter(Boolean);

        const handoverData: HandoverPackData = {
          projectNumber: projectData.projectNumber,
          title: projectData.title,
          description: projectData.description || undefined,
          projectType: projectData.projectType || 'solar_battery',
          customerName: customerData.name,
          siteAddress: formatSiteAddressForDocument(siteAddress),
          startDate: projectData.startDate ? new Date(projectData.startDate) : new Date(),
          completionDate: projectData.actualCompletionDate ? new Date(projectData.actualCompletionDate) : new Date(),
          outcomes: Array.isArray(projectData.outcomes) ? projectData.outcomes : [],
          keyFeatures: allKeyFeatures.length > 0 ? allKeyFeatures : undefined,
          systemSpecs: systemSpecs.length > 0 ? systemSpecs : undefined,
          warrantyInfo: DEFAULT_HANDOVER_WARRANTY_INFO,
        };

        const result = await renderPdfToBuffer(
          <HandoverPackPdfDocument
            organization={orgData}
            data={handoverData}
          />
        );
        buffer = result.buffer;
        filename = generateFilename('handover-pack', projectData.projectNumber);
        break;
      }

      default:
        throw new Error(`Unsupported document type: ${documentType}`);
    }

    // Upload to storage
    const { url, storagePath } = await uploadPdf(buffer, ctx.organizationId, documentType, projectData.projectNumber);
    const checksum = await calculateChecksum(buffer);
    const fileSize = buffer.length;

    // Upsert generated_documents
    const [upsertResult] = await db
      .insert(generatedDocuments)
      .values({
        organizationId: ctx.organizationId,
        documentType,
        entityType: 'project',
        entityId: projectId,
        filename,
        storageUrl: url,
        fileSize,
        generatedById: ctx.user.id,
        regenerationCount: 0,
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
        },
      })
      .returning({ regenerationCount: generatedDocuments.regenerationCount });

    // Log activity
    const activityLogger = createActivityLogger({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
    });
    const isRegeneration = (upsertResult?.regenerationCount ?? 0) > 0;
    activityLogger.logAsync({
      entityType: 'project',
      entityId: projectId,
      action: 'exported',
      entityName: projectData.projectNumber,
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

    return {
      projectId,
      documentType,
      status: 'completed' as const,
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
 * Generate Work Order PDF for project
 */
export const generateProjectWorkOrderPdf = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      projectId: z.string().uuid(),
      scheduledDate: z.string().datetime().optional(),
      scheduledTimeWindow: z.string().optional(),
      estimatedDuration: z.string().optional(),
      technicianId: z.string().uuid().optional(),
      technicianName: z.string().optional(),
      safetyNotes: z.string().optional(),
      technicianNotes: z.string().optional(),
      regenerate: z.boolean().optional(),
    })
  )
  .handler(async ({ data }) => {
    return generateProjectDocument({
      data: { ...data, documentType: 'work-order' },
    });
  });

/**
 * Generate Completion Certificate PDF for project
 */
export const generateProjectCompletionCertificatePdf = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      projectId: z.string().uuid(),
      technicianName: z.string().optional(),
      regenerate: z.boolean().optional(),
    })
  )
  .handler(async ({ data }) => {
    return generateProjectDocument({
      data: { ...data, documentType: 'completion-certificate' },
    });
  });

/**
 * Generate Handover Pack PDF for project
 */
export const generateProjectHandoverPackPdf = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      projectId: z.string().uuid(),
      regenerate: z.boolean().optional(),
    })
  )
  .handler(async ({ data }) => {
    return generateProjectDocument({
      data: { ...data, documentType: 'handover-pack' },
    });
  });

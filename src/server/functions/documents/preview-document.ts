'use server'

/**
 * Preview Document Server Function (INT-DOC-006-A)
 *
 * Preview documents with sample data before generation.
 * Renders PDF to base64 for display in preview modal.
 *
 * @see _Initiation/_prd/3-integrations/document-generation/document-generation.prd.json
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  orders,
  customers,
  organizations,
  type OrganizationAddress,
  type OrganizationBranding,
} from 'drizzle/schema';
import { NotFoundError } from '@/lib/server/errors';

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

/**
 * Supported document types for preview
 */
export const DOCUMENT_TYPES = [
  'quote',
  'invoice',
  'pro_forma',
  'delivery_note',
  'packing_slip',
  'work_order',
  'warranty_certificate',
  'completion_certificate',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

// ============================================================================
// SCHEMAS
// ============================================================================

/**
 * Schema for previewing a document with real data
 */
const previewDocumentWithDataSchema = z.object({
  /** Type of document to preview */
  documentType: z.enum(DOCUMENT_TYPES),
  /** Entity type (order, warranty, job) */
  entityType: z.enum(['order', 'warranty', 'job']),
  /** Entity ID to pull data from */
  entityId: z.string().uuid(),
});

/**
 * Schema for previewing a document with sample data
 * Used for template customization preview
 */
const previewDocumentWithSampleDataSchema = z.object({
  /** Type of document to preview */
  documentType: z.enum(DOCUMENT_TYPES),
  /** Use sample data instead of real entity data */
  useSampleData: z.literal(true),
});

/**
 * Combined preview schema
 */
const previewDocumentSchema = z.discriminatedUnion('useSampleData', [
  previewDocumentWithDataSchema.extend({ useSampleData: z.literal(false).optional() }),
  previewDocumentWithSampleDataSchema,
]);

export type PreviewDocumentInput = z.infer<typeof previewDocumentSchema>;

// ============================================================================
// SAMPLE DATA
// ============================================================================

/**
 * Sample data for document preview
 * Used when previewing template customization
 */
const SAMPLE_DOCUMENT_DATA = {
  organization: {
    name: 'Acme Renovations Ltd',
    email: 'info@acmerenovations.com',
    phone: '(555) 123-4567',
    address: '123 Builder Street',
    city: 'Sydney',
    state: 'NSW',
    postalCode: '2000',
    country: 'Australia',
    abn: '12 345 678 901',
    logoUrl: null as string | null,
  },
  customer: {
    name: 'John Smith',
    email: 'john.smith@example.com',
    phone: '(555) 987-6543',
    address: '456 Home Avenue',
    city: 'Melbourne',
    state: 'VIC',
    postalCode: '3000',
    country: 'Australia',
  },
  order: {
    orderNumber: 'QUO-2026-0001',
    createdAt: new Date().toISOString(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    lineItems: [
      {
        description: 'Kitchen Cabinet Installation',
        quantity: 1,
        unitPrice: 2500.0,
        total: 2500.0,
      },
      {
        description: 'Benchtop - Stone 20mm',
        quantity: 3.5,
        unit: 'sqm',
        unitPrice: 450.0,
        total: 1575.0,
      },
      {
        description: 'Sink and Tapware Installation',
        quantity: 1,
        unitPrice: 350.0,
        total: 350.0,
      },
      {
        description: 'Electrical Work - PowerPoints',
        quantity: 4,
        unitPrice: 85.0,
        total: 340.0,
      },
    ],
    subtotal: 4765.0,
    taxRate: 0.1,
    taxAmount: 476.5,
    discount: 0,
    total: 5241.5,
    notes: 'Installation scheduled for Monday 9am. Please ensure site access.',
    terms:
      'Payment due within 14 days of invoice. A 50% deposit is required before work commences.',
  },
  warranty: {
    certificateNumber: 'WC-2026-0001',
    productName: 'Premium Kitchen Cabinets',
    serialNumber: 'KC-123456',
    coverageYears: 10,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString(),
    terms: 'Covers manufacturing defects and structural issues. Does not cover wear and tear.',
  },
  job: {
    jobNumber: 'JOB-2026-0001',
    title: 'Kitchen Renovation - Smith Residence',
    description: 'Complete kitchen renovation including cabinets, benchtops, and appliances.',
    scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    tasks: [
      { name: 'Remove existing cabinets', completed: false },
      { name: 'Install new cabinets', completed: false },
      { name: 'Install benchtops', completed: false },
      { name: 'Connect plumbing', completed: false },
      { name: 'Final inspection', completed: false },
    ],
    materials: [
      { name: 'Kitchen Cabinet Set', quantity: 1 },
      { name: 'Stone Benchtop', quantity: 3.5, unit: 'sqm' },
      { name: 'Sink - Undermount', quantity: 1 },
      { name: 'Mixer Tap', quantity: 1 },
    ],
  },
};

// ============================================================================
// PREVIEW DOCUMENT
// ============================================================================

/**
 * Preview a document with real or sample data
 *
 * Returns base64-encoded PDF for display in preview modal.
 * Does not save the document - use generation functions to create permanent PDFs.
 *
 * Security:
 * - Requires order.read permission
 * - Validates entity ownership before rendering
 *
 * @example
 * // Preview quote with real order data
 * const { base64, mimeType } = await previewDocument({
 *   data: { documentType: 'quote', entityType: 'order', entityId: orderId }
 * });
 *
 * // Preview with sample data (template customization)
 * const { base64, mimeType } = await previewDocument({
 *   data: { documentType: 'quote', useSampleData: true }
 * });
 */
export const previewDocument = createServerFn({ method: 'POST' })
  .inputValidator(previewDocumentSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.order.read });

    const { documentType } = data;

    // Get organization data for branding
    const [org] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        email: organizations.email,
        phone: organizations.phone,
        address: organizations.address, // JSONB: OrganizationAddress
        abn: organizations.abn,
        branding: organizations.branding, // JSONB: OrganizationBranding
      })
      .from(organizations)
      .where(eq(organizations.id, ctx.organizationId))
      .limit(1);

    if (!org) {
      throw new NotFoundError('Organization not found', 'organization');
    }

    // Extract address fields from JSONB
    const orgAddress = (org.address || {}) as OrganizationAddress;
    const orgBranding = (org.branding || {}) as OrganizationBranding;

    // Determine if using sample data or real data
    const useSampleData = 'useSampleData' in data && data.useSampleData === true;

    let documentData: typeof SAMPLE_DOCUMENT_DATA;

    if (useSampleData) {
      // Use sample data with organization branding
      documentData = {
        ...SAMPLE_DOCUMENT_DATA,
        organization: {
          ...SAMPLE_DOCUMENT_DATA.organization,
          name: org.name,
          email: org.email || SAMPLE_DOCUMENT_DATA.organization.email,
          phone: org.phone || SAMPLE_DOCUMENT_DATA.organization.phone,
          address: orgAddress.street1 || SAMPLE_DOCUMENT_DATA.organization.address,
          city: orgAddress.city || SAMPLE_DOCUMENT_DATA.organization.city,
          state: orgAddress.state || SAMPLE_DOCUMENT_DATA.organization.state,
          postalCode: orgAddress.postalCode || SAMPLE_DOCUMENT_DATA.organization.postalCode,
          country: orgAddress.country || SAMPLE_DOCUMENT_DATA.organization.country,
          abn: org.abn || SAMPLE_DOCUMENT_DATA.organization.abn,
          logoUrl: orgBranding.logoUrl || null,
        },
      };
    } else {
      // Fetch real data based on entity type
      const { entityType, entityId } = data as z.infer<typeof previewDocumentWithDataSchema>;

      if (entityType === 'order') {
        const [order] = await db
          .select({
            id: orders.id,
            orderNumber: orders.orderNumber,
            customerId: orders.customerId,
            createdAt: orders.createdAt,
            dueDate: orders.dueDate,
            subtotal: orders.subtotal,
            taxAmount: orders.taxAmount,
            discountAmount: orders.discountAmount,
            total: orders.total,
            customerNotes: orders.customerNotes,
          })
          .from(orders)
          .where(
            and(
              eq(orders.id, entityId),
              eq(orders.organizationId, ctx.organizationId),
              sql`${orders.deletedAt} IS NULL`
            )
          )
          .limit(1);

        if (!order) {
          throw new NotFoundError('Order not found', 'order');
        }

        // Fetch customer data
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
              eq(customers.id, order.customerId),
              eq(customers.organizationId, ctx.organizationId)
            )
          )
          .limit(1);

        // Build document data from real order
        documentData = {
          organization: {
            name: org.name,
            email: org.email || '',
            phone: org.phone || '',
            address: orgAddress.street1 || '',
            city: orgAddress.city || '',
            state: orgAddress.state || '',
            postalCode: orgAddress.postalCode || '',
            country: orgAddress.country || '',
            abn: org.abn || '',
            logoUrl: orgBranding.logoUrl || null,
          },
          customer: {
            name: customer?.name || 'Unknown Customer',
            email: customer?.email || '',
            phone: customer?.phone || '',
            address: '', // Would need to fetch from addresses table
            city: '',
            state: '',
            postalCode: '',
            country: '',
          },
          order: {
            orderNumber: order.orderNumber,
            createdAt: new Date(order.createdAt).toISOString(),
            dueDate: order.dueDate ? new Date(order.dueDate).toISOString() : '',
            validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            lineItems: [], // Would need to fetch from order_line_items table
            subtotal: Number(order.subtotal) || 0,
            taxRate: 0.1,
            taxAmount: Number(order.taxAmount) || 0,
            discount: Number(order.discountAmount) || 0,
            total: Number(order.total) || 0,
            notes: order.customerNotes || '',
            terms: '',
          },
          warranty: SAMPLE_DOCUMENT_DATA.warranty,
          job: SAMPLE_DOCUMENT_DATA.job,
        };
      } else {
        // For warranty and job entities, use sample data for now
        // Real implementation would fetch from warranties/jobs tables
        documentData = {
          ...SAMPLE_DOCUMENT_DATA,
          organization: {
            name: org.name,
            email: org.email || '',
            phone: org.phone || '',
            address: orgAddress.street1 || '',
            city: orgAddress.city || '',
            state: orgAddress.state || '',
            postalCode: orgAddress.postalCode || '',
            country: orgAddress.country || '',
            abn: org.abn || '',
            logoUrl: orgBranding.logoUrl || null,
          },
        };
      }
    }

    // TODO: Once @react-pdf/renderer is installed and templates are created,
    // render the actual PDF here using the appropriate template component.
    //
    // Example implementation:
    // import { renderToBuffer } from '@react-pdf/renderer';
    // import { QuotePdfTemplate } from '@/lib/documents/templates/quote';
    //
    // const Template = getTemplateComponent(documentType);
    // const pdfBuffer = await renderToBuffer(<Template data={documentData} />);
    // const base64 = pdfBuffer.toString('base64');

    // For now, return metadata indicating preview is ready once templates exist
    return {
      success: true,
      documentType,
      useSampleData,
      // Placeholder: Once PDF templates are implemented, this will be the actual PDF
      base64: null as string | null,
      mimeType: 'application/pdf',
      // Return the prepared data for debugging/verification
      previewData: {
        organization: documentData.organization,
        documentType,
        // Don't expose full data in preview response for security
        hasLineItems: documentData.order.lineItems.length > 0,
        total: documentData.order.total,
      },
      message:
        'Preview infrastructure ready. PDF generation will be available once @react-pdf/renderer templates are implemented.',
    };
  });

// ============================================================================
// GET SUPPORTED DOCUMENT TYPES
// ============================================================================

/**
 * Get list of supported document types for an entity
 *
 * Returns which document types can be generated for a given entity type.
 */
export const getSupportedDocumentTypes = createServerFn({ method: 'GET' }).handler(async () => {
  await withAuth({ permission: PERMISSIONS.order.read });

  return {
    order: ['quote', 'invoice', 'pro_forma', 'delivery_note', 'packing_slip'],
    warranty: ['warranty_certificate'],
    job: ['work_order', 'completion_certificate'],
  };
});

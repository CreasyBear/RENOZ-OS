/**
 * Quote Versions Server Functions
 *
 * API for quote creation, versioning, PDF generation, and sending.
 * All monetary values in AUD dollars (numeric(12,2)). GST is 10%.
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-QUOTE-BUILDER-API)
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { eq, and, desc, sql, isNull, isNotNull, gt, lte, lt, notInArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { quoteVersions, opportunities, opportunityActivities, generatedDocuments } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  createQuoteVersionSchema,
  quoteVersionFilterSchema,
  quoteVersionParamsSchema,
  restoreQuoteVersionSchema,
  updateQuoteExpirationSchema,
  sendQuoteSchema,
  type QuoteLineItem,
} from '@/lib/schemas';
import { GST_RATE } from '@/lib/order-calculations';
import { formatCurrency } from '@/lib/formatters';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { createActivityLogger } from '@/lib/activity-logger';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default quote validity in days */
const DEFAULT_QUOTE_VALIDITY_DAYS = 30;

/** Raw quote line item from DB (supports legacy cents and new dollars format) */
interface QuoteVersionItemRaw {
  productId?: string;
  sku?: string;
  description?: string;
  quantity: number;
  unitPrice?: number;
  unitPriceCents?: number;
  total?: number;
  totalCents?: number;
  discountPercent?: number;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calculate line item total from quantity and unit price, applying discount
 * Returns total in dollars
 */
function calculateLineItemTotal(item: QuoteLineItem): number {
  const subtotal = item.quantity * item.unitPrice;
  const discount = item.discountPercent ? subtotal * (item.discountPercent / 100) : 0;
  return Math.round((subtotal - discount) * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate quote totals from line items
 * @returns { subtotal, taxAmount, total } all in dollars
 */
function calculateQuoteTotals(items: QuoteLineItem[]): {
  subtotal: number;
  taxAmount: number;
  total: number;
} {
  // Recalculate each line item total to ensure consistency
  const processedItems = items.map((item) => ({
    ...item,
    total: calculateLineItemTotal(item),
  }));

  const subtotal = processedItems.reduce((sum, item) => sum + (item.total ?? 0), 0);
  const taxAmount = Math.round(subtotal * GST_RATE * 100) / 100; // Round to 2 decimal places
  const total = Math.round((subtotal + taxAmount) * 100) / 100; // Round to 2 decimal places

  return { subtotal, taxAmount, total };
}

// ============================================================================
// CREATE QUOTE VERSION
// ============================================================================

/**
 * Create a new quote version for an opportunity.
 * Automatically calculates subtotal, GST (10%), and total.
 * Each save creates a new immutable version.
 */
export const createQuoteVersion = createServerFn({ method: 'POST' })
  .inputValidator(createQuoteVersionSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.opportunity?.update ?? 'opportunity:update',
    });

    const { opportunityId, items, notes } = data;

    // Verify opportunity exists and belongs to org
    const opportunity = await db
      .select()
      .from(opportunities)
      .where(
        and(
          eq(opportunities.id, opportunityId),
          eq(opportunities.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!opportunity[0]) {
      throw new NotFoundError('Opportunity not found', 'opportunity');
    }

    // Calculate totals
    const { subtotal, taxAmount, total } = calculateQuoteTotals(items);

    // Process line items to ensure total is correct
    const processedItems = items.map((item) => ({
      ...item,
      total: calculateLineItemTotal(item),
    }));

    // Wrap quote creation and opportunity update in transaction for atomicity.
    // Version number generation is inside the transaction to prevent race conditions
    // where two concurrent creates could get the same version number.
    const quoteVersion = await db.transaction(async (tx) => {
      // Get next version number inside transaction to prevent race condition
      const latest = await tx
        .select({ versionNumber: quoteVersions.versionNumber })
        .from(quoteVersions)
        .where(eq(quoteVersions.opportunityId, opportunityId))
        .orderBy(desc(quoteVersions.versionNumber))
        .limit(1);

      const versionNumber = (latest[0]?.versionNumber ?? 0) + 1;

      // Create quote version
      const [newVersion] = await tx
        .insert(quoteVersions)
        .values({
          organizationId: ctx.organizationId,
          opportunityId,
          versionNumber,
          items: processedItems,
          subtotal,
          taxAmount,
          total,
          notes: notes ?? null,
          createdBy: ctx.user.id,
        })
        .returning();

      // Update opportunity value to match latest quote total
      await tx
        .update(opportunities)
        .set({
          value: total,
          weightedValue: Math.round(total * ((opportunity[0].probability ?? 50) / 100)),
          updatedBy: ctx.user.id,
        })
        .where(eq(opportunities.id, opportunityId));

      return newVersion;
    });

    return { quoteVersion };
  });

// ============================================================================
// GET QUOTE VERSION
// ============================================================================

/**
 * Get a single quote version by ID
 */
export const getQuoteVersion = createServerFn({ method: 'GET' })
  .inputValidator(quoteVersionParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const { id } = data;

    const version = await db
      .select()
      .from(quoteVersions)
      .where(and(eq(quoteVersions.id, id), eq(quoteVersions.organizationId, ctx.organizationId)))
      .limit(1);

    if (!version[0]) {
      throw new NotFoundError('Quote version not found', 'quoteVersion');
    }

    return { quoteVersion: version[0] };
  });

// ============================================================================
// LIST QUOTE VERSIONS (History)
// ============================================================================

/**
 * Get all quote versions for an opportunity (version history)
 * Returns in descending order (newest first)
 */
export const listQuoteVersions = createServerFn({ method: 'GET' })
  .inputValidator(quoteVersionFilterSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const { opportunityId } = data;

    // Verify opportunity belongs to org
    const opportunity = await db
      .select()
      .from(opportunities)
      .where(
        and(
          eq(opportunities.id, opportunityId),
          eq(opportunities.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!opportunity[0]) {
      throw new NotFoundError('Opportunity not found', 'opportunity');
    }

    // Get all versions
    const versions = await db
      .select()
      .from(quoteVersions)
      .where(eq(quoteVersions.opportunityId, opportunityId))
      .orderBy(desc(quoteVersions.versionNumber));

    return {
      versions,
      totalCount: versions.length,
      latestVersion: versions[0] ?? null,
    };
  });

// ============================================================================
// RESTORE QUOTE VERSION
// ============================================================================

/**
 * Restore a previous quote version by creating a new version with that content.
 * This maintains the audit trail - versions are never modified.
 * All operations are wrapped in a transaction to prevent race conditions.
 */
export const restoreQuoteVersion = createServerFn({ method: 'POST' })
  .inputValidator(restoreQuoteVersionSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.opportunity?.update ?? 'opportunity:update',
    });

    const { opportunityId, sourceVersionId, notes } = data;

    // Wrap all operations in a transaction for atomicity
    const result = await db.transaction(async (tx) => {
      // Get the source version
      const sourceVersion = await tx
        .select()
        .from(quoteVersions)
        .where(
          and(
            eq(quoteVersions.id, sourceVersionId),
            eq(quoteVersions.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!sourceVersion[0]) {
        throw new NotFoundError('Source quote version not found', 'quoteVersion');
      }

      // Verify it belongs to the same opportunity
      if (sourceVersion[0].opportunityId !== opportunityId) {
        throw new ValidationError('Source version does not belong to this opportunity');
      }

      // Get opportunity for probability calculation
      const opportunity = await tx
        .select()
        .from(opportunities)
        .where(
          and(
            eq(opportunities.id, opportunityId),
            eq(opportunities.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!opportunity[0]) {
        throw new NotFoundError('Opportunity not found', 'opportunity');
      }

      // Get next version number (query within transaction)
      const latest = await tx
        .select({ versionNumber: quoteVersions.versionNumber })
        .from(quoteVersions)
        .where(eq(quoteVersions.opportunityId, opportunityId))
        .orderBy(desc(quoteVersions.versionNumber))
        .limit(1);

      const versionNumber = (latest[0]?.versionNumber ?? 0) + 1;

      // Create new version with source content
      const restorationNotes = notes
        ? `Restored from v${sourceVersion[0].versionNumber}. ${notes}`
        : `Restored from v${sourceVersion[0].versionNumber}`;

      const [newVersion] = await tx
        .insert(quoteVersions)
        .values({
          organizationId: ctx.organizationId,
          opportunityId,
          versionNumber,
          items: sourceVersion[0].items,
          subtotal: sourceVersion[0].subtotal,
          taxAmount: sourceVersion[0].taxAmount,
          total: sourceVersion[0].total,
          notes: restorationNotes,
          createdBy: ctx.user.id,
        })
        .returning();

      // Update opportunity value to match restored quote
      await tx
        .update(opportunities)
        .set({
          value: sourceVersion[0].total,
          weightedValue: Math.round(
            sourceVersion[0].total * ((opportunity[0].probability ?? 50) / 100)
          ),
          updatedBy: ctx.user.id,
        })
        .where(eq(opportunities.id, opportunityId));

      return {
        quoteVersion: newVersion,
        restoredFrom: sourceVersion[0].versionNumber,
      };
    });

    return result;
  });

// ============================================================================
// UPDATE QUOTE EXPIRATION
// ============================================================================

/**
 * Set or update the quote expiration date on the opportunity.
 * This affects when the quote is considered expired.
 */
export const updateQuoteExpiration = createServerFn({ method: 'POST' })
  .inputValidator(updateQuoteExpirationSchema)
  .handler(async ({ data }): Promise<{ opportunity: typeof opportunities.$inferSelect }> => {
    const ctx = await withAuth({
      permission: PERMISSIONS.opportunity?.update ?? 'opportunity:update',
    });

    const { opportunityId, quoteExpiresAt } = data;

    // Verify opportunity exists and belongs to org
    const opportunity = await db
      .select()
      .from(opportunities)
      .where(
        and(
          eq(opportunities.id, opportunityId),
          eq(opportunities.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!opportunity[0]) {
      throw new NotFoundError('Opportunity not found', 'opportunity');
    }

    // Update expiration - convert string (YYYY-MM-DD) to Date
    const result = await db
      .update(opportunities)
      .set({
        quoteExpiresAt: new Date(quoteExpiresAt),
        updatedBy: ctx.user.id,
      })
      .where(eq(opportunities.id, opportunityId))
      .returning();

    if (!result[0]) {
      throw new Error('Failed to update quote expiration');
    }
    return { opportunity: result[0] };
  });

/**
 * Set quote expiration to default (30 days from now)
 */
export const setDefaultQuoteExpiration = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ opportunityId: z.string().uuid() }))
  .handler(
    async ({
      data,
    }): Promise<{ opportunity: typeof opportunities.$inferSelect; expiresAt: Date }> => {
      const ctx = await withAuth({
        permission: PERMISSIONS.opportunity?.update ?? 'opportunity:update',
      });

      const { opportunityId } = data;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + DEFAULT_QUOTE_VALIDITY_DAYS);

      // Verify and update
      const result = await db
        .update(opportunities)
        .set({
          quoteExpiresAt: expiresAt,
          updatedBy: ctx.user.id,
        })
        .where(
          and(
            eq(opportunities.id, opportunityId),
            eq(opportunities.organizationId, ctx.organizationId)
          )
        )
        .returning();

      if (!result[0]) {
        throw new NotFoundError('Opportunity not found', 'opportunity');
      }

      return { opportunity: result[0]!, expiresAt };
    }
  );

// ============================================================================
// GENERATE QUOTE PDF
// ============================================================================

import { Resend } from 'resend';
import { createAdminSupabase } from '@/lib/supabase/server';
import {
  renderPdfToBuffer,
  QuotePdfDocument,
  generateFilename,
  generateStoragePath,
  calculateChecksum,
  type QuoteDocumentData,
} from '@/lib/documents';
import { fetchOrganizationForDocument } from '@/server/functions/documents/organization-for-pdf';
import { customers, addresses, organizations } from 'drizzle/schema';

const STORAGE_BUCKET = 'documents';
const QUOTE_VALIDITY_DAYS = 30;

/**
 * Generate a PDF for a quote version.
 * Returns a URL to the generated PDF in Supabase storage.
 */
export const generateQuotePdf = createServerFn({ method: 'POST' })
  .inputValidator(quoteVersionParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const { id } = data;

    // Step 1: Get quote version
    const version = await db
      .select({
        id: quoteVersions.id,
        versionNumber: quoteVersions.versionNumber,
        items: quoteVersions.items,
        subtotal: quoteVersions.subtotal,
        taxAmount: quoteVersions.taxAmount,
        total: quoteVersions.total,
        notes: quoteVersions.notes,
        opportunityId: quoteVersions.opportunityId,
        createdAt: quoteVersions.createdAt,
      })
      .from(quoteVersions)
      .where(and(eq(quoteVersions.id, id), eq(quoteVersions.organizationId, ctx.organizationId)))
      .limit(1);

    if (!version[0]) {
      throw new NotFoundError('Quote version not found', 'quoteVersion');
    }

    const quoteVersion = version[0];

    // Step 2: Get opportunity (depends on quoteVersion.opportunityId)
    const opportunity = await db
      .select({
        id: opportunities.id,
        title: opportunities.title,
        customerId: opportunities.customerId,
        quoteExpiresAt: opportunities.quoteExpiresAt,
      })
      .from(opportunities)
      .where(
        and(
          eq(opportunities.id, quoteVersion.opportunityId),
          eq(opportunities.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!opportunity[0]) {
      throw new NotFoundError('Opportunity not found', 'opportunity');
    }

    const opp = opportunity[0];

    // Step 3: Fetch customer and organization in parallel
    const [customer, orgData] = await Promise.all([
      db
        .select({
          id: customers.id,
          name: customers.name,
          email: customers.email,
          phone: customers.phone,
        })
        .from(customers)
        .where(
          and(
            eq(customers.id, opp.customerId),
            eq(customers.organizationId, ctx.organizationId),
            isNull(customers.deletedAt)
          )
        )
        .limit(1),
      fetchOrganizationForDocument(ctx.organizationId),
    ]);

    if (!customer[0]) {
      throw new NotFoundError('Customer not found', 'customer');
    }

    const cust = customer[0];

    // Step 4: Fetch primary billing address (depends on customer.id)
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
          eq(addresses.customerId, cust.id),
          eq(addresses.organizationId, ctx.organizationId),
          eq(addresses.type, 'billing'),
          eq(addresses.isPrimary, true)
        )
      )
      .limit(1);

    // Fallback to any primary address
    let customerAddress = billingAddress;
    if (!customerAddress) {
      const [anyPrimary] = await db
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
            eq(addresses.customerId, cust.id),
            eq(addresses.organizationId, ctx.organizationId),
            eq(addresses.isPrimary, true)
          )
        )
        .limit(1);
      customerAddress = anyPrimary;
    }

    // Calculate dates
    const issueDate = new Date(quoteVersion.createdAt);
    const validUntil = opp.quoteExpiresAt
      ? new Date(opp.quoteExpiresAt)
      : new Date(issueDate.getTime() + QUOTE_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

    // Build document data
    const quoteData: QuoteDocumentData = {
      type: 'quote',
      documentNumber: `Q-${opp.title.slice(0, 20)}-V${quoteVersion.versionNumber}`,
      issueDate,
      validUntil,
      notes: quoteVersion.notes || undefined,
      generatedAt: new Date(),
      order: {
        id: quoteVersion.id,
        orderNumber: `V${quoteVersion.versionNumber}`,
        orderDate: issueDate,
        customer: {
          id: cust.id,
          name: cust.name,
          email: cust.email,
          phone: cust.phone,
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
        },
        billingAddress: customerAddress
          ? {
              addressLine1: customerAddress.street1,
              addressLine2: customerAddress.street2,
              city: customerAddress.city,
              state: customerAddress.state,
              postalCode: customerAddress.postcode,
              country: customerAddress.country,
            }
          : undefined,
        lineItems: (quoteVersion.items || []).map((item: QuoteVersionItemRaw, index: number) => {
          // Handle both old (cents) and new (dollars) formats for backward compatibility
          const unitPrice = 'unitPrice' in item ? item.unitPrice : (item.unitPriceCents ?? 0) / 100;
          const total = 'total' in item ? item.total : (item.totalCents ? item.totalCents / 100 : item.quantity * (unitPrice ?? 0));

          return {
            id: item.productId || `line-${index}`,
            lineNumber: String(index + 1),
            sku: item.sku,
            description: item.description ?? '',
            quantity: item.quantity,
            unitPrice: unitPrice ?? 0,
            discountPercent: item.discountPercent || 0,
            discountAmount: 0,
            taxAmount: 0,
            total: total ?? 0,
            notes: undefined,
          };
        }),
        subtotal: Number(quoteVersion.subtotal) || 0,
        discount: 0,
        discountPercent: 0,
        discountType: 'fixed',
        taxRate: 10,
        taxAmount: Number(quoteVersion.taxAmount) || 0,
        total: Number(quoteVersion.total) || 0,
        customerNotes: quoteVersion.notes || undefined,
        internalNotes: undefined,
      },
    };

    // Render PDF
    const { buffer } = await renderPdfToBuffer(
      <QuotePdfDocument organization={orgData} data={quoteData} />
    );

    // Upload to storage
    const filename = generateFilename('quote', `${opp.title.slice(0, 20)}-V${quoteVersion.versionNumber}`);
    const storagePath = generateStoragePath(ctx.organizationId, 'quote', filename);
    const checksum = calculateChecksum(buffer);

    // Use admin client for storage (service role bypasses RLS)
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

    // Generate signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage.from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 year

    if (signedUrlError) {
      throw new Error(`Failed to generate signed URL: ${signedUrlError.message}`);
    }

    // Upsert generated_documents: one row per (org, entity, docType)
    // On regenerate: update metadata + increment regeneration count
    const [upsertResult] = await db
      .insert(generatedDocuments)
      .values({
        organizationId: ctx.organizationId,
        documentType: 'quote',
        entityType: 'opportunity',
        entityId: opp.id,
        filename,
        storageUrl: signedUrlData.signedUrl,
        fileSize: buffer.length,
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
          storageUrl: signedUrlData.signedUrl,
          fileSize: buffer.length,
          generatedById: ctx.user.id,
          generatedAt: new Date(),
          updatedAt: new Date(),
          regenerationCount: sql`${generatedDocuments.regenerationCount} + 1`,
        },
      })
      .returning({ regenerationCount: generatedDocuments.regenerationCount });

    // Log activity for audit trail (async, non-blocking)
    const activityLogger = createActivityLogger({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
    });
    const isRegeneration = (upsertResult?.regenerationCount ?? 0) > 0;
    activityLogger.logAsync({
      entityType: 'opportunity',
      entityId: opp.id,
      action: 'exported',
      entityName: opp.title,
      description: isRegeneration
        ? `Regenerated quote PDF (version ${upsertResult?.regenerationCount ?? 1})`
        : `Generated quote PDF`,
      metadata: {
        documentType: 'quote',
        filename,
        fileSize: buffer.length,
        isRegeneration,
        regenerationCount: upsertResult?.regenerationCount ?? 0,
        quoteVersionId: id,
      },
    });

    // Update opportunity with PDF URL
    await db
      .update(opportunities)
      .set({ quotePdfUrl: signedUrlData.signedUrl })
      .where(eq(opportunities.id, opp.id));

    return {
      quoteVersionId: id,
      pdfUrl: signedUrlData.signedUrl,
      filename,
      fileSize: buffer.length,
      checksum,
      status: 'completed' as const,
    };
  });

// ============================================================================
// SEND QUOTE
// ============================================================================

import { emailHistory, type NewEmailHistory } from 'drizzle/schema';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send a quote to the customer via email.
 * Generates PDF if needed and sends with attachment.
 */
export const sendQuote = createServerFn({ method: 'POST' })
  .inputValidator(sendQuoteSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.opportunity?.update ?? 'opportunity:update',
    });

    const {
      opportunityId,
      quoteVersionId,
      recipientEmail,
      recipientName,
      subject,
      message,
      ccEmails,
    } = data;

    // Verify quote version exists and belongs to opportunity
    const version = await db
      .select({
        id: quoteVersions.id,
        versionNumber: quoteVersions.versionNumber,
        items: quoteVersions.items,
        subtotal: quoteVersions.subtotal,
        taxAmount: quoteVersions.taxAmount,
        total: quoteVersions.total,
        notes: quoteVersions.notes,
      })
      .from(quoteVersions)
      .where(
        and(
          eq(quoteVersions.id, quoteVersionId),
          eq(quoteVersions.opportunityId, opportunityId),
          eq(quoteVersions.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!version[0]) {
      throw new NotFoundError('Quote version not found', 'quoteVersion');
    }

    const quoteVersion = version[0];

    // Get opportunity with customer details
    const opportunity = await db
      .select({
        id: opportunities.id,
        title: opportunities.title,
        customerId: opportunities.customerId,
        stage: opportunities.stage,
      })
      .from(opportunities)
      .where(
        and(
          eq(opportunities.id, opportunityId),
          eq(opportunities.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!opportunity[0]) {
      throw new NotFoundError('Opportunity not found', 'opportunity');
    }

    const opp = opportunity[0];

    // Get customer details
    const customer = await db
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
      })
      .from(customers)
      .where(
        and(
          eq(customers.id, opp.customerId),
          eq(customers.organizationId, ctx.organizationId),
          isNull(customers.deletedAt)
        )
      )
      .limit(1);

    if (!customer[0]) {
      throw new NotFoundError('Customer not found', 'customer');
    }

    const cust = customer[0];

    // Get organization details for sender
    const org = await db
      .select({
        name: organizations.name,
        email: organizations.email,
        branding: organizations.branding,
      })
      .from(organizations)
      .where(eq(organizations.id, ctx.organizationId))
      .limit(1);

    const organization = org[0];
    const fromEmail = process.env.EMAIL_FROM || 'noreply@resend.dev';
    const fromName = organization?.name || 'Renoz';
    const fromAddress = `${fromName} <${fromEmail}>`;

    // Generate PDF
    const pdfResult = await generateQuotePdf({ data: { id: quoteVersionId } });

    if (pdfResult.status !== 'completed' || !pdfResult.pdfUrl) {
      throw new Error('Failed to generate quote PDF');
    }

    // Download PDF from storage to get buffer
    const pdfResponse = await fetch(pdfResult.pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error('Failed to download PDF for attachment');
    }
    const pdfBuffer = await pdfResponse.arrayBuffer();

    // Build email content
    const emailSubject = subject || `Quote for ${opp.title}`;
    const emailMessage = message || `Please find attached our quote for ${opp.title}.`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${emailSubject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #1a1a1a;">${emailSubject}</h1>
  <p>Hi ${recipientName || cust.name},</p>
  <p>${emailMessage}</p>
  <p>Quote Details:</p>
  <ul>
    <li>Quote Version: ${quoteVersion.versionNumber}</li>
    <li>Subtotal: ${formatCurrency(Number(quoteVersion.subtotal) || 0)}</li>
    <li>GST (10%): ${formatCurrency(Number(quoteVersion.taxAmount) || 0)}</li>
    <li>Total: ${formatCurrency(Number(quoteVersion.total) || 0)}</li>
  </ul>
  <p>Please review the attached PDF and let us know if you have any questions.</p>
  <p>Best regards,<br>${fromName} Team</p>
</body>
</html>`;

    const textContent = `
${emailSubject}

Hi ${recipientName || cust.name},

${emailMessage}

Quote Details:
- Quote Version: ${quoteVersion.versionNumber}
- Subtotal: ${formatCurrency(Number(quoteVersion.subtotal) || 0)}
- GST (10%): ${formatCurrency(Number(quoteVersion.taxAmount) || 0)}
- Total: ${formatCurrency(Number(quoteVersion.total) || 0)}

Please review the attached PDF and let us know if you have any questions.

Best regards,
${fromName} Team
`.trim();

    // Create email history record
    const [emailRecord] = await db
      .insert(emailHistory)
      .values({
        organizationId: ctx.organizationId,
        fromAddress: fromAddress,
        toAddress: recipientEmail,
        customerId: cust.id,
        subject: emailSubject,
        bodyHtml: htmlContent,
        bodyText: textContent,
        status: 'pending',
      } as NewEmailHistory)
      .returning();

    // Send email via Resend with attachment
    const { data: sendResult, error: sendError } = await resend.emails.send({
      from: fromAddress,
      to: [recipientEmail],
      cc: ccEmails,
      subject: emailSubject,
      html: htmlContent,
      text: textContent,
      attachments: [
        {
          filename: pdfResult.filename,
          content: Buffer.from(pdfBuffer).toString('base64'),
        },
      ],
    });

    if (sendError) {
      // Update email history with failure
      await db
        .update(emailHistory)
        .set({ status: 'failed' })
        .where(eq(emailHistory.id, emailRecord.id));

      throw new Error(`Failed to send email: ${sendError.message}`);
    }

    // Wrap post-send DB updates in a transaction for atomicity
    await db.transaction(async (tx) => {
      // Update email history with success
      await tx
        .update(emailHistory)
        .set({
          status: 'sent',
          sentAt: new Date(),
          resendMessageId: sendResult?.id,
        })
        .where(eq(emailHistory.id, emailRecord.id));

      // Log activity on opportunity
      await tx.insert(opportunityActivities).values({
        organizationId: ctx.organizationId,
        opportunityId,
        type: 'email',
        description: `Quote V${quoteVersion.versionNumber} sent to ${recipientEmail}`,
        createdBy: ctx.user.id,
      });

      // Update opportunity stage to 'proposal' if currently earlier
      // Use current stage in WHERE clause for optimistic locking (prevents stale overwrites)
      if (opp.stage === 'new' || opp.stage === 'qualified') {
        await tx
          .update(opportunities)
          .set({
            stage: 'proposal',
            updatedAt: new Date(),
            version: sql`${opportunities.version} + 1`,
          })
          .where(
            and(
              eq(opportunities.id, opportunityId),
              eq(opportunities.stage, opp.stage) // Only update if stage hasn't changed concurrently
            )
          );
      }
    });

    return {
      quoteVersionId,
      recipientEmail,
      recipientName,
      subject: emailSubject,
      message: emailMessage,
      ccEmails,
      pdfUrl: pdfResult.pdfUrl,
      status: 'sent' as const,
      emailHistoryId: emailRecord.id,
      resendMessageId: sendResult?.id,
    };
  });

// ============================================================================
// COMPARE QUOTE VERSIONS
// ============================================================================

/**
 * Compare two quote versions to show differences.
 * Useful for showing what changed between versions.
 */
export const compareQuoteVersions = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      version1Id: z.string().uuid(),
      version2Id: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const { version1Id, version2Id } = data;

    // Get both versions
    const [v1, v2] = await Promise.all([
      db
        .select()
        .from(quoteVersions)
        .where(
          and(
            eq(quoteVersions.id, version1Id),
            eq(quoteVersions.organizationId, ctx.organizationId)
          )
        )
        .limit(1),
      db
        .select()
        .from(quoteVersions)
        .where(
          and(
            eq(quoteVersions.id, version2Id),
            eq(quoteVersions.organizationId, ctx.organizationId)
          )
        )
        .limit(1),
    ]);

    if (!v1[0] || !v2[0]) {
      throw new NotFoundError('One or both quote versions not found', 'quoteVersion');
    }

    // Verify same opportunity
    if (v1[0].opportunityId !== v2[0].opportunityId) {
      throw new ValidationError('Quote versions must be from the same opportunity');
    }

    // Calculate differences
    const subtotalDiff = v2[0].subtotal - v1[0].subtotal;
    const taxDiff = v2[0].taxAmount - v1[0].taxAmount;
    const totalDiff = v2[0].total - v1[0].total;
    const itemCountDiff = v2[0].items.length - v1[0].items.length;

    return {
      version1: v1[0],
      version2: v2[0],
      differences: {
        subtotal: subtotalDiff,
        taxAmount: taxDiff,
        total: totalDiff,
        itemCount: itemCountDiff,
        subtotalPercent: v1[0].subtotal > 0 ? (subtotalDiff / v1[0].subtotal) * 100 : 0,
      },
    };
  });

// ============================================================================
// QUOTE VALIDITY
// ============================================================================

/**
 * Get quotes that are expiring within the warning period.
 * Default warning period is 7 days.
 */
export const getExpiringQuotes = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      warningDays: z.coerce.number().int().positive().default(7),
      limit: z.coerce.number().int().positive().max(50).default(10),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const { warningDays, limit } = data;

    const now = new Date();
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + warningDays);

    // Get opportunities with quotes expiring within warning period
    const expiringOpportunities = await db
      .select({
        opportunityId: opportunities.id,
        opportunityTitle: opportunities.title,
        customerId: opportunities.customerId,
        quoteExpiresAt: opportunities.quoteExpiresAt,
        value: opportunities.value,
        stage: opportunities.stage,
        daysUntilExpiry: sql<number>`EXTRACT(DAY FROM (${opportunities.quoteExpiresAt} - NOW()))`,
      })
      .from(opportunities)
      .where(
        and(
          eq(opportunities.organizationId, ctx.organizationId),
          isNotNull(opportunities.quoteExpiresAt),
          gt(opportunities.quoteExpiresAt, now), // Not yet expired
          lte(opportunities.quoteExpiresAt, warningDate), // But expiring soon
          // Exclude won/lost
          notInArray(opportunities.stage, ['won', 'lost'])
        )
      )
      .orderBy(opportunities.quoteExpiresAt)
      .limit(limit);

    return {
      expiringQuotes: expiringOpportunities.map((opp) => ({
        ...opp,
        daysUntilExpiry: Math.max(0, Math.ceil(Number(opp.daysUntilExpiry))),
      })),
      totalCount: expiringOpportunities.length,
      warningDays,
    };
  });

/**
 * Get quotes that have already expired.
 * These need attention - either extend or close the opportunity.
 */
export const getExpiredQuotes = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      limit: z.coerce.number().int().positive().max(50).default(10),
    })
  )
  .handler(async ({ data }) => {
    const { limit } = data;
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const now = new Date();

    // Get opportunities with expired quotes
    const expiredOpportunities = await db
      .select({
        opportunityId: opportunities.id,
        opportunityTitle: opportunities.title,
        customerId: opportunities.customerId,
        quoteExpiresAt: opportunities.quoteExpiresAt,
        value: opportunities.value,
        stage: opportunities.stage,
        daysSinceExpiry: sql<number>`EXTRACT(DAY FROM (NOW() - ${opportunities.quoteExpiresAt}))`,
      })
      .from(opportunities)
      .where(
        and(
          eq(opportunities.organizationId, ctx.organizationId),
          isNotNull(opportunities.quoteExpiresAt),
          lt(opportunities.quoteExpiresAt, now), // Already expired
          // Exclude won/lost
          notInArray(opportunities.stage, ['won', 'lost'])
        )
      )
      .orderBy(desc(sql`NOW() - ${opportunities.quoteExpiresAt}`))
      .limit(limit);

    return {
      expiredQuotes: expiredOpportunities.map((opp) => ({
        ...opp,
        daysSinceExpiry: Math.ceil(Number(opp.daysSinceExpiry)),
      })),
      totalCount: expiredOpportunities.length,
    };
  });

/**
 * Extend quote validity with a reason for audit trail.
 */
export const extendQuoteValidity = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      opportunityId: z.string().uuid(),
      newExpirationDate: z.coerce.date(),
      reason: z.string().min(1, 'Reason is required').max(500),
    })
  )
  .handler(
    async ({
      data,
    }): Promise<{
      opportunity: typeof opportunities.$inferSelect;
      previousExpiration: Date | null;
      newExpiration: Date;
    }> => {
      const ctx = await withAuth({
        permission: PERMISSIONS.opportunity?.update ?? 'opportunity:update',
      });

      const { opportunityId, newExpirationDate, reason } = data;

      // Get current opportunity
      const opportunity = await db
        .select()
        .from(opportunities)
        .where(
          and(
            eq(opportunities.id, opportunityId),
            eq(opportunities.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!opportunity[0]) {
        throw new NotFoundError('Opportunity not found', 'opportunity');
      }

      const oldExpiration = opportunity[0].quoteExpiresAt;

      // Validate new date is in the future
      if (newExpirationDate <= new Date()) {
        throw new ValidationError('New expiration date must be in the future');
      }

      // Wrap updates in transaction to prevent race condition
      const result = await db.transaction(async (tx) => {
        // Update expiration
        const updated = await tx
          .update(opportunities)
          .set({
            quoteExpiresAt: newExpirationDate,
            updatedBy: ctx.user.id,
          })
          .where(eq(opportunities.id, opportunityId))
          .returning();

        // Log activity for audit trail
        await tx.insert(opportunityActivities).values({
          organizationId: ctx.organizationId,
          opportunityId,
          type: 'note',
          description: `Quote validity extended from ${
            oldExpiration ? oldExpiration.toLocaleDateString('en-AU') : 'unset'
          } to ${newExpirationDate.toLocaleDateString('en-AU')}. Reason: ${reason}`,
          createdBy: ctx.user.id,
          completedAt: new Date(),
        });

        return updated;
      });

      return {
        opportunity: result[0]!,
        previousExpiration: oldExpiration,
        newExpiration: newExpirationDate,
      };
    }
  );

/**
 * Check if a quote is valid (not expired) for conversion.
 * Returns validation result with option to override.
 */
export const validateQuoteForConversion = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      opportunityId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const { opportunityId } = data;

    // Get opportunity with quote info
    const opportunity = await db
      .select()
      .from(opportunities)
      .where(
        and(
          eq(opportunities.id, opportunityId),
          eq(opportunities.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!opportunity[0]) {
      throw new NotFoundError('Opportunity not found', 'opportunity');
    }

    const opp = opportunity[0];
    const now = new Date();

    // Check if there's a quote
    const latestQuote = await db
      .select()
      .from(quoteVersions)
      .where(eq(quoteVersions.opportunityId, opportunityId))
      .orderBy(desc(quoteVersions.versionNumber))
      .limit(1);

    if (!latestQuote[0]) {
      return {
        isValid: false,
        reason: 'no_quote',
        message: 'No quote has been created for this opportunity',
        canOverride: false,
      };
    }

    // Check expiration
    if (opp.quoteExpiresAt) {
      if (opp.quoteExpiresAt < now) {
        const daysSinceExpiry = Math.ceil(
          (now.getTime() - opp.quoteExpiresAt.getTime()) / 86400000
        );
        return {
          isValid: false,
          reason: 'expired',
          message: `Quote expired ${daysSinceExpiry} day(s) ago on ${opp.quoteExpiresAt.toLocaleDateString('en-AU')}`,
          canOverride: true,
          expirationDate: opp.quoteExpiresAt,
          daysSinceExpiry,
        };
      }

      // Check if expiring soon (warning)
      const warningDate = new Date();
      warningDate.setDate(warningDate.getDate() + 7);
      if (opp.quoteExpiresAt < warningDate) {
        const daysUntilExpiry = Math.ceil(
          (opp.quoteExpiresAt.getTime() - now.getTime()) / 86400000
        );
        return {
          isValid: true,
          reason: 'expiring_soon',
          message: `Quote expires in ${daysUntilExpiry} day(s) on ${opp.quoteExpiresAt.toLocaleDateString('en-AU')}`,
          canOverride: false,
          expirationDate: opp.quoteExpiresAt,
          daysUntilExpiry,
        };
      }
    }

    return {
      isValid: true,
      reason: 'valid',
      message: 'Quote is valid for conversion',
      canOverride: false,
      expirationDate: opp.quoteExpiresAt,
      quoteVersion: latestQuote[0].versionNumber,
    };
  });

/**
 * Get quote validity statistics for dashboard.
 */
export const getQuoteValidityStats = createServerFn({ method: 'GET' })
  .inputValidator(z.object({}))
  .handler(async () => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Base conditions
    const baseConditions = [
      eq(opportunities.organizationId, ctx.organizationId),
      notInArray(opportunities.stage, ['won', 'lost']),
    ];

    // Single query with SUM(CASE WHEN ...) to replace 4 separate COUNT queries
    const [stats] = await db
      .select({
        expired: sql<number>`SUM(CASE WHEN ${opportunities.quoteExpiresAt} IS NOT NULL AND ${opportunities.quoteExpiresAt} < ${now} THEN 1 ELSE 0 END)`,
        expiringSoon: sql<number>`SUM(CASE WHEN ${opportunities.quoteExpiresAt} IS NOT NULL AND ${opportunities.quoteExpiresAt} > ${now} AND ${opportunities.quoteExpiresAt} <= ${sevenDaysFromNow} THEN 1 ELSE 0 END)`,
        valid: sql<number>`SUM(CASE WHEN ${opportunities.quoteExpiresAt} IS NOT NULL AND ${opportunities.quoteExpiresAt} > ${sevenDaysFromNow} THEN 1 ELSE 0 END)`,
        noExpiration: sql<number>`SUM(CASE WHEN ${opportunities.quoteExpiresAt} IS NULL THEN 1 ELSE 0 END)`,
        total: sql<number>`COUNT(*)`,
      })
      .from(opportunities)
      .where(and(...baseConditions));

    return {
      expired: Number(stats?.expired ?? 0),
      expiringSoon: Number(stats?.expiringSoon ?? 0),
      valid: Number(stats?.valid ?? 0),
      noExpiration: Number(stats?.noExpiration ?? 0),
      total: Number(stats?.total ?? 0),
    };
  });

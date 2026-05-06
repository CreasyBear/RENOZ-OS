/**
 * Quote PDF Server Functions
 *
 * Owns quote PDF document rendering, storage upload, generated-document
 * persistence, and quote PDF URL updates for Pipeline quotes.
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { quoteVersionParamsSchema, type GenerateQuotePdfResult } from '@/lib/schemas';
import { NotFoundError, ServerError } from '@/lib/server/errors';
import { withAuth } from '@/lib/server/protected';
import { createActivityLogger } from '@/lib/activity-logger';
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
import {
  addresses,
  customers,
  generatedDocuments,
  opportunities,
  quoteVersions,
} from 'drizzle/schema';
import { DEFAULT_QUOTE_VALIDITY_DAYS } from './quote-validity-constants';

const STORAGE_BUCKET = 'documents';

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

/**
 * Generate a PDF for a quote version.
 * Returns a URL to the generated PDF in Supabase storage.
 */
export const generateQuotePdf = createServerFn({ method: 'POST' })
  .inputValidator(quoteVersionParamsSchema)
  .handler(async ({ data }): Promise<GenerateQuotePdfResult> => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const { id } = data;

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

    const [shippingAddress] = await db
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
          eq(addresses.type, 'shipping'),
          eq(addresses.isPrimary, true)
        )
      )
      .limit(1);

    const [primaryAddress] = await db
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

    const issueDate = new Date(quoteVersion.createdAt);
    const validUntil = opp.quoteExpiresAt
      ? new Date(opp.quoteExpiresAt)
      : new Date(issueDate.getTime() + DEFAULT_QUOTE_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

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
          address: primaryAddress
            ? {
                addressLine1: primaryAddress.street1,
                addressLine2: primaryAddress.street2,
                city: primaryAddress.city,
                state: primaryAddress.state,
                postalCode: primaryAddress.postcode,
                country: primaryAddress.country,
              }
            : undefined,
        },
        billingAddress: billingAddress
          ? {
              addressLine1: billingAddress.street1,
              addressLine2: billingAddress.street2,
              city: billingAddress.city,
              state: billingAddress.state,
              postalCode: billingAddress.postcode,
              country: billingAddress.country,
            }
          : primaryAddress
            ? {
                addressLine1: primaryAddress.street1,
                addressLine2: primaryAddress.street2,
                city: primaryAddress.city,
                state: primaryAddress.state,
                postalCode: primaryAddress.postcode,
                country: primaryAddress.country,
              }
            : undefined,
        shippingAddress: shippingAddress
          ? {
              addressLine1: shippingAddress.street1,
              addressLine2: shippingAddress.street2,
              city: shippingAddress.city,
              state: shippingAddress.state,
              postalCode: shippingAddress.postcode,
              country: shippingAddress.country,
            }
          : undefined,
        lineItems: (quoteVersion.items || []).map((item: QuoteVersionItemRaw, index: number) => {
          const unitPrice = 'unitPrice' in item ? item.unitPrice : (item.unitPriceCents ?? 0) / 100;
          const total =
            'total' in item
              ? item.total
              : item.totalCents
                ? item.totalCents / 100
                : item.quantity * (unitPrice ?? 0);

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

    const { buffer } = await renderPdfToBuffer(
      <QuotePdfDocument organization={orgData} data={quoteData} />
    );

    const filename = generateFilename(
      'quote',
      `${opp.title.slice(0, 20)}-V${quoteVersion.versionNumber}`
    );
    const storagePath = generateStoragePath(ctx.organizationId, 'quote', filename);
    const checksum = await calculateChecksum(buffer);

    const supabase = createAdminSupabase();

    const { error: uploadError } = await supabase
      .storage.from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      throw new ServerError('Unable to upload quote PDF', 500, 'QUOTE_PDF_UPLOAD_FAILED');
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage.from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

    const signedUrl = signedUrlData?.signedUrl;
    if (signedUrlError || !signedUrl) {
      throw new ServerError(
        'Unable to prepare quote PDF download',
        500,
        'QUOTE_PDF_URL_FAILED'
      );
    }

    const [upsertResult] = await db
      .insert(generatedDocuments)
      .values({
        organizationId: ctx.organizationId,
        documentType: 'quote',
        entityType: 'opportunity',
        entityId: opp.id,
        filename,
        storageUrl: signedUrl,
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
          storageUrl: signedUrl,
          fileSize: buffer.length,
          generatedById: ctx.user.id,
          generatedAt: new Date(),
          updatedAt: new Date(),
          regenerationCount: sql`${generatedDocuments.regenerationCount} + 1`,
        },
      })
      .returning({
        id: generatedDocuments.id,
        regenerationCount: generatedDocuments.regenerationCount,
      });

    if (!upsertResult) {
      throw new ServerError(
        'Unable to persist quote PDF document',
        500,
        'QUOTE_PDF_DOCUMENT_PERSIST_FAILED'
      );
    }

    const isRegeneration = upsertResult.regenerationCount > 0;

    const [updatedOpportunity] = await db
      .update(opportunities)
      .set({ quotePdfUrl: signedUrl })
      .where(and(eq(opportunities.id, opp.id), eq(opportunities.organizationId, ctx.organizationId)))
      .returning({ id: opportunities.id });

    if (!updatedOpportunity) {
      throw new NotFoundError('Opportunity not found', 'opportunity');
    }

    const activityLogger = createActivityLogger({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
    });
    activityLogger.logAsync({
      entityType: 'opportunity',
      entityId: opp.id,
      action: 'exported',
      entityName: opp.title,
      description: isRegeneration
        ? `Regenerated quote PDF (version ${upsertResult.regenerationCount})`
        : `Generated quote PDF`,
      metadata: {
        documentType: 'quote',
        filename,
        fileSize: buffer.length,
        isRegeneration,
        regenerationCount: upsertResult.regenerationCount,
        quoteVersionId: id,
      },
    });

    return {
      quoteVersionId: id,
      pdfUrl: signedUrl,
      filename,
      fileSize: buffer.length,
      checksum,
      status: 'completed' as const,
    };
  });

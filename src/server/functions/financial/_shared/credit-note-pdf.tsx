/**
 * Credit note PDF assembly and storage helper.
 */

import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { addresses } from 'drizzle/schema';
import {
  NotFoundError,
  ServerError,
  ValidationError,
} from '@/lib/server/errors';
import type { SessionContext } from '@/lib/server/protected';
import { fetchOrganizationForDocument } from '@/server/functions/documents/organization-for-pdf';
import { idParamSchema, creditNoteStatusSchema } from '@/lib/schemas';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import { createAdminSupabase } from '@/lib/supabase/server';
import {
  renderPdfToBuffer,
  CreditNotePdfDocument,
  generateFilename,
  generateStoragePath,
  type CreditNoteDocumentData,
} from '@/lib/documents';
import { readCreditNote } from './credit-note-read';
import type { z } from 'zod';

const STORAGE_BUCKET = 'documents';

async function fetchCustomerAddressForPdf(
  customerId: string,
  organizationId: string,
) {
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
        eq(addresses.customerId, customerId),
        eq(addresses.organizationId, organizationId),
        eq(addresses.type, 'billing'),
        eq(addresses.isPrimary, true),
      ),
    )
    .limit(1);

  if (!billingAddress) {
    // Fallback to any primary address
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
          eq(addresses.customerId, customerId),
          eq(addresses.organizationId, organizationId),
          eq(addresses.isPrimary, true),
        ),
      )
      .limit(1);
    return anyPrimary;
  }

  return billingAddress;
}

export async function generateCreditNotePdfDocument(
  ctx: SessionContext,
  data: z.infer<typeof idParamSchema>,
): Promise<{ url: string; filename: string; fileSize: number }> {
  // Fetch credit note with relations
  const creditNoteData = await readCreditNote(ctx, data);

  if (!creditNoteData.customer) {
    throw new NotFoundError('Customer not found for credit note', 'customer');
  }

  // Fetch organization and customer address
  const [orgData, customerAddress] = await Promise.all([
    fetchOrganizationForDocument(ctx.organizationId),
    fetchCustomerAddressForPdf(creditNoteData.customerId, ctx.organizationId),
  ]);

  // Validate credit note number (required for PDF)
  if (!creditNoteData.creditNoteNumber) {
    throw new ValidationError(
      'Credit note number is required for PDF generation',
      {
        credit_note: ['Credit note number is required for PDF generation'],
      },
    );
  }

  // Validate status with Zod enum instead of type assertion
  const statusResult = creditNoteStatusSchema.safeParse(creditNoteData.status);
  if (!statusResult.success) {
    throw new ValidationError(
      `Invalid credit note status: ${creditNoteData.status}`,
      {
        credit_note: statusResult.error.issues.map((e) => e.message),
      },
    );
  }

  // Build credit note document data
  const creditNoteDocumentData: CreditNoteDocumentData = {
    documentNumber: creditNoteData.creditNoteNumber,
    issueDate: creditNoteData.createdAt
      ? new Date(creditNoteData.createdAt)
      : new Date(),
    customer: {
      id: creditNoteData.customer.id,
      name: creditNoteData.customer.name,
      email: creditNoteData.customer.email,
      phone: creditNoteData.customer.phone,
      address: customerAddress
        ? {
            addressLine1: customerAddress.street1,
            addressLine2: customerAddress.street2,
            city: customerAddress.city,
            state: customerAddress.state,
            postalCode: customerAddress.postcode,
            country: customerAddress.country,
          }
        : null,
    },
    amount: Number(creditNoteData.amount) || 0,
    gstAmount: Number(creditNoteData.gstAmount) || 0,
    reason: creditNoteData.reason || '',
    relatedOrderNumber: creditNoteData.order?.orderNumber ?? null,
    relatedOrderId: creditNoteData.orderId ?? null,
    status: statusResult.data,
    appliedToOrderId: creditNoteData.appliedToOrderId ?? null,
    appliedAt: creditNoteData.appliedAt
      ? new Date(creditNoteData.appliedAt)
      : null,
  };

  // Render PDF to buffer
  const { buffer } = await renderPdfToBuffer(
    <CreditNotePdfDocument
      organization={orgData}
      data={creditNoteDocumentData}
    />,
  );

  // Upload to storage
  const filename = generateFilename(
    'credit-note',
    creditNoteData.creditNoteNumber,
  );
  const storagePath = generateStoragePath(
    ctx.organizationId,
    'credit-note',
    filename,
  );

  const supabase = createAdminSupabase();
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    throw new ServerError(`Failed to upload PDF: ${uploadError.message}`);
  }

  // Generate signed URL (valid for 1 year)
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

  if (signedUrlError) {
    throw new ServerError(
      `Failed to generate signed URL: ${signedUrlError.message}`,
    );
  }

  // Log activity
  const logger = createActivityLoggerWithContext(ctx);
  logger.logAsync({
    entityType: 'order',
    entityId: data.id,
    action: 'exported',
    description: `Generated credit note PDF: ${creditNoteData.creditNoteNumber}`,
    metadata: {
      creditNoteNumber: creditNoteData.creditNoteNumber,
      filename,
      fileSize: buffer.length,
    },
  });

  return {
    url: signedUrlData.signedUrl,
    filename,
    fileSize: buffer.length,
  };
}

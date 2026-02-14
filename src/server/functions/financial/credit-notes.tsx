/**
 * Credit Notes Server Functions
 *
 * CRUD operations for credit notes and balance application.
 * Credit notes handle battery equipment returns, adjustments, and refunds.
 *
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json for DOM-FIN-001b
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, desc, asc, isNull, or, ilike, like, count, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { containsPattern } from '@/lib/db/utils';
import { creditNotes, customers, orders, addresses } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError, ValidationError, ConflictError, ServerError } from '@/lib/server/errors';
import { fetchOrganizationForDocument } from '@/server/functions/documents/organization-for-pdf';
import {
  idParamSchema,
  createCreditNoteSchema,
  updateCreditNoteSchema,
  applyCreditNoteSchema,
  voidCreditNoteSchema,
  creditNoteListQuerySchema,
  creditNotesByCustomerQuerySchema,
  creditNoteStatusSchema,
  type ListCreditNotesResult,
} from '@/lib/schemas';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import { computeChanges } from '@/lib/activity-logger';
import { calculateGst } from '@/lib/utils/financial';
import { createAdminSupabase } from '@/lib/supabase/server';
import {
  renderPdfToBuffer,
  generateQRCode,
  CreditNotePdfDocument,
  generateFilename,
  generateStoragePath,
  type CreditNoteDocumentData,
} from '@/lib/documents';
import { buildDocumentViewUrl } from '@/lib/documents/urls';

// Excluded fields for activity logging (system-managed fields)
const CREDIT_NOTE_EXCLUDED_FIELDS: string[] = [
  'updatedAt',
  'updatedBy',
  'createdAt',
  'createdBy',
  'deletedAt',
  'organizationId',
];

// ============================================================================
// TYPES
// ============================================================================

type CreditNoteRecord = typeof creditNotes.$inferSelect;

interface CreditNoteWithRelations extends CreditNoteRecord {
  customer: typeof customers.$inferSelect | null;
  order: typeof orders.$inferSelect | null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique credit note number for the organization.
 * Format: CN-YYYYMM-XXXX (e.g., CN-202601-0001)
 */
async function generateCreditNoteNumber(organizationId: string): Promise<string> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `CN-${yearMonth}-`;

  // Get the highest number for this month
  const result = await db
    .select({ creditNoteNumber: creditNotes.creditNoteNumber })
    .from(creditNotes)
    .where(
      and(
        eq(creditNotes.organizationId, organizationId),
        like(creditNotes.creditNoteNumber, `${prefix}%`)
      )
    )
    .orderBy(desc(creditNotes.creditNoteNumber))
    .limit(1);

  let nextNumber = 1;
  if (result.length > 0 && result[0].creditNoteNumber) {
    const currentNumber = parseInt(result[0].creditNoteNumber.slice(-4), 10);
    nextNumber = currentNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}


// ============================================================================
// CREATE CREDIT NOTE
// ============================================================================

/**
 * Create a new credit note (starts in draft status).
 * Includes retry logic for unique constraint violations on credit note number.
 */
export const createCreditNote = createServerFn({ method: 'POST' })
  .inputValidator(createCreditNoteSchema)
  .handler(async ({ data }): Promise<CreditNoteRecord> => {
    const ctx = await withAuth({ permission: PERMISSIONS.financial.create });

    // Verify customer exists and belongs to organization
    const customer = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, data.customerId),
          eq(customers.organizationId, ctx.organizationId),
          isNull(customers.deletedAt)
        )
      )
      .limit(1);

    if (customer.length === 0) {
      throw new NotFoundError('Customer not found', 'customer');
    }

    // Verify order if provided
    if (data.orderId) {
      const order = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.id, data.orderId),
            eq(orders.organizationId, ctx.organizationId),
            isNull(orders.deletedAt)
          )
        )
        .limit(1);

      if (order.length === 0) {
        throw new NotFoundError('Order not found', 'order');
      }

      // Verify order belongs to customer
      if (order[0].customerId !== data.customerId) {
        throw new ValidationError('Order does not belong to specified customer');
      }
    }

    // Calculate GST if not provided
    const gstAmount = data.gstAmount ?? calculateGst(data.amount);

    // Retry up to 3 times on duplicate number (race condition handling)
    const maxAttempts = 3;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        // Generate credit note number fresh on each attempt
        const creditNoteNumber = await generateCreditNoteNumber(ctx.organizationId);

        // Create credit note
        const [creditNote] = await db
          .insert(creditNotes)
          .values({
            organizationId: ctx.organizationId,
            creditNoteNumber,
            customerId: data.customerId,
            orderId: data.orderId,
            amount: data.amount,
            gstAmount,
            reason: data.reason,
            internalNotes: data.internalNotes,
            status: 'draft',
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          })
          .returning();

        // Activity logging
        const logger = createActivityLoggerWithContext(ctx);
        logger.logAsync({
          entityType: 'order', // Credit notes relate to orders/invoices
          entityId: creditNote.id,
          action: 'created',
          description: `Created credit note: ${creditNote.creditNoteNumber}`,
          changes: computeChanges({
            before: null,
            after: creditNote,
            excludeFields: CREDIT_NOTE_EXCLUDED_FIELDS as never[],
          }),
          metadata: {
            creditNoteNumber: creditNote.creditNoteNumber ?? undefined,
            customerId: creditNote.customerId,
            customerName: customer[0].name,
            orderId: creditNote.orderId ?? undefined,
            total: Number(creditNote.amount),
            status: creditNote.status,
          },
        });

        return creditNote;
      } catch (err: unknown) {
        // PostgreSQL unique violation error code is '23505'
        const pgError = err as { code?: string };
        if (pgError.code === '23505' && attempts < maxAttempts - 1) {
          attempts++;
          // Small delay before retry to reduce collision probability
          await new Promise((resolve) => setTimeout(resolve, 50 * attempts));
          continue;
        }
        throw err;
      }
    }

    // This should never be reached, but TypeScript needs it
    throw new ServerError('Failed to generate unique credit note number after retries');
  });

// ============================================================================
// GET CREDIT NOTE
// ============================================================================

/**
 * Get a single credit note by ID with relations.
 */
export const getCreditNote = createServerFn({ method: 'GET' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }): Promise<CreditNoteWithRelations> => {
    const ctx = await withAuth();

    const result = await db
      .select({
        creditNote: creditNotes,
        customer: customers,
        order: orders,
      })
      .from(creditNotes)
      .leftJoin(customers, eq(creditNotes.customerId, customers.id))
      .leftJoin(orders, eq(creditNotes.orderId, orders.id))
      .where(
        and(
          eq(creditNotes.id, data.id),
          eq(creditNotes.organizationId, ctx.organizationId),
          isNull(creditNotes.deletedAt)
        )
      )
      .limit(1);

    if (result.length === 0) {
      throw new NotFoundError('Credit note not found', 'credit_note');
    }

    return {
      ...result[0].creditNote,
      customer: result[0].customer,
      order: result[0].order,
    };
  });

// ============================================================================
// LIST CREDIT NOTES
// ============================================================================

/**
 * List credit notes with filtering, sorting, and pagination.
 */
export const listCreditNotes = createServerFn({ method: 'GET' })
  .inputValidator(creditNoteListQuerySchema)
  .handler(async ({ data }): Promise<ListCreditNotesResult> => {
    const ctx = await withAuth();
    const {
      page = 1,
      pageSize = 20,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status,
      customerId,
      orderId,
    } = data;

    const limit = pageSize;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [
      eq(creditNotes.organizationId, ctx.organizationId),
      isNull(creditNotes.deletedAt),
    ];

    if (status) {
      conditions.push(eq(creditNotes.status, status));
    }

    if (customerId) {
      conditions.push(eq(creditNotes.customerId, customerId));
    }

    if (orderId) {
      conditions.push(eq(creditNotes.orderId, orderId));
    }

    if (search) {
      conditions.push(
        or(
          ilike(creditNotes.creditNoteNumber, containsPattern(search)),
          ilike(creditNotes.reason, containsPattern(search))
        )!
      );
    }

    const whereClause = and(...conditions);

    // Get total count
    const countResult = await db
      .select({ count: count() })
      .from(creditNotes)
      .where(whereClause);

    const total = countResult[0]?.count ?? 0;

    // Get items with relations
    const orderColumn =
      sortBy === 'amount'
        ? creditNotes.amount
        : sortBy === 'status'
          ? creditNotes.status
          : creditNotes.createdAt;

    const items = await db
      .select({
        creditNote: creditNotes,
        customer: customers,
        order: orders,
      })
      .from(creditNotes)
      .leftJoin(customers, eq(creditNotes.customerId, customers.id))
      .leftJoin(orders, eq(creditNotes.orderId, orders.id))
      .where(whereClause)
      .orderBy(sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn))
      .limit(limit)
      .offset(offset);

    // Get summary totals
    const totalsResult = await db
      .select({
        totalAmount: sql<number>`COALESCE(SUM(${creditNotes.amount}), 0)::numeric`,
        draftCount: sql<number>`COUNT(*) FILTER (WHERE ${creditNotes.status} = 'draft')::int`,
        issuedCount: sql<number>`COUNT(*) FILTER (WHERE ${creditNotes.status} = 'issued')::int`,
        appliedCount: sql<number>`COUNT(*) FILTER (WHERE ${creditNotes.status} = 'applied')::int`,
      })
      .from(creditNotes)
      .where(whereClause);

    // Map to schema-compliant response type (issuedAt/voidedAt/voidReason not in DB yet)
    const mappedItems: ListCreditNotesResult['items'] = items.map((row) => ({
      ...row.creditNote,
      issuedAt: null,
      voidedAt: null,
      voidReason: null,
      customer: row.customer
        ? {
            id: row.customer.id,
            name: row.customer.name,
            email: row.customer.email,
            phone: row.customer.phone,
          }
        : null,
      order: row.order
        ? {
            id: row.order.id,
            orderNumber: row.order.orderNumber,
          }
        : null,
    }));

    return {
      items: mappedItems,
      total,
      page,
      limit,
      hasMore: offset + items.length < total,
      totals: {
        totalAmount: Number(totalsResult[0]?.totalAmount ?? 0),
        draftCount: totalsResult[0]?.draftCount ?? 0,
        issuedCount: totalsResult[0]?.issuedCount ?? 0,
        appliedCount: totalsResult[0]?.appliedCount ?? 0,
      },
    };
  });

// ============================================================================
// GET CREDIT NOTES BY CUSTOMER
// ============================================================================

/**
 * Get credit notes for a specific customer (for customer detail view).
 */
export const getCreditNotesByCustomer = createServerFn({ method: 'GET' })
  .inputValidator(creditNotesByCustomerQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const { customerId, page = 1, pageSize = 10, includeApplied } = data;

    const limit = pageSize;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [
      eq(creditNotes.organizationId, ctx.organizationId),
      eq(creditNotes.customerId, customerId),
      isNull(creditNotes.deletedAt),
    ];

    // Optionally exclude applied credit notes
    if (!includeApplied) {
      conditions.push(or(eq(creditNotes.status, 'draft'), eq(creditNotes.status, 'issued'))!);
    }

    const whereClause = and(...conditions);

    // Get total
    const countResult = await db
      .select({ count: count() })
      .from(creditNotes)
      .where(whereClause);

    const total = countResult[0]?.count ?? 0;

    // Get items
    const items = await db
      .select()
      .from(creditNotes)
      .where(whereClause)
      .orderBy(desc(creditNotes.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total available credit (issued but not applied)
    const availableResult = await db
      .select({
        totalAvailable: sql<number>`COALESCE(SUM(${creditNotes.amount}), 0)::numeric`,
      })
      .from(creditNotes)
      .where(
        and(
          eq(creditNotes.organizationId, ctx.organizationId),
          eq(creditNotes.customerId, customerId),
          eq(creditNotes.status, 'issued'),
          isNull(creditNotes.deletedAt)
        )
      );

    return {
      items,
      total,
      page,
      limit,
      hasMore: offset + items.length < total,
      totalAvailableCredit: Number(availableResult[0]?.totalAvailable ?? 0),
    };
  });

// ============================================================================
// UPDATE CREDIT NOTE
// ============================================================================

/**
 * Update a credit note (only drafts can be updated).
 */
export const updateCreditNote = createServerFn({ method: 'POST' })
  .inputValidator(idParamSchema.merge(updateCreditNoteSchema))
  .handler(async ({ data }): Promise<CreditNoteRecord> => {
    const ctx = await withAuth({ permission: PERMISSIONS.financial.update });
    const { id, ...updateData } = data;

    // Get existing credit note
    const existing = await db
      .select()
      .from(creditNotes)
      .where(
        and(
          eq(creditNotes.id, id),
          eq(creditNotes.organizationId, ctx.organizationId),
          isNull(creditNotes.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundError('Credit note not found', 'credit_note');
    }

    // Only drafts can be updated
    if (existing[0].status !== 'draft') {
      throw new ConflictError('Only draft credit notes can be updated');
    }

    // Recalculate GST if amount changed and GST not explicitly provided
    const updates: Partial<CreditNoteRecord> = {
      ...updateData,
      updatedBy: ctx.user.id,
    };

    if (updateData.amount && !updateData.gstAmount) {
      updates.gstAmount = calculateGst(updateData.amount);
    }

    // Update
    const [updated] = await db
      .update(creditNotes)
      .set(updates)
      .where(eq(creditNotes.id, id))
      .returning();

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'order',
      entityId: updated.id,
      action: 'updated',
      description: `Updated credit note: ${updated.creditNoteNumber}`,
      changes: computeChanges({
        before: existing[0],
        after: updated,
        excludeFields: CREDIT_NOTE_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        creditNoteNumber: updated.creditNoteNumber ?? undefined,
        customerId: updated.customerId,
        changedFields: Object.keys(updateData),
      },
    });

    return updated;
  });

// ============================================================================
// ISSUE CREDIT NOTE
// ============================================================================

/**
 * Issue a draft credit note (transition from draft to issued).
 */
export const issueCreditNote = createServerFn({ method: 'POST' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }): Promise<CreditNoteRecord> => {
    const ctx = await withAuth({ permission: PERMISSIONS.financial.update });

    // Get existing credit note
    const existing = await db
      .select()
      .from(creditNotes)
      .where(
        and(
          eq(creditNotes.id, data.id),
          eq(creditNotes.organizationId, ctx.organizationId),
          isNull(creditNotes.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundError('Credit note not found', 'credit_note');
    }

    if (existing[0].status !== 'draft') {
      throw new ConflictError('Only draft credit notes can be issued');
    }

    // Issue
    const [issued] = await db
      .update(creditNotes)
      .set({
        status: 'issued',
        updatedBy: ctx.user.id,
      })
      .where(eq(creditNotes.id, data.id))
      .returning();

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'order',
      entityId: issued.id,
      action: 'updated',
      description: `Issued credit note: ${issued.creditNoteNumber}`,
      changes: computeChanges({
        before: existing[0],
        after: issued,
        excludeFields: CREDIT_NOTE_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        creditNoteNumber: issued.creditNoteNumber ?? undefined,
        customerId: issued.customerId,
        previousStatus: existing[0].status,
        newStatus: issued.status,
        total: Number(issued.amount),
      },
    });

    return issued;
  });

// ============================================================================
// APPLY CREDIT NOTE TO INVOICE
// ============================================================================

/**
 * Apply a credit note to an order/invoice.
 * Adjusts the order's paid amount and balance due.
 */
export const applyCreditNoteToInvoice = createServerFn({ method: 'POST' })
  .inputValidator(applyCreditNoteSchema)
  .handler(async ({ data }): Promise<CreditNoteRecord> => {
    const ctx = await withAuth({ permission: PERMISSIONS.financial.update });

    // Get credit note
    const creditNote = await db
      .select()
      .from(creditNotes)
      .where(
        and(
          eq(creditNotes.id, data.creditNoteId),
          eq(creditNotes.organizationId, ctx.organizationId),
          isNull(creditNotes.deletedAt)
        )
      )
      .limit(1);

    if (creditNote.length === 0) {
      throw new NotFoundError('Credit note not found', 'credit_note');
    }

    if (creditNote[0].status !== 'issued') {
      throw new ConflictError('Only issued credit notes can be applied');
    }

    // Get target order
    const order = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, data.orderId),
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt)
        )
      )
      .limit(1);

    if (order.length === 0) {
      throw new NotFoundError('Order not found', 'order');
    }

    // Verify order belongs to same customer
    if (order[0].customerId !== creditNote[0].customerId) {
      throw new ValidationError('Credit note and order must belong to the same customer');
    }

    // Calculate new balance
    const creditAmount = creditNote[0].amount;
    const currentPaid = order[0].paidAmount ?? 0;
    const currentBalance = order[0].balanceDue ?? order[0].total ?? 0;

    const newPaidAmount = currentPaid + creditAmount;
    const newBalanceDue = Math.max(0, currentBalance - creditAmount);

    // Update in transaction
    await db.transaction(async (tx) => {
      // Apply credit note
      await tx
        .update(creditNotes)
        .set({
          status: 'applied',
          appliedToOrderId: data.orderId,
          appliedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(creditNotes.id, data.creditNoteId));

      // Update order balance
      await tx
        .update(orders)
        .set({
          paidAmount: newPaidAmount,
          balanceDue: newBalanceDue,
          paymentStatus: newBalanceDue <= 0 ? 'paid' : 'partial',
          updatedBy: ctx.user.id,
        })
        .where(eq(orders.id, data.orderId));
    });

    // Return updated credit note
    const [updated] = await db
      .select()
      .from(creditNotes)
      .where(eq(creditNotes.id, data.creditNoteId));

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'order',
      entityId: updated.id,
      action: 'updated',
      description: `Applied credit note ${updated.creditNoteNumber} to order`,
      changes: computeChanges({
        before: creditNote[0],
        after: updated,
        excludeFields: CREDIT_NOTE_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        creditNoteNumber: updated.creditNoteNumber ?? undefined,
        customerId: updated.customerId,
        orderId: data.orderId,
        orderNumber: order[0].orderNumber ?? undefined,
        previousStatus: creditNote[0].status,
        newStatus: updated.status,
        total: Number(updated.amount),
      },
    });

    return updated;
  });

// ============================================================================
// VOID CREDIT NOTE
// ============================================================================

/**
 * Void a credit note (draft or issued only).
 */
export const voidCreditNote = createServerFn({ method: 'POST' })
  .inputValidator(voidCreditNoteSchema)
  .handler(async ({ data }): Promise<CreditNoteRecord> => {
    const ctx = await withAuth({ permission: PERMISSIONS.financial.delete });

    // Get existing credit note
    const existing = await db
      .select()
      .from(creditNotes)
      .where(
        and(
          eq(creditNotes.id, data.id),
          eq(creditNotes.organizationId, ctx.organizationId),
          isNull(creditNotes.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundError('Credit note not found', 'credit_note');
    }

    if (existing[0].status === 'applied') {
      throw new ConflictError(
        'Applied credit notes cannot be voided. Reverse the application first.'
      );
    }

    if (existing[0].status === 'voided') {
      throw new ConflictError('Credit note is already voided');
    }

    // Void
    const [voided] = await db
      .update(creditNotes)
      .set({
        status: 'voided',
        internalNotes: existing[0].internalNotes
          ? `${existing[0].internalNotes}\n\nVoided: ${data.voidReason}`
          : `Voided: ${data.voidReason}`,
        updatedBy: ctx.user.id,
      })
      .where(eq(creditNotes.id, data.id))
      .returning();

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'order',
      entityId: voided.id,
      action: 'updated',
      description: `Voided credit note: ${voided.creditNoteNumber}`,
      changes: computeChanges({
        before: existing[0],
        after: voided,
        excludeFields: CREDIT_NOTE_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        creditNoteNumber: voided.creditNoteNumber ?? undefined,
        customerId: voided.customerId,
        previousStatus: existing[0].status,
        newStatus: voided.status,
        reason: data.voidReason,
      },
    });

    return voided;
  });

// ============================================================================
// GENERATE CREDIT NOTE PDF
// ============================================================================

const STORAGE_BUCKET = 'documents';

/**
 * Fetch customer address for PDF
 */
async function fetchCustomerAddressForPdf(customerId: string, organizationId: string) {
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
        eq(addresses.isPrimary, true)
      )
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
          eq(addresses.isPrimary, true)
        )
      )
      .limit(1);
    return anyPrimary;
  }

  return billingAddress;
}

/**
 * Generate Credit Note PDF synchronously
 * 
 * Returns PDF URL immediately for download/preview.
 */
export const generateCreditNotePdf = createServerFn({ method: 'POST' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }): Promise<{ url: string; filename: string; fileSize: number }> => {
    const ctx = await withAuth({ permission: PERMISSIONS.financial.read });

    // Fetch credit note with relations
    const creditNoteData = await getCreditNote({ data });

    if (!creditNoteData.customer) {
      throw new NotFoundError('Customer not found for credit note', 'customer');
    }

    // Fetch organization and customer address
    const [orgData, customerAddress] = await Promise.all([
      fetchOrganizationForDocument(ctx.organizationId),
      fetchCustomerAddressForPdf(creditNoteData.customerId, ctx.organizationId),
    ]);

    // Generate QR code
    const documentUrl = buildDocumentViewUrl('credit_note', data.id);
    const qrCodeDataUrl = await generateQRCode(documentUrl, {
      width: 240,
      margin: 0,
      errorCorrectionLevel: 'M',
    });

    // Validate credit note number (required for PDF)
    if (!creditNoteData.creditNoteNumber) {
      throw new ValidationError('Credit note number is required for PDF generation', {
        credit_note: ['Credit note number is required for PDF generation'],
      });
    }

    // Validate status with Zod enum instead of type assertion
    const statusResult = creditNoteStatusSchema.safeParse(creditNoteData.status);
    if (!statusResult.success) {
      throw new ValidationError(`Invalid credit note status: ${creditNoteData.status}`, {
        credit_note: statusResult.error.issues.map((e) => e.message),
      });
    }

    // Build credit note document data
    const creditNoteDocumentData: CreditNoteDocumentData = {
      documentNumber: creditNoteData.creditNoteNumber,
      issueDate: creditNoteData.createdAt ? new Date(creditNoteData.createdAt) : new Date(),
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
      appliedAt: creditNoteData.appliedAt ? new Date(creditNoteData.appliedAt) : null,
    };

    // Render PDF to buffer
    const { buffer } = await renderPdfToBuffer(
      <CreditNotePdfDocument organization={orgData} data={creditNoteDocumentData} qrCodeDataUrl={qrCodeDataUrl} viewOnlineUrl={documentUrl} />
    );

    // Upload to storage
    const filename = generateFilename('credit-note', creditNoteData.creditNoteNumber);
    const storagePath = generateStoragePath(ctx.organizationId, 'credit-note', filename);

    const supabase = createAdminSupabase();
    const { error: uploadError } = await supabase
      .storage.from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      throw new ServerError(`Failed to upload PDF: ${uploadError.message}`);
    }

    // Generate signed URL (valid for 1 year)
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage.from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

    if (signedUrlError) {
      throw new ServerError(`Failed to generate signed URL: ${signedUrlError.message}`);
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
  });

/**
 * Credit note mutation helpers.
 */

import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { creditNotes, customers, orders } from 'drizzle/schema';
import {
  ConflictError,
  NotFoundError,
  ServerError,
  ValidationError,
} from '@/lib/server/errors';
import type { SessionContext } from '@/lib/server/protected';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import { computeChanges } from '@/lib/activity-logger';
import { calculateGst } from '@/lib/utils/financial';
import {
  applyCreditNoteSchema,
  createCreditNoteSchema,
  idParamSchema,
  updateCreditNoteSchema,
  voidCreditNoteSchema,
} from '@/lib/schemas';
import { recalculateOrderFinancialProjection } from './order-financial-projection';
import { generateCreditNoteNumber } from './credit-note-numbering';
import type { z } from 'zod';

const CREDIT_NOTE_EXCLUDED_FIELDS: string[] = [
  'updatedAt',
  'updatedBy',
  'createdAt',
  'createdBy',
  'deletedAt',
  'organizationId',
];
type CreditNoteRecord = typeof creditNotes.$inferSelect;

export async function createCreditNoteRecord(
  ctx: SessionContext,
  data: z.infer<typeof createCreditNoteSchema>,
): Promise<CreditNoteRecord> {
  // Verify customer exists and belongs to organization
  const customer = await db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.id, data.customerId),
        eq(customers.organizationId, ctx.organizationId),
        isNull(customers.deletedAt),
      ),
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
          isNull(orders.deletedAt),
        ),
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
      const creditNoteNumber = await generateCreditNoteNumber(
        ctx.organizationId,
      );

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
  throw new ServerError(
    'Failed to generate unique credit note number after retries',
  );
}

export async function updateCreditNoteRecord(
  ctx: SessionContext,
  data: z.infer<typeof idParamSchema> & z.infer<typeof updateCreditNoteSchema>,
): Promise<CreditNoteRecord> {
  const { id, ...updateData } = data;

  // Get existing credit note
  const existing = await db
    .select()
    .from(creditNotes)
    .where(
      and(
        eq(creditNotes.id, id),
        eq(creditNotes.organizationId, ctx.organizationId),
        isNull(creditNotes.deletedAt),
      ),
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
}

export async function issueCreditNoteRecord(
  ctx: SessionContext,
  data: z.infer<typeof idParamSchema>,
): Promise<CreditNoteRecord> {
  // Get existing credit note
  const existing = await db
    .select()
    .from(creditNotes)
    .where(
      and(
        eq(creditNotes.id, data.id),
        eq(creditNotes.organizationId, ctx.organizationId),
        isNull(creditNotes.deletedAt),
      ),
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
}

export async function applyCreditNoteRecordToInvoice(
  ctx: SessionContext,
  data: z.infer<typeof applyCreditNoteSchema>,
): Promise<CreditNoteRecord> {
  // Get credit note
  const creditNote = await db
    .select()
    .from(creditNotes)
    .where(
      and(
        eq(creditNotes.id, data.creditNoteId),
        eq(creditNotes.organizationId, ctx.organizationId),
        isNull(creditNotes.deletedAt),
      ),
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
        isNull(orders.deletedAt),
      ),
    )
    .limit(1);

  if (order.length === 0) {
    throw new NotFoundError('Order not found', 'order');
  }

  // Verify order belongs to same customer
  if (order[0].customerId !== creditNote[0].customerId) {
    throw new ValidationError(
      'Credit note and order must belong to the same customer',
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(creditNotes)
      .set({
        status: 'applied',
        appliedToOrderId: data.orderId,
        appliedAt: new Date(),
        updatedBy: ctx.user.id,
      })
      .where(eq(creditNotes.id, data.creditNoteId));

    await recalculateOrderFinancialProjection(tx, {
      orderId: data.orderId,
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
    });
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
}

export async function voidCreditNoteRecord(
  ctx: SessionContext,
  data: z.infer<typeof voidCreditNoteSchema>,
): Promise<CreditNoteRecord> {
  // Get existing credit note
  const existing = await db
    .select()
    .from(creditNotes)
    .where(
      and(
        eq(creditNotes.id, data.id),
        eq(creditNotes.organizationId, ctx.organizationId),
        isNull(creditNotes.deletedAt),
      ),
    )
    .limit(1);

  if (existing.length === 0) {
    throw new NotFoundError('Credit note not found', 'credit_note');
  }

  if (existing[0].status === 'applied') {
    throw new ConflictError(
      'Applied credit notes cannot be voided. Reverse the application first.',
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
}

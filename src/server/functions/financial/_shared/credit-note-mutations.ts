/**
 * Credit note mutation helpers.
 */

import { and, eq, isNull, sql } from 'drizzle-orm';
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

  // Recalculate GST if amount changed and GST not explicitly provided
  const updates: Partial<CreditNoteRecord> = {
    ...updateData,
    updatedBy: ctx.user.id,
  };

  if (updateData.amount && !updateData.gstAmount) {
    updates.gstAmount = calculateGst(updateData.amount);
  }

  const result = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
    );

    const [existing] = await tx
      .select()
      .from(creditNotes)
      .where(
        and(
          eq(creditNotes.id, id),
          eq(creditNotes.organizationId, ctx.organizationId),
          isNull(creditNotes.deletedAt),
        ),
      )
      .for('update')
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Credit note not found', 'credit_note');
    }

    // Only drafts can be updated
    if (existing.status !== 'draft') {
      throw new ConflictError('Only draft credit notes can be updated');
    }

    const [updated] = await tx
      .update(creditNotes)
      .set(updates)
      .where(
        and(
          eq(creditNotes.id, id),
          eq(creditNotes.organizationId, ctx.organizationId),
          isNull(creditNotes.deletedAt),
        ),
      )
      .returning();

    if (!updated) {
      throw new NotFoundError('Credit note not found or already modified', 'credit_note');
    }

    return { existing, updated };
  });

  // Activity logging
  const logger = createActivityLoggerWithContext(ctx);
  logger.logAsync({
    entityType: 'order',
    entityId: result.updated.id,
    action: 'updated',
    description: `Updated credit note: ${result.updated.creditNoteNumber}`,
    changes: computeChanges({
      before: result.existing,
      after: result.updated,
      excludeFields: CREDIT_NOTE_EXCLUDED_FIELDS as never[],
    }),
    metadata: {
      creditNoteNumber: result.updated.creditNoteNumber ?? undefined,
      customerId: result.updated.customerId,
      changedFields: Object.keys(updateData),
    },
  });

  return result.updated;
}

export async function issueCreditNoteRecord(
  ctx: SessionContext,
  data: z.infer<typeof idParamSchema>,
): Promise<CreditNoteRecord> {
  const result = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
    );

    const [existing] = await tx
      .select()
      .from(creditNotes)
      .where(
        and(
          eq(creditNotes.id, data.id),
          eq(creditNotes.organizationId, ctx.organizationId),
          isNull(creditNotes.deletedAt),
        ),
      )
      .for('update')
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Credit note not found', 'credit_note');
    }

    if (existing.status !== 'draft') {
      throw new ConflictError('Only draft credit notes can be issued');
    }

    const [issued] = await tx
      .update(creditNotes)
      .set({
        status: 'issued',
        updatedBy: ctx.user.id,
      })
      .where(
        and(
          eq(creditNotes.id, data.id),
          eq(creditNotes.organizationId, ctx.organizationId),
          isNull(creditNotes.deletedAt),
        ),
      )
      .returning();

    if (!issued) {
      throw new NotFoundError('Credit note not found or already modified', 'credit_note');
    }

    return { existing, issued };
  });

  // Activity logging
  const logger = createActivityLoggerWithContext(ctx);
  logger.logAsync({
    entityType: 'order',
    entityId: result.issued.id,
    action: 'updated',
    description: `Issued credit note: ${result.issued.creditNoteNumber}`,
    changes: computeChanges({
      before: result.existing,
      after: result.issued,
      excludeFields: CREDIT_NOTE_EXCLUDED_FIELDS as never[],
    }),
    metadata: {
      creditNoteNumber: result.issued.creditNoteNumber ?? undefined,
      customerId: result.issued.customerId,
      previousStatus: result.existing.status,
      newStatus: result.issued.status,
      total: Number(result.issued.amount),
    },
  });

  return result.issued;
}

export async function applyCreditNoteRecordToInvoice(
  ctx: SessionContext,
  data: z.infer<typeof applyCreditNoteSchema>,
): Promise<CreditNoteRecord> {
  const result = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
    );

    const [creditNote] = await tx
      .select()
      .from(creditNotes)
      .where(
        and(
          eq(creditNotes.id, data.creditNoteId),
          eq(creditNotes.organizationId, ctx.organizationId),
          isNull(creditNotes.deletedAt),
        ),
      )
      .for('update')
      .limit(1);

    if (!creditNote) {
      throw new NotFoundError('Credit note not found', 'credit_note');
    }

    if (creditNote.status !== 'issued') {
      throw new ConflictError('Only issued credit notes can be applied');
    }

    const [order] = await tx
      .select({
        customerId: orders.customerId,
        orderNumber: orders.orderNumber,
      })
      .from(orders)
      .where(
        and(
          eq(orders.id, data.orderId),
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt),
        ),
      )
      .for('update')
      .limit(1);

    if (!order) {
      throw new NotFoundError('Order not found', 'order');
    }

    if (order.customerId !== creditNote.customerId) {
      throw new ValidationError(
        'Credit note and order must belong to the same customer',
      );
    }

    const [updated] = await tx
      .update(creditNotes)
      .set({
        status: 'applied',
        appliedToOrderId: data.orderId,
        appliedAt: new Date(),
        updatedBy: ctx.user.id,
      })
      .where(
        and(
          eq(creditNotes.id, data.creditNoteId),
          eq(creditNotes.organizationId, ctx.organizationId),
          isNull(creditNotes.deletedAt),
        ),
      )
      .returning();

    if (!updated) {
      throw new NotFoundError('Credit note not found or already modified', 'credit_note');
    }

    await recalculateOrderFinancialProjection(tx, {
      orderId: data.orderId,
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
    });

    return { before: creditNote, updated, order };
  });

  // Activity logging
  const logger = createActivityLoggerWithContext(ctx);
  logger.logAsync({
    entityType: 'order',
    entityId: result.updated.id,
    action: 'updated',
    description: `Applied credit note ${result.updated.creditNoteNumber} to order`,
    changes: computeChanges({
      before: result.before,
      after: result.updated,
      excludeFields: CREDIT_NOTE_EXCLUDED_FIELDS as never[],
    }),
    metadata: {
      creditNoteNumber: result.updated.creditNoteNumber ?? undefined,
      customerId: result.updated.customerId,
      orderId: data.orderId,
      orderNumber: result.order.orderNumber ?? undefined,
      previousStatus: result.before.status,
      newStatus: result.updated.status,
      total: Number(result.updated.amount),
    },
  });

  return result.updated;
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

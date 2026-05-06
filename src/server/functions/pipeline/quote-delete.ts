/**
 * Quote Delete Server Function
 *
 * Owns quote soft-delete behavior, including tenant-scoped lookup, accepted-quote
 * guard, search outbox cleanup, and activity logging.
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { and, eq, isNull } from 'drizzle-orm';
import { quotes } from 'drizzle/schema';
import { computeChanges } from '@/lib/activity-logger';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { db } from '@/lib/db';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { withAuth } from '@/lib/server/protected';
import { quoteParamsSchema } from '@/lib/schemas';
import { enqueueSearchIndexOutbox } from '@/server/functions/_shared/search-index-outbox';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';

/**
 * Fields to exclude from quote activity change tracking (system-managed).
 */
const QUOTE_EXCLUDED_FIELDS: string[] = [
  'updatedAt',
  'updatedBy',
  'createdAt',
  'createdBy',
  'deletedAt',
];

function buildQuoteByIdWhere(id: string, organizationId: string) {
  return and(
    eq(quotes.id, id),
    eq(quotes.organizationId, organizationId),
    isNull(quotes.deletedAt)
  )!;
}

/**
 * Soft delete a quote.
 * Cannot delete quotes that have been accepted.
 */
export const deleteQuote = createServerFn({ method: 'POST' })
  .inputValidator(quoteParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.quote.delete,
    });
    const logger = createActivityLoggerWithContext(ctx);

    const { id } = data;

    const current = await db
      .select()
      .from(quotes)
      .where(buildQuoteByIdWhere(id, ctx.organizationId))
      .limit(1);

    if (!current[0]) {
      throw new NotFoundError('Quote not found', 'quote');
    }

    const quoteToDelete = current[0];

    if (quoteToDelete.status === 'accepted') {
      throw new ValidationError('Cannot delete an accepted quote');
    }

    await db.transaction(async (tx) => {
      await tx
        .update(quotes)
        .set({
          deletedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(quotes.id, id));

      await enqueueSearchIndexOutbox(
        {
          organizationId: ctx.organizationId,
          entityType: 'quote',
          entityId: id,
          action: 'delete',
        },
        tx
      );
    });

    logger.logAsync({
      entityType: 'quote',
      entityId: id,
      action: 'deleted',
      changes: computeChanges({
        before: quoteToDelete,
        after: null,
        excludeFields: QUOTE_EXCLUDED_FIELDS as never[],
      }),
      description: `Deleted quote: ${quoteToDelete.quoteNumber}`,
      metadata: {
        status: quoteToDelete.status,
        total: quoteToDelete.total,
      },
    });

    return { success: true };
  });

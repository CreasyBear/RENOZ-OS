/**
 * Quote Version Restore Server Functions
 *
 * Owns restoring a previous quote version into a new immutable version.
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { restoreQuoteVersionSchema } from '@/lib/schemas';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { withAuth } from '@/lib/server/protected';
import { opportunities, quoteVersions } from 'drizzle/schema';

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

    const result = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );

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

      if (sourceVersion[0].opportunityId !== opportunityId) {
        throw new ValidationError('Source version does not belong to this opportunity');
      }

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

      const latest = await tx
        .select({ versionNumber: quoteVersions.versionNumber })
        .from(quoteVersions)
        .where(
          and(
            eq(quoteVersions.opportunityId, opportunityId),
            eq(quoteVersions.organizationId, ctx.organizationId)
          )
        )
        .orderBy(desc(quoteVersions.versionNumber))
        .limit(1);

      const versionNumber = (latest[0]?.versionNumber ?? 0) + 1;
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

      const [updatedOpportunity] = await tx
        .update(opportunities)
        .set({
          value: sourceVersion[0].total,
          weightedValue: Math.round(
            sourceVersion[0].total * ((opportunity[0].probability ?? 50) / 100)
          ),
          updatedBy: ctx.user.id,
        })
        .where(
          and(
            eq(opportunities.id, opportunityId),
            eq(opportunities.organizationId, ctx.organizationId)
          )
        )
        .returning({ id: opportunities.id });

      if (!updatedOpportunity) {
        throw new NotFoundError('Opportunity not found', 'opportunity');
      }

      return {
        quoteVersion: newVersion,
        restoredFrom: sourceVersion[0].versionNumber,
      };
    });

    return result;
  });

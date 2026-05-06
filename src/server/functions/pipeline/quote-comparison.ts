/**
 * Quote Comparison Server Functions
 *
 * Owns read-only comparison between quote versions for Pipeline quote history.
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { withAuth } from '@/lib/server/protected';
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import { quoteVersions } from 'drizzle/schema';

/**
 * Compare two quote versions to show differences.
 * Useful for showing what changed between versions.
 */
export const compareQuoteVersions = createServerFn({ method: 'GET' })
  .inputValidator(
    normalizeObjectInput(
      z.object({
        version1Id: z.string().uuid(),
        version2Id: z.string().uuid(),
      })
    )
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const { version1Id, version2Id } = data;

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

    if (v1[0].opportunityId !== v2[0].opportunityId) {
      throw new ValidationError('Quote versions must be from the same opportunity');
    }

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

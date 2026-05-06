/**
 * Quote Version Read Server Functions
 *
 * Owns read-only quote version detail and history queries for Pipeline quotes.
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { quoteVersionFilterSchema, quoteVersionParamsSchema } from '@/lib/schemas';
import { NotFoundError } from '@/lib/server/errors';
import { withAuth } from '@/lib/server/protected';
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import { opportunities, quoteVersions } from 'drizzle/schema';

/**
 * Get a single quote version by ID.
 */
export const getQuoteVersion = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(quoteVersionParamsSchema))
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

/**
 * Get all quote versions for an opportunity in descending version order.
 */
export const listQuoteVersions = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(quoteVersionFilterSchema))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const { opportunityId } = data;

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

    const versions = await db
      .select()
      .from(quoteVersions)
      .where(
        and(
          eq(quoteVersions.opportunityId, opportunityId),
          eq(quoteVersions.organizationId, ctx.organizationId)
        )
      )
      .orderBy(desc(quoteVersions.versionNumber));

    return {
      versions,
      totalCount: versions.length,
      latestVersion: versions[0] ?? null,
    };
  });

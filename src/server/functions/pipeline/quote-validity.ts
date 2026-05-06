/**
 * Quote Validity Server Functions
 *
 * Owns read-only quote expiry alerts and validity statistics for Pipeline views.
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { and, desc, eq, gt, isNotNull, lt, lte, notInArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { withAuth } from '@/lib/server/protected';
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import { opportunities } from 'drizzle/schema';

/**
 * Get quotes that are expiring within the warning period.
 * Default warning period is 7 days.
 */
export const getExpiringQuotes = createServerFn({ method: 'GET' })
  .inputValidator(
    normalizeObjectInput(
      z.object({
        warningDays: z.coerce.number().int().positive().default(7),
        limit: z.coerce.number().int().positive().max(50).default(10),
      })
    )
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const { warningDays, limit } = data;

    const now = new Date();
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + warningDays);

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
          gt(opportunities.quoteExpiresAt, now),
          lte(opportunities.quoteExpiresAt, warningDate),
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
    normalizeObjectInput(
      z.object({
        limit: z.coerce.number().int().positive().max(50).default(10),
      })
    )
  )
  .handler(async ({ data }) => {
    const { limit } = data;
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const now = new Date();

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
          lt(opportunities.quoteExpiresAt, now),
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
 * Get quote validity statistics for dashboard.
 */
export const getQuoteValidityStatsSchema = normalizeObjectInput(z.object({}));

export const getQuoteValidityStats = createServerFn({ method: 'GET' })
  .inputValidator(getQuoteValidityStatsSchema)
  .handler(async () => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const baseConditions = [
      eq(opportunities.organizationId, ctx.organizationId),
      notInArray(opportunities.stage, ['won', 'lost']),
    ];

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

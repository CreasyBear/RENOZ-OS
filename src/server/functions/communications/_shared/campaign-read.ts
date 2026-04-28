import { and, count, desc, eq, gte, ilike, lte, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import type { SessionContext } from '@/lib/server/protected';
import { containsPattern } from '@/lib/db/utils';
import { emailCampaigns, type CampaignTemplateType } from 'drizzle/schema/communications';
import type { GetCampaignByIdInput, GetCampaignsInput } from '@/lib/schemas/communications';

export async function readCampaigns(
  ctx: SessionContext,
  data: GetCampaignsInput
): Promise<{ items: typeof emailCampaigns.$inferSelect[]; total: number }> {

    const conditions = [eq(emailCampaigns.organizationId, ctx.organizationId)]

    if (data.status) {
      conditions.push(eq(emailCampaigns.status, data.status))
    }

    if (data.search && data.search.trim()) {
      const searchPattern = containsPattern(data.search.trim())
      const searchConditions = [
        ilike(emailCampaigns.name, searchPattern),
        emailCampaigns.description
          ? ilike(emailCampaigns.description, searchPattern)
          : undefined
      ].filter((c): c is typeof c => c !== undefined);
      
      if (searchConditions.length > 0) {
        conditions.push(or(...searchConditions)!);
      }
    }

    if (data.templateType) {
      conditions.push(eq(emailCampaigns.templateType, data.templateType as CampaignTemplateType))
    }

    if (data.dateFrom) {
      conditions.push(gte(emailCampaigns.createdAt, data.dateFrom))
    }

    if (data.dateTo) {
      // Add 1 day to include the entire end date
      const endDate = new Date(data.dateTo)
      endDate.setHours(23, 59, 59, 999)
      conditions.push(lte(emailCampaigns.createdAt, endDate))
    }

    const results = await db
      .select()
      .from(emailCampaigns)
      .where(and(...conditions))
      .orderBy(desc(emailCampaigns.createdAt))
      .limit(data.limit)
      .offset(data.offset)
    const [countResult] = await db
      .select({ count: count() })
      .from(emailCampaigns)
      .where(and(...conditions))
    return {
      items: results,
      total: Number(countResult?.count ?? 0),
    }
}

export async function readCampaignById(
  ctx: SessionContext,
  data: GetCampaignByIdInput
): Promise<typeof emailCampaigns.$inferSelect | null> {
    const [campaign] = await db
      .select()
      .from(emailCampaigns)
      .where(
        and(
          eq(emailCampaigns.id, data.id),
          eq(emailCampaigns.organizationId, ctx.organizationId),
        ),
      )
      .limit(1)
    return campaign ?? null
}

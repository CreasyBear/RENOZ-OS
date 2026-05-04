/**
 * Payment reminder template helpers.
 */

import { and, asc, count, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { reminderHistory, reminderTemplates } from 'drizzle/schema';
import { NotFoundError } from '@/lib/server/errors';
import type { SessionContext } from '@/lib/server/protected';
import {
  createReminderTemplateSchema,
  idParamQuerySchema,
  idParamSchema,
  reminderTemplateListQuerySchema,
  updateReminderTemplateSchema,
  type ReminderTemplateWithStats,
} from '@/lib/schemas';
import type { z } from 'zod';

export async function createPaymentReminderTemplate(
  ctx: SessionContext,
  data: z.infer<typeof createReminderTemplateSchema>,
) {
  const [template] = await db
    .insert(reminderTemplates)
    .values({
      organizationId: ctx.organizationId,
      name: data.name,
      daysOverdue: data.daysOverdue,
      subject: data.subject,
      body: data.body,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
      createdBy: ctx.user.id,
    })
    .returning();

  return template;
}
export async function updatePaymentReminderTemplate(
  ctx: SessionContext,
  data: z.infer<typeof updateReminderTemplateSchema>,
) {
  const { id, ...updates } = data;

  // Filter out undefined values
  const setValues: Record<string, unknown> = {};
  if (updates.name !== undefined) setValues.name = updates.name;
  if (updates.daysOverdue !== undefined)
    setValues.daysOverdue = updates.daysOverdue;
  if (updates.subject !== undefined) setValues.subject = updates.subject;
  if (updates.body !== undefined) setValues.body = updates.body;
  if (updates.isActive !== undefined) setValues.isActive = updates.isActive;
  if (updates.sortOrder !== undefined) setValues.sortOrder = updates.sortOrder;
  setValues.updatedBy = ctx.user.id;

  const [updated] = await db
    .update(reminderTemplates)
    .set(setValues)
    .where(
      and(
        eq(reminderTemplates.id, id),
        eq(reminderTemplates.organizationId, ctx.organizationId),
      ),
    )
    .returning();

  if (!updated) {
    throw new NotFoundError('Template not found');
  }

  return updated;
}
export async function deletePaymentReminderTemplate(
  ctx: SessionContext,
  data: z.infer<typeof idParamSchema>,
) {
  const [deleted] = await db
    .delete(reminderTemplates)
    .where(
      and(
        eq(reminderTemplates.id, data.id),
        eq(reminderTemplates.organizationId, ctx.organizationId),
      ),
    )
    .returning({ id: reminderTemplates.id });

  if (!deleted) {
    throw new NotFoundError('Template not found');
  }

  return { success: true };
}
export async function readPaymentReminderTemplate(
  ctx: SessionContext,
  data: z.infer<typeof idParamQuerySchema>,
) {
  const [template] = await db
    .select()
    .from(reminderTemplates)
    .where(
      and(
        eq(reminderTemplates.id, data.id),
        eq(reminderTemplates.organizationId, ctx.organizationId),
      ),
    )
    .limit(1);

  if (!template) {
    throw new NotFoundError('Template not found');
  }

  return template;
}
export async function listPaymentReminderTemplates(
  ctx: SessionContext,
  data: z.infer<typeof reminderTemplateListQuerySchema>,
) {
  const { page, pageSize, includeInactive } = data;
  const offset = (page - 1) * pageSize;

  // Build conditions
  const conditions = [eq(reminderTemplates.organizationId, ctx.organizationId)];
  if (!includeInactive) {
    conditions.push(eq(reminderTemplates.isActive, true));
  }

  // Get total count
  const countResult = await db
    .select({ count: count() })
    .from(reminderTemplates)
    .where(and(...conditions));

  const totalItems = countResult[0]?.count ?? 0;

  // Get templates with stats
  const templates = await db
    .select({
      id: reminderTemplates.id,
      name: reminderTemplates.name,
      daysOverdue: reminderTemplates.daysOverdue,
      subject: reminderTemplates.subject,
      body: reminderTemplates.body,
      isActive: reminderTemplates.isActive,
      sortOrder: reminderTemplates.sortOrder,
      createdAt: reminderTemplates.createdAt,
      updatedAt: reminderTemplates.updatedAt,
    })
    .from(reminderTemplates)
    .where(and(...conditions))
    .orderBy(
      asc(reminderTemplates.sortOrder),
      asc(reminderTemplates.daysOverdue),
    )
    .limit(pageSize)
    .offset(offset);

  // Get all stats in ONE query with GROUP BY instead of N queries
  const templateIds = templates.map((t) => t.id);
  const statsResults =
    templateIds.length > 0
      ? await db
          .select({
            templateId: reminderHistory.templateId,
            totalSent: count(),
            lastSentAt: sql<Date | null>`max(${reminderHistory.sentAt})`,
          })
          .from(reminderHistory)
          .where(inArray(reminderHistory.templateId, templateIds))
          .groupBy(reminderHistory.templateId)
      : [];

  // Build lookup map
  const statsMap = new Map(statsResults.map((s) => [s.templateId, s]));

  // Combine templates with stats
  const items: ReminderTemplateWithStats[] = templates.map((t) => ({
    ...t,
    createdAt: t.createdAt ?? new Date(),
    updatedAt: t.updatedAt ?? new Date(),
    totalSent: statsMap.get(t.id)?.totalSent ?? 0,
    lastSentAt: statsMap.get(t.id)?.lastSentAt ?? null,
  }));

  return {
    items,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  };
}

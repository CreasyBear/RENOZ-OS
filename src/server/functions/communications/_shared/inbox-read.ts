import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  customers,
  emailCampaigns,
  emailHistory,
  scheduledEmails,
  users,
} from "drizzle/schema";
import type { InboxListQuery, InboxListResult } from "@/lib/schemas/communications/inbox";
import { buildHistoryConditions, buildScheduledConditions } from "./inbox-filters";
import { applyTabFilter, toHistoryInboxItem, toScheduledInboxItem } from "./inbox-mappers";

interface InboxReadContext {
  organizationId: string;
}

export async function readInboxItems(
  data: InboxListQuery,
  ctx: InboxReadContext
): Promise<InboxListResult> {
  const page = data.page ?? 1;
  const pageSize = data.pageSize ?? 50;
  const offset = (page - 1) * pageSize;
  const fetchLimit = offset + pageSize + 1;
  const includeHistory = data.tab !== "scheduled" && (!data.type || data.type.includes("history"));
  const includeScheduled = data.tab !== "sent" && (!data.type || data.type.includes("scheduled"));
  const historyConditions = buildHistoryConditions(data, ctx.organizationId);
  const scheduledConditions = buildScheduledConditions(data, ctx.organizationId);

  const [historyRows, scheduledRows, historyCount, scheduledCount] = await Promise.all([
    includeHistory
      ? db
          .select({
            id: emailHistory.id,
            subject: emailHistory.subject,
            bodyText: emailHistory.bodyText,
            bodyHtml: emailHistory.bodyHtml,
            fromAddress: emailHistory.fromAddress,
            toAddress: emailHistory.toAddress,
            status: emailHistory.status,
            sentAt: emailHistory.sentAt,
            createdAt: emailHistory.createdAt,
            customerId: emailHistory.customerId,
            campaignId: emailHistory.campaignId,
            templateId: emailHistory.templateId,
            metadata: emailHistory.metadata,
            customerName: customers.name,
            customerEmail: customers.email,
            senderName: users.name,
            campaignName: emailCampaigns.name,
          })
          .from(emailHistory)
          .leftJoin(
            customers,
            and(
              eq(emailHistory.customerId, customers.id),
              eq(customers.organizationId, ctx.organizationId),
              isNull(customers.deletedAt)
            )
          )
          .leftJoin(users, eq(emailHistory.senderId, users.id))
          .leftJoin(
            emailCampaigns,
            and(
              eq(emailHistory.campaignId, emailCampaigns.id),
              eq(emailCampaigns.organizationId, ctx.organizationId)
            )
          )
          .where(and(...historyConditions))
          .orderBy(desc(emailHistory.createdAt), desc(emailHistory.id))
          .limit(fetchLimit)
      : [],
    includeScheduled
      ? db
          .select({
            id: scheduledEmails.id,
            subject: scheduledEmails.subject,
            recipientEmail: scheduledEmails.recipientEmail,
            recipientName: scheduledEmails.recipientName,
            status: scheduledEmails.status,
            scheduledAt: scheduledEmails.scheduledAt,
            createdAt: scheduledEmails.createdAt,
            customerId: scheduledEmails.customerId,
            templateData: scheduledEmails.templateData,
            customerName: customers.name,
            customerEmail: customers.email,
            senderName: users.name,
          })
          .from(scheduledEmails)
          .leftJoin(
            customers,
            and(
              eq(scheduledEmails.customerId, customers.id),
              eq(customers.organizationId, ctx.organizationId),
              isNull(customers.deletedAt)
            )
          )
          .leftJoin(users, eq(scheduledEmails.userId, users.id))
          .where(and(...scheduledConditions))
          .orderBy(desc(scheduledEmails.scheduledAt), desc(scheduledEmails.id))
          .limit(fetchLimit)
      : [],
    includeHistory
      ? db.select({ count: count() }).from(emailHistory).where(and(...historyConditions))
      : Promise.resolve([{ count: 0 }]),
    includeScheduled
      ? db.select({ count: count() }).from(scheduledEmails).where(and(...scheduledConditions))
      : Promise.resolve([{ count: 0 }]),
  ]);

  const allItems = applyTabFilter(
    [...historyRows.map(toHistoryInboxItem), ...scheduledRows.map(toScheduledInboxItem)],
    data.tab
  ).sort((a, b) => {
    const dateDiff = b.sortDate.getTime() - a.sortDate.getTime();
    return dateDiff !== 0 ? dateDiff : b.id.localeCompare(a.id);
  });

  const items = allItems
    .slice(offset, offset + pageSize)
    .map(({ sortDate: _sortDate, ...item }) => item);
  const total = Number(historyCount[0]?.count ?? 0) + Number(scheduledCount[0]?.count ?? 0);

  return {
    items,
    total,
    page,
    pageSize,
    hasNextPage: offset + pageSize < total,
  };
}

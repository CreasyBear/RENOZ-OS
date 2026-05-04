import { eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { containsPattern } from "@/lib/db/utils";
import { emailHistory, scheduledEmails } from "drizzle/schema";
import type { InboxListQuery } from "@/lib/schemas/communications/inbox";

export function buildHistoryConditions(data: InboxListQuery, organizationId: string) {
  const searchPattern = data.search?.trim() ? containsPattern(data.search.trim()) : null;
  const statusCondition = data.status
    ? eq(emailHistory.status, data.status)
    : data.tab === "sent"
      ? eq(emailHistory.status, "sent")
      : data.tab === "failed"
        ? or(eq(emailHistory.status, "failed"), eq(emailHistory.status, "bounced"))
        : undefined;

  return [
    eq(emailHistory.organizationId, organizationId),
    statusCondition,
    data.customerId ? eq(emailHistory.customerId, data.customerId) : undefined,
    data.campaignId ? eq(emailHistory.campaignId, data.campaignId) : undefined,
    data.dateFrom ? gte(emailHistory.createdAt, data.dateFrom) : undefined,
    data.dateTo ? lte(emailHistory.createdAt, data.dateTo) : undefined,
    data.tab === "unread" ? sql`${emailHistory.metadata}->>'read' IS DISTINCT FROM 'true'` : undefined,
    searchPattern
      ? or(
          ilike(emailHistory.subject, searchPattern),
          ilike(emailHistory.bodyText, searchPattern),
          ilike(emailHistory.fromAddress, searchPattern),
          ilike(emailHistory.toAddress, searchPattern)
        )
      : undefined,
  ].filter(Boolean);
}

export function buildScheduledConditions(data: InboxListQuery, organizationId: string) {
  const searchPattern = data.search?.trim() ? containsPattern(data.search.trim()) : null;
  const scheduledStatus =
    data.status === "pending" || data.status === "sent" || data.status === "failed"
      ? data.status
      : data.tab === "failed"
        ? "failed"
        : undefined;

  return [
    eq(scheduledEmails.organizationId, organizationId),
    scheduledStatus ? eq(scheduledEmails.status, scheduledStatus) : undefined,
    data.customerId ? eq(scheduledEmails.customerId, data.customerId) : undefined,
    data.dateFrom ? gte(scheduledEmails.createdAt, data.dateFrom) : undefined,
    data.dateTo ? lte(scheduledEmails.createdAt, data.dateTo) : undefined,
    searchPattern
      ? or(
          ilike(scheduledEmails.subject, searchPattern),
          ilike(scheduledEmails.recipientEmail, searchPattern),
          ilike(scheduledEmails.recipientName, searchPattern)
        )
      : undefined,
  ].filter(Boolean);
}

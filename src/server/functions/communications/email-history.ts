/**
 * Email History Server Functions
 *
 * Organization-level email delivery history list.
 */
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, gte, lte, lt, or, ilike, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailHistory, customers, users } from "drizzle/schema";
import { containsPattern } from "@/lib/db/utils";
import { withAuth } from "@/lib/server/protected";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { EmailHistoryListQuerySchema } from "@/lib/schemas/communications/email-history";

export const listEmailHistory = createServerFn({ method: "GET" })
  .inputValidator(EmailHistoryListQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.email.read });

    const filters = [
      eq(emailHistory.organizationId, ctx.organizationId),
      data.status ? eq(emailHistory.status, data.status) : undefined,
      data.customerId ? eq(emailHistory.customerId, data.customerId) : undefined,
      data.campaignId ? eq(emailHistory.campaignId, data.campaignId) : undefined,
      data.templateId ? eq(emailHistory.templateId, data.templateId) : undefined,
      data.dateFrom ? gte(emailHistory.createdAt, data.dateFrom) : undefined,
      data.dateTo ? lte(emailHistory.createdAt, data.dateTo) : undefined,
      // Server-side search: ILIKE search across subject, bodyText, fromAddress, toAddress
      data.search && data.search.trim().length > 0
        ? or(
            ilike(emailHistory.subject, containsPattern(data.search.trim())),
            ilike(emailHistory.bodyText, containsPattern(data.search.trim())),
            ilike(emailHistory.fromAddress, containsPattern(data.search.trim())),
            ilike(emailHistory.toAddress, containsPattern(data.search.trim()))
          )!
        : undefined,
    ].filter(Boolean);

    const cursorDate = data.cursor ? new Date(data.cursor) : null;
    if (cursorDate && !Number.isNaN(cursorDate.getTime())) {
      filters.push(lt(emailHistory.createdAt, cursorDate));
    }

    const pageSize = data.pageSize ?? 20;

    const rows = await db
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
        senderName: users.name,
      })
      .from(emailHistory)
      // C38: Add soft-delete and orgId filter to customers JOIN
      .leftJoin(customers, and(
        eq(emailHistory.customerId, customers.id),
        isNull(customers.deletedAt),
        eq(customers.organizationId, ctx.organizationId),
      ))
      .leftJoin(users, eq(emailHistory.senderId, users.id))
      .where(and(...filters))
      .orderBy(desc(emailHistory.createdAt))
      .limit(pageSize + 1);

    const hasNextPage = rows.length > pageSize;
    const trimmedRows = hasNextPage ? rows.slice(0, pageSize) : rows;
    const nextCursor = hasNextPage
      ? trimmedRows[trimmedRows.length - 1]?.createdAt?.toISOString() ?? null
      : null;

    return {
      items: trimmedRows,
      nextCursor,
      hasNextPage,
    };
  });

export default listEmailHistory;

import { and, asc, count, desc, eq, ilike, inArray, isNull } from "drizzle-orm";
import { buildCursorCondition, buildStandardCursorResponse, decodeCursor } from "@/lib/db/pagination";
import { containsPattern } from "@/lib/db/utils";
import { db } from "@/lib/db";
import { emailSuppression } from "drizzle/schema";
import {
  suppressionRecordSchema,
  type CheckSuppressionBatchResult,
  type CheckSuppressionResult,
  type SuppressionListResult,
  type SuppressionRecord,
} from "@/lib/schemas/communications/email-suppression";
import type {
  checkSuppressionBatchSchema,
  checkSuppressionSchema,
  suppressionListCursorSchema,
  suppressionListFiltersSchema,
} from "@/lib/schemas/communications/email-suppression";
import type { z } from "zod";

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export async function readSuppressionList(
  organizationId: string,
  data: z.infer<typeof suppressionListFiltersSchema>,
): Promise<SuppressionListResult> {
  const {
    reason,
    search,
    includeDeleted = false,
    page = 1,
    pageSize = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = data;

  const conditions = [eq(emailSuppression.organizationId, organizationId)];
  if (!includeDeleted) conditions.push(isNull(emailSuppression.deletedAt));
  if (reason) conditions.push(eq(emailSuppression.reason, reason));
  if (search) conditions.push(ilike(emailSuppression.email, containsPattern(search)));

  const orderByColumn =
    sortBy === "email"
      ? emailSuppression.email
      : sortBy === "reason"
        ? emailSuppression.reason
        : emailSuppression.createdAt;
  const orderByDirection = sortOrder === "asc" ? asc : desc;

  const [countResult, items] = await Promise.all([
    db
      .select({ count: count() })
      .from(emailSuppression)
      .where(and(...conditions)),
    db
      .select()
      .from(emailSuppression)
      .where(and(...conditions))
      .orderBy(orderByDirection(orderByColumn))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);

  const total = countResult[0]?.count ?? 0;

  return {
    items: items.map((item): SuppressionRecord => suppressionRecordSchema.parse(item)),
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };
}

export async function readSuppressionListCursor(
  organizationId: string,
  data: z.infer<typeof suppressionListCursorSchema>,
) {
  const {
    cursor,
    pageSize = 20,
    sortOrder = "desc",
    reason,
    search,
    includeDeleted = false,
  } = data;

  const conditions = [eq(emailSuppression.organizationId, organizationId)];
  if (!includeDeleted) conditions.push(isNull(emailSuppression.deletedAt));
  if (reason) conditions.push(eq(emailSuppression.reason, reason));
  if (search) conditions.push(ilike(emailSuppression.email, containsPattern(search)));

  if (cursor) {
    const cursorPosition = decodeCursor(cursor);
    if (cursorPosition) {
      conditions.push(
        buildCursorCondition(
          emailSuppression.createdAt,
          emailSuppression.id,
          cursorPosition,
          sortOrder,
        ),
      );
    }
  }

  const orderDir = sortOrder === "asc" ? asc : desc;
  const items = await db
    .select()
    .from(emailSuppression)
    .where(and(...conditions))
    .orderBy(orderDir(emailSuppression.createdAt), orderDir(emailSuppression.id))
    .limit(pageSize + 1);

  return buildStandardCursorResponse(
    items.map((item): SuppressionRecord => suppressionRecordSchema.parse(item)),
    pageSize,
  );
}

export async function readEmailSuppressionStatus(
  organizationId: string,
  data: z.infer<typeof checkSuppressionSchema>,
): Promise<CheckSuppressionResult> {
  const email = normalizeEmail(data.email);

  const [suppression] = await db
    .select({
      reason: emailSuppression.reason,
      bounceType: emailSuppression.bounceType,
      createdAt: emailSuppression.createdAt,
    })
    .from(emailSuppression)
    .where(
      and(
        eq(emailSuppression.organizationId, organizationId),
        eq(emailSuppression.email, email),
        isNull(emailSuppression.deletedAt),
      ),
    )
    .limit(1);

  return {
    email,
    isSuppressed: Boolean(suppression),
    reason: suppression?.reason ?? null,
    bounceType: suppression?.bounceType ?? null,
    suppressedAt: suppression?.createdAt ?? null,
  };
}

export async function readSuppressionBatchStatus(
  organizationId: string,
  data: z.infer<typeof checkSuppressionBatchSchema>,
): Promise<CheckSuppressionBatchResult> {
  const normalizedEmails = data.emails.map(normalizeEmail);

  if (normalizedEmails.length === 0) {
    return { results: [], suppressedCount: 0, totalChecked: 0 };
  }

  const suppressions = await db
    .select({
      email: emailSuppression.email,
      reason: emailSuppression.reason,
      bounceType: emailSuppression.bounceType,
      createdAt: emailSuppression.createdAt,
    })
    .from(emailSuppression)
    .where(
      and(
        eq(emailSuppression.organizationId, organizationId),
        inArray(emailSuppression.email, normalizedEmails),
        isNull(emailSuppression.deletedAt),
      ),
    );

  const suppressionMap = new Map(suppressions.map((suppression) => [suppression.email, suppression]));

  return {
    results: normalizedEmails.map((email): CheckSuppressionResult => {
      const suppression = suppressionMap.get(email);
      return {
        email,
        isSuppressed: Boolean(suppression),
        reason: suppression?.reason ?? null,
        bounceType: suppression?.bounceType ?? null,
        suppressedAt: suppression?.createdAt ?? null,
      };
    }),
    suppressedCount: suppressions.length,
    totalChecked: normalizedEmails.length,
  };
}

export async function isEmailSuppressedDirect(
  organizationId: string,
  email: string,
): Promise<{
  suppressed: boolean;
  reason?: "bounce" | "complaint" | "unsubscribe" | "manual";
  bounceType?: "hard" | "soft" | null;
}> {
  const result = await readEmailSuppressionStatus(organizationId, { email });

  return result.isSuppressed
    ? {
        suppressed: true,
        reason: result.reason ?? undefined,
        bounceType: result.bounceType,
      }
    : { suppressed: false };
}

export async function checkSuppressionBatchDirect(
  organizationId: string,
  emails: string[],
): Promise<
  Array<{
    email: string;
    suppressed: boolean;
    reason?: "bounce" | "complaint" | "unsubscribe" | "manual";
  }>
> {
  const result = await readSuppressionBatchStatus(organizationId, { emails });
  return result.results.map((item) => ({
    email: item.email,
    suppressed: item.isSuppressed,
    reason: item.reason ?? undefined,
  }));
}

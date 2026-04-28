/**
 * Scheduled email read helpers.
 */

import { and, asc, count, desc, eq, ilike, lte, or, sql } from 'drizzle-orm';
import { containsPattern } from '@/lib/db/utils';
import { db } from '@/lib/db';
import {
  buildCursorCondition,
  buildCursorResponse,
  decodeCursor,
} from '@/lib/db/pagination';
import { scheduledEmails } from 'drizzle/schema/communications';
import type { SessionContext } from '@/lib/server/protected';
import {
  getScheduledEmailByIdSchema,
  getScheduledEmailsCursorSchema,
  getScheduledEmailsSchema,
} from '@/lib/schemas/communications';
import type { z } from 'zod';

export async function readScheduledEmails(
  ctx: SessionContext,
  data: z.infer<typeof getScheduledEmailsSchema>,
) {
  const conditions = [eq(scheduledEmails.organizationId, ctx.organizationId)];

  if (data.status) {
    conditions.push(eq(scheduledEmails.status, data.status));
  }

  if (data.customerId) {
    conditions.push(eq(scheduledEmails.customerId, data.customerId));
  }

  // M02: Server-side search: ILIKE search across recipientEmail, recipientName, and subject
  // Removed incorrect isNull(recipientName) from OR - it would match all rows with null name
  if (data.search && data.search.trim().length > 0) {
    const searchPattern = containsPattern(data.search.trim());
    conditions.push(
      or(
        ilike(scheduledEmails.recipientEmail, searchPattern),
        ilike(scheduledEmails.recipientName, searchPattern),
        ilike(scheduledEmails.subject, searchPattern),
      )!,
    );
  }

  const results = await db
    .select()
    .from(scheduledEmails)
    .where(and(...conditions))
    .orderBy(desc(scheduledEmails.scheduledAt))
    .limit(data.limit)
    .offset(data.offset);

  const [countResult] = await db
    .select({ count: count() })
    .from(scheduledEmails)
    .where(and(...conditions));

  return {
    items: results,
    total: Number(countResult?.count ?? 0),
  };
}

export async function readScheduledEmailsCursor(
  ctx: SessionContext,
  data: z.infer<typeof getScheduledEmailsCursorSchema>,
) {
  const {
    cursor,
    pageSize = 20,
    sortOrder = 'desc',
    status,
    customerId,
    search,
  } = data;

  const conditions = [eq(scheduledEmails.organizationId, ctx.organizationId)];
  if (status) conditions.push(eq(scheduledEmails.status, status));
  if (customerId) conditions.push(eq(scheduledEmails.customerId, customerId));
  if (search && search.trim().length > 0) {
    const searchPattern = containsPattern(search.trim());
    conditions.push(
      or(
        ilike(scheduledEmails.recipientEmail, searchPattern),
        ilike(scheduledEmails.recipientName, searchPattern),
        ilike(scheduledEmails.subject, searchPattern),
      )!,
    );
  }

  if (cursor) {
    const cursorPosition = decodeCursor(cursor);
    if (cursorPosition) {
      conditions.push(
        buildCursorCondition(
          scheduledEmails.scheduledAt,
          scheduledEmails.id,
          cursorPosition,
          sortOrder,
        ),
      );
    }
  }

  const orderDir = sortOrder === 'asc' ? asc : desc;
  const results = await db
    .select()
    .from(scheduledEmails)
    .where(and(...conditions))
    .orderBy(
      orderDir(scheduledEmails.scheduledAt),
      orderDir(scheduledEmails.id),
    )
    .limit(pageSize + 1);

  return buildCursorResponse(
    results,
    pageSize,
    (r) =>
      r.scheduledAt instanceof Date
        ? r.scheduledAt.toISOString()
        : r.scheduledAt,
    (r) => r.id,
  );
}

export async function readScheduledEmailById(
  ctx: SessionContext,
  data: z.infer<typeof getScheduledEmailByIdSchema>,
) {
  const [email] = await db
    .select()
    .from(scheduledEmails)
    .where(
      and(
        eq(scheduledEmails.id, data.id),
        eq(scheduledEmails.organizationId, ctx.organizationId),
      ),
    )
    .limit(1);

  return email ?? null;
}

export async function getEmailsToSend(
  limit = 100,
): Promise<Array<typeof scheduledEmails.$inferSelect>> {
  const now = new Date();

  return db
    .select()
    .from(scheduledEmails)
    .where(
      and(
        eq(scheduledEmails.status, 'pending'),
        lte(scheduledEmails.scheduledAt, now),
        sql`COALESCE(${scheduledEmails.templateData}->>'validationError', '') = ''`,
      ),
    )
    .limit(limit);
}

export async function getDueScheduledEmails(
  limit = 50,
): Promise<Array<typeof scheduledEmails.$inferSelect>> {
  const now = new Date();

  return db
    .select()
    .from(scheduledEmails)
    .where(
      and(
        eq(scheduledEmails.status, 'pending'),
        lte(scheduledEmails.scheduledAt, now),
        sql`COALESCE(${scheduledEmails.templateData}->>'validationError', '') = ''`,
      ),
    )
    .orderBy(asc(scheduledEmails.scheduledAt), asc(scheduledEmails.id))
    .limit(limit);
}

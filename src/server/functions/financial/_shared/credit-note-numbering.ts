/**
 * Credit note numbering helpers.
 */

import { and, desc, eq, like } from 'drizzle-orm';
import { db } from '@/lib/db';
import { creditNotes } from 'drizzle/schema';

export async function generateCreditNoteNumber(organizationId: string): Promise<string> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `CN-${yearMonth}-`;

  const result = await db
    .select({ creditNoteNumber: creditNotes.creditNoteNumber })
    .from(creditNotes)
    .where(
      and(
        eq(creditNotes.organizationId, organizationId),
        like(creditNotes.creditNoteNumber, `${prefix}%`)
      )
    )
    .orderBy(desc(creditNotes.creditNoteNumber))
    .limit(1);

  let nextNumber = 1;
  if (result.length > 0 && result[0].creditNoteNumber) {
    nextNumber = parseInt(result[0].creditNoteNumber.slice(-4), 10) + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

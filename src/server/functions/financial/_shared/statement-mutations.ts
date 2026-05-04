import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import type { SessionContext } from '@/lib/server/protected';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { customers as customersTable, statementHistory } from 'drizzle/schema';
import type { MarkStatementSentInput, SaveStatementHistoryInput } from '@/lib/schemas';

export async function saveStatementHistoryRecord(
  ctx: SessionContext,
  data: SaveStatementHistoryInput
): Promise<{ id: string }> {

    // Verify customer exists
    const customerExists = await db
      .select({ id: customersTable.id })
      .from(customersTable)
      .where(
        and(
          eq(customersTable.id, data.customerId),
          eq(customersTable.organizationId, ctx.organizationId),
          isNull(customersTable.deletedAt)
        )
      )
      .limit(1);

    if (customerExists.length === 0) {
      throw new NotFoundError('Customer not found');
    }

    const [record] = await db
      .insert(statementHistory)
      .values({
        organizationId: ctx.organizationId,
        customerId: data.customerId,
        startDate: data.startDate,
        endDate: data.endDate,
        openingBalance: data.openingBalance,
        closingBalance: data.closingBalance,
        invoiceCount: data.invoiceCount,
        paymentCount: data.paymentCount,
        creditNoteCount: data.creditNoteCount,
        totalInvoiced: data.totalInvoiced,
        totalPayments: data.totalPayments,
        totalCredits: data.totalCredits,
        totalGst: data.totalGst,
        pdfPath: data.pdfPath ?? null,
        notes: data.notes ?? null,
        createdBy: ctx.user.id,
      })
      .returning({ id: statementHistory.id });

    return { id: record.id };
}

export async function markStatementHistorySent(
  ctx: SessionContext,
  data: MarkStatementSentInput
): Promise<{ success: true }> {
    const [statement] = await db
      .select({
        id: statementHistory.id,
        customerId: statementHistory.customerId,
        customerEmail: customersTable.email,
      })
      .from(statementHistory)
      .innerJoin(customersTable, eq(statementHistory.customerId, customersTable.id))
      .where(
        and(
          eq(statementHistory.id, data.statementId),
          eq(statementHistory.organizationId, ctx.organizationId),
          eq(customersTable.organizationId, ctx.organizationId),
          isNull(customersTable.deletedAt)
        )
      )
      .limit(1);

    if (!statement) {
      throw new NotFoundError('Statement not found');
    }

    const sentToEmail = data.sentToEmail ?? statement.customerEmail;
    if (!sentToEmail) {
      throw new ValidationError('No customer email available for this statement');
    }

    await db
      .update(statementHistory)
      .set({
        sentAt: new Date(),
        sentToEmail,
        updatedBy: ctx.user.id,
      })
      .where(
        and(
          eq(statementHistory.id, data.statementId),
          eq(statementHistory.organizationId, ctx.organizationId)
        )
      )
    return { success: true };
}

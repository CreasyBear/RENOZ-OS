/**
 * Shared warranty numbering helpers.
 *
 * Generates warranty numbers inside the caller's transaction/executor so batch
 * creation flows share the same sequencing logic.
 */
import { and, eq, like, sql } from 'drizzle-orm';
import type { TransactionExecutor } from '@/lib/db';
import { warranties } from 'drizzle/schema';

interface GenerateWarrantyNumbersParams {
  organizationId: string;
  count: number;
  now?: Date;
}

/**
 * Generate multiple warranty numbers in WRN-YYYY-NNNNN format.
 * Uses a single max lookup inside the caller's executor/transaction.
 */
export async function generateWarrantyNumbersTx(
  executor: TransactionExecutor,
  params: GenerateWarrantyNumbersParams
): Promise<string[]> {
  if (params.count === 0) return [];

  const year = (params.now ?? new Date()).getFullYear();
  const prefix = `WRN-${year}-`;

  const [result] = await executor
    .select({
      maxNumber: sql<string>`MAX(${warranties.warrantyNumber})`,
    })
    .from(warranties)
    .where(
      and(
        eq(warranties.organizationId, params.organizationId),
        like(warranties.warrantyNumber, `${prefix}%`)
      )
    );

  let nextSequence = 1;
  const maxNumber = result?.maxNumber;
  if (maxNumber) {
    const match = maxNumber.match(/WRN-\d{4}-(\d+)$/);
    if (match) {
      nextSequence = Number.parseInt(match[1], 10) + 1;
    }
  }

  return Array.from({ length: params.count }, (_, index) =>
    `${prefix}${(nextSequence + index).toString().padStart(5, '0')}`
  );
}

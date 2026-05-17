import type { SessionContext } from '@/lib/server/protected';
import type { FinancialCloseReadiness } from '@/lib/schemas';
import { readInventoryFinanceIntegrityAggregate } from './inventory-finance-integrity-read';

export async function readFinancialCloseReadiness(
  ctx: SessionContext,
): Promise<FinancialCloseReadiness> {
  const integrity = await readInventoryFinanceIntegrityAggregate({
    organizationId: ctx.organizationId,
  });

  const gates = {
    stockWithoutActiveLayers: integrity.stockWithoutActiveLayers,
    rowsValueMismatch: integrity.valueMismatchRows,
    layerNegativeOrOverconsumed: integrity.negativeOrOverconsumedLayers,
    duplicateActiveSerializedAllocations: integrity.duplicateActiveSerializedAllocations,
    shipmentLinkNotShippedOrReturned: integrity.shipmentLinkStatusMismatch,
  };
  const blockingReasons = Object.entries(gates)
    .filter(([, value]) => value > 0)
    .map(([key]) => key);

  return {
    isReady: blockingReasons.length === 0,
    blockingReasons,
    generatedAt: new Date().toISOString(),
    gates,
    totals: {
      totalAbsValueDrift: integrity.totalAbsoluteValueDrift,
    },
  };
}

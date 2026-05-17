import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import type {
  InventoryFinanceReconcileInput,
  InventoryFinanceReconcileResult,
} from '@/lib/schemas/inventory';
import { inventoryCostLayers } from 'drizzle/schema';
import { getFinanceIntegritySummary } from './finance-integrity-summary';

interface ReconcileInventoryFinanceIntegrityInput
  extends Pick<InventoryFinanceReconcileInput, 'dryRun' | 'limit'> {
  organizationId: string;
}

type MissingLayerRow = {
  inventory_id: string;
  quantity_on_hand: number;
  unit_cost: number;
} & Record<string, unknown>;

type CountRow = {
  count: number;
} & Record<string, unknown>;

export async function reconcileInventoryFinanceIntegrityState({
  organizationId,
  dryRun,
  limit,
}: ReconcileInventoryFinanceIntegrityInput): Promise<InventoryFinanceReconcileResult> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.organization_id', ${organizationId}, false)`);

    const scannedResult = await tx.execute<CountRow>(
      sql`
        SELECT COUNT(*)::int AS count
        FROM inventory i
        WHERE i.organization_id = ${organizationId}
      `
    );
    const scannedInventoryRows = Number(
      (scannedResult as unknown as CountRow[])[0]?.count ?? 0
    );

    const missingRowsResult = await tx.execute<MissingLayerRow>(sql`
      WITH layer_totals AS (
        SELECT
          icl.inventory_id,
          COALESCE(SUM(CASE WHEN icl.quantity_remaining > 0 THEN icl.quantity_remaining ELSE 0 END), 0)::numeric AS active_qty
        FROM inventory_cost_layers icl
        WHERE icl.organization_id = ${organizationId}
        GROUP BY icl.inventory_id
      )
      SELECT
        i.id AS inventory_id,
        COALESCE(i.quantity_on_hand, 0)::numeric AS quantity_on_hand,
        COALESCE(i.unit_cost, 0)::numeric AS unit_cost
      FROM inventory i
      LEFT JOIN layer_totals lt ON lt.inventory_id = i.id
      WHERE i.organization_id = ${organizationId}
        AND COALESCE(i.quantity_on_hand, 0) > 0
        AND COALESCE(lt.active_qty, 0) = 0
      LIMIT ${limit}
    `);
    const missingRows = missingRowsResult as unknown as MissingLayerRow[];

    let repairedMissingLayers = 0;
    if (!dryRun) {
      for (const row of missingRows) {
        const qty = Math.max(0, Math.floor(Number(row.quantity_on_hand ?? 0)));
        if (qty <= 0) continue;
        const unitCost = Number(row.unit_cost ?? 0);
        await tx.insert(inventoryCostLayers).values({
          organizationId,
          inventoryId: row.inventory_id,
          receivedAt: new Date(),
          quantityReceived: qty,
          quantityRemaining: qty,
          unitCost: String(unitCost),
          referenceType: 'adjustment',
        });
        repairedMissingLayers += 1;
      }

      const clampedResult = await tx.execute<CountRow>(sql`
        WITH updated AS (
          UPDATE inventory_cost_layers
          SET quantity_remaining = GREATEST(LEAST(quantity_remaining, quantity_received), 0)
          WHERE organization_id = ${organizationId}
            AND (
              quantity_remaining < 0
              OR quantity_remaining > quantity_received
            )
          RETURNING id
        )
        SELECT COUNT(*)::int AS count FROM updated
      `);
      const clampedInvalidLayers = Number(
        (clampedResult as unknown as CountRow[])[0]?.count ?? 0
      );

      const driftUpdateResult = await tx.execute<CountRow>(sql`
        WITH layer_totals AS (
          SELECT
            icl.inventory_id,
            COALESCE(SUM(CASE WHEN icl.quantity_remaining > 0 THEN icl.quantity_remaining * icl.unit_cost ELSE 0 END), 0)::numeric AS layer_value,
            COALESCE(SUM(CASE WHEN icl.quantity_remaining > 0 THEN icl.quantity_remaining ELSE 0 END), 0)::numeric AS layer_qty
          FROM inventory_cost_layers icl
          WHERE icl.organization_id = ${organizationId}
          GROUP BY icl.inventory_id
        ),
        updated AS (
          UPDATE inventory i
          SET
            total_value = COALESCE(lt.layer_value, 0),
            unit_cost = CASE
              WHEN COALESCE(lt.layer_qty, 0) > 0 THEN COALESCE(lt.layer_value, 0) / lt.layer_qty
              ELSE 0
            END,
            updated_at = NOW()
          FROM layer_totals lt
          WHERE i.id = lt.inventory_id
            AND i.organization_id = ${organizationId}
            AND ABS(COALESCE(i.total_value, 0) - COALESCE(lt.layer_value, 0)) > 0.01
          RETURNING i.id
        )
        SELECT COUNT(*)::int AS count FROM updated
      `);
      const repairedValueDriftRows = Number(
        (driftUpdateResult as unknown as CountRow[])[0]?.count ?? 0
      );

      const postIntegrity = await getFinanceIntegritySummary(organizationId);
      return {
        dryRun,
        scannedInventoryRows,
        repairedMissingLayers,
        repairedValueDriftRows,
        clampedInvalidLayers,
        remainingMismatches: postIntegrity.inventoryValueMismatchCount,
        postIntegrity,
      };
    }

    const currentIntegrity = await getFinanceIntegritySummary(organizationId);
    return {
      dryRun,
      scannedInventoryRows,
      repairedMissingLayers: missingRows.length,
      repairedValueDriftRows: currentIntegrity.inventoryValueMismatchCount,
      clampedInvalidLayers: currentIntegrity.negativeOrOverconsumedLayers,
      remainingMismatches: currentIntegrity.inventoryValueMismatchCount,
      postIntegrity: currentIntegrity,
    };
  });
}

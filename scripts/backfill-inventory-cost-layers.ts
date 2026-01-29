import "dotenv/config";
import postgres from "postgres";

const requiredEnv = ["OLD_DATABASE_URL", "NEW_DATABASE_URL", "OLD_ORG_ID", "NEW_ORG_ID"];

const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const OLD_DATABASE_URL = process.env.OLD_DATABASE_URL!;
const NEW_DATABASE_URL = process.env.NEW_DATABASE_URL!;
const OLD_ORG_ID = process.env.OLD_ORG_ID!;
const NEW_ORG_ID = process.env.NEW_ORG_ID!;

const DRY_RUN = process.env.DRY_RUN === "1";
const RESET_TARGET = process.env.RESET_TARGET === "1";

const oldDb = postgres(OLD_DATABASE_URL, { prepare: false, max: 1 });
const newDb = postgres(NEW_DATABASE_URL, { prepare: false, max: 1 });

type OldCostLayer = {
  id: string;
  org_id: string;
  inventory_item_id: string;
  goods_receipt_line_id: string | null;
  unit_cost: number | string | null;
  quantity_on_hand: number | string | null;
  quantity_consumed: number | string | null;
  created_at: string | null;
  updated_at: string | null;
};

type NewCostLayerRow = {
  id: string;
  organization_id: string;
  inventory_id: string;
  received_at: string;
  quantity_received: number;
  quantity_remaining: number;
  unit_cost: number;
  reference_type: string | null;
  reference_id: string | null;
  expiry_date: string | null;
  created_at: string;
};

function chunk<T>(rows: T[], size: number) {
  const batches: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    batches.push(rows.slice(i, i + size));
  }
  return batches;
}

function toNumber(value: number | string | null) {
  if (value === null || value === undefined) {
    return 0;
  }
  return Number(value);
}

async function main() {
  console.log("Backfilling inventory_cost_layers...");
  console.log(`OLD_ORG_ID: ${OLD_ORG_ID}`);
  console.log(`NEW_ORG_ID: ${NEW_ORG_ID}`);
  console.log(`DRY_RUN: ${DRY_RUN}`);
  console.log(`RESET_TARGET: ${RESET_TARGET}`);

  const oldLayers = await oldDb<OldCostLayer[]>`
    select
      id,
      org_id,
      inventory_item_id,
      goods_receipt_line_id,
      unit_cost,
      quantity_on_hand,
      quantity_consumed,
      created_at,
      updated_at
    from inventory_cost_layers
    where org_id = ${OLD_ORG_ID}
    order by created_at asc
  `;

  const newInventoryIds = await newDb<{ id: string }[]>`
    select id
    from inventory
    where organization_id = ${NEW_ORG_ID}
  `;
  const inventoryIdSet = new Set(newInventoryIds.map((row) => row.id));

  const existingLayerIds = await newDb<{ id: string }[]>`
    select id
    from inventory_cost_layers
    where organization_id = ${NEW_ORG_ID}
  `;
  const existingLayerIdSet = new Set(existingLayerIds.map((row) => row.id));

  if (RESET_TARGET && !DRY_RUN) {
    await newDb`
      delete from inventory_cost_layers
      where organization_id = ${NEW_ORG_ID}
    `;
    existingLayerIdSet.clear();
  }

  const rows: NewCostLayerRow[] = [];
  const skippedMissingInventory: string[] = [];
  const skippedExisting: string[] = [];

  for (const layer of oldLayers) {
    if (!inventoryIdSet.has(layer.inventory_item_id)) {
      skippedMissingInventory.push(layer.id);
      continue;
    }
    if (existingLayerIdSet.has(layer.id)) {
      skippedExisting.push(layer.id);
      continue;
    }

    const quantityRemaining = toNumber(layer.quantity_on_hand);
    const quantityReceived = quantityRemaining + toNumber(layer.quantity_consumed);
    const unitCost = toNumber(layer.unit_cost);
    const receivedAt = layer.created_at ?? layer.updated_at ?? new Date().toISOString();
    const createdAt = layer.created_at ?? receivedAt;

    rows.push({
      id: layer.id,
      organization_id: NEW_ORG_ID,
      inventory_id: layer.inventory_item_id,
      received_at: receivedAt,
      quantity_received: quantityReceived,
      quantity_remaining: quantityRemaining,
      unit_cost: unitCost,
      reference_type: null,
      reference_id: null,
      expiry_date: null,
      created_at: createdAt,
    });
  }

  console.log(`Old layers: ${oldLayers.length}`);
  console.log(`Prepared layers: ${rows.length}`);
  console.log(`Skipped missing inventory: ${skippedMissingInventory.length}`);
  console.log(`Skipped already present: ${skippedExisting.length}`);

  if (DRY_RUN) {
    console.log("DRY_RUN=1: no data written.");
    return;
  }

  for (const batch of chunk(rows, 500)) {
    await newDb`
      insert into public.inventory_cost_layers ${newDb(batch as unknown as Record<string, unknown>[])}
    `;
  }

  console.log("Backfill complete.");
}

main()
  .catch((error) => {
    console.error("Inventory cost layer backfill failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await oldDb.end();
    await newDb.end();
  });

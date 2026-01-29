import "dotenv/config";
import postgres from "postgres";

const requiredEnv = ["NEW_DATABASE_URL", "NEW_ORG_ID"];

const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const NEW_DATABASE_URL = process.env.NEW_DATABASE_URL!;
const NEW_ORG_ID = process.env.NEW_ORG_ID!;

const DRY_RUN = process.env.DRY_RUN === "1";
const RESET_TARGET = process.env.RESET_TARGET === "1";

const newDb = postgres(NEW_DATABASE_URL, { prepare: false, max: 1 });

type OrderRow = {
  id: string;
  shipped_date: string | null;
  delivered_date: string | null;
  order_date: string | null;
};

type AllocationMovement = {
  id: string;
  inventory_id: string;
  product_id: string;
  location_id: string;
  quantity: number;
  reference_id: string;
  created_at: string | null;
};

type InventoryRow = {
  id: string;
  quantity_on_hand: number | string | null;
  unit_cost: number | string | null;
};

type CostLayerRow = {
  inventory_id: string;
  quantity_remaining: number | string | null;
  unit_cost: number | string | null;
};

type NewMovementRow = {
  id: string;
  organization_id: string;
  inventory_id: string;
  product_id: string;
  location_id: string;
  movement_type: "ship";
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  unit_cost: number;
  total_cost: number;
  reference_type: "order";
  reference_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
  created_by: string | null;
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

function pickShipDate(order: OrderRow, fallback?: string | null) {
  return order.delivered_date ?? order.shipped_date ?? fallback ?? order.order_date ?? new Date().toISOString();
}

async function main() {
  console.log("Synthesizing outbound ship movements from order allocations...");
  console.log(`NEW_ORG_ID: ${NEW_ORG_ID}`);
  console.log(`DRY_RUN: ${DRY_RUN}`);
  console.log(`RESET_TARGET: ${RESET_TARGET}`);

  const orders = await newDb<OrderRow[]>`
    select id, shipped_date, delivered_date, order_date
    from orders
    where organization_id = ${NEW_ORG_ID}
      and status in ('shipped', 'delivered')
  `;

  if (orders.length === 0) {
    console.log("No shipped/delivered orders found. Nothing to do.");
    return;
  }

  const orderIds = orders.map((order) => order.id);
  const orderById = new Map(orders.map((order) => [order.id, order]));

  if (RESET_TARGET && !DRY_RUN) {
    await newDb`
      delete from inventory_movements
      where organization_id = ${NEW_ORG_ID}
        and movement_type = 'ship'
        and metadata->>'synthetic' = 'true'
    `;
  }

  const allocations = await newDb<AllocationMovement[]>`
    select id, inventory_id, product_id, location_id, quantity, reference_id, created_at
    from inventory_movements
    where organization_id = ${NEW_ORG_ID}
      and movement_type = 'allocate'
      and reference_type = 'order'
      and reference_id in ${newDb(orderIds)}
  `;

  if (allocations.length === 0) {
    console.log("No order allocations found. Nothing to do.");
    return;
  }

  const allocationIds = allocations.map((a) => a.id);
  const existingSynthetic = await newDb<{ source_id: string }[]>`
    select metadata->>'sourceMovementId' as source_id
    from inventory_movements
    where organization_id = ${NEW_ORG_ID}
      and movement_type = 'ship'
      and metadata->>'sourceMovementId' in ${newDb(allocationIds)}
  `;
  const existingSyntheticSet = new Set(existingSynthetic.map((row) => row.source_id));

  const inventoryIds = Array.from(new Set(allocations.map((a) => a.inventory_id)));
  const inventoryRows = await newDb<InventoryRow[]>`
    select id, quantity_on_hand, unit_cost
    from inventory
    where organization_id = ${NEW_ORG_ID}
      and id in ${newDb(inventoryIds)}
  `;
  const inventoryById = new Map(inventoryRows.map((row) => [row.id, row]));

  const costLayers = await newDb<CostLayerRow[]>`
    select inventory_id, quantity_remaining, unit_cost
    from inventory_cost_layers
    where organization_id = ${NEW_ORG_ID}
      and inventory_id in ${newDb(inventoryIds)}
      and quantity_remaining > 0
  `;
  const weightedCostByInventoryId = new Map<string, number>();
  for (const layer of costLayers) {
    const qty = toNumber(layer.quantity_remaining);
    if (qty <= 0) continue;
    const cost = toNumber(layer.unit_cost);
    const existing = weightedCostByInventoryId.get(layer.inventory_id) ?? 0;
    const existingQty = weightedCostByInventoryId.get(`${layer.inventory_id}:qty`) ?? 0;
    weightedCostByInventoryId.set(layer.inventory_id, existing + qty * cost);
    weightedCostByInventoryId.set(`${layer.inventory_id}:qty`, existingQty + qty);
  }

  const movements: NewMovementRow[] = [];
  const skippedExisting = new Set<string>();
  const skippedMissingInventory = new Set<string>();

  for (const allocation of allocations) {
    if (existingSyntheticSet.has(allocation.id)) {
      skippedExisting.add(allocation.id);
      continue;
    }

    const order = orderById.get(allocation.reference_id);
    if (!order) {
      continue;
    }

    const inventory = inventoryById.get(allocation.inventory_id);
    if (!inventory) {
      skippedMissingInventory.add(allocation.inventory_id);
      continue;
    }

    const avgCostTotal = weightedCostByInventoryId.get(allocation.inventory_id) ?? 0;
    const avgCostQty = weightedCostByInventoryId.get(`${allocation.inventory_id}:qty`) ?? 0;
    const fallbackUnitCost = toNumber(inventory.unit_cost);
    const unitCost = avgCostQty > 0 ? avgCostTotal / avgCostQty : fallbackUnitCost;

    const quantity = toNumber(allocation.quantity);
    const shipQuantity = quantity === 0 ? 0 : -Math.abs(quantity);
    const previousQuantity = toNumber(inventory.quantity_on_hand);
    const newQuantity = previousQuantity;
    const totalCost = Math.abs(shipQuantity) * unitCost;

    movements.push({
      id: crypto.randomUUID(),
      organization_id: NEW_ORG_ID,
      inventory_id: allocation.inventory_id,
      product_id: allocation.product_id,
      location_id: allocation.location_id,
      movement_type: "ship",
      quantity: shipQuantity,
      previous_quantity: previousQuantity,
      new_quantity: newQuantity,
      unit_cost: unitCost,
      total_cost: totalCost,
      reference_type: "order",
      reference_id: allocation.reference_id,
      metadata: {
        synthetic: true,
        sourceMovementId: allocation.id,
        source: "order-allocation",
      },
      created_at: pickShipDate(order, allocation.created_at),
      created_by: null,
    });
  }

  console.log(`Orders (shipped/delivered): ${orders.length}`);
  console.log(`Allocations found: ${allocations.length}`);
  console.log(`Prepared ship movements: ${movements.length}`);
  console.log(`Skipped existing synthetic: ${skippedExisting.size}`);
  console.log(`Skipped missing inventory: ${skippedMissingInventory.size}`);

  if (DRY_RUN) {
    console.log("DRY_RUN=1: no data written.");
    return;
  }

  for (const batch of chunk(movements, 500)) {
    await newDb`
      insert into public.inventory_movements ${newDb(batch as unknown as Record<string, unknown>[])}
    `;
  }

  console.log("Synthetic outbound movements created.");
}

main()
  .catch((error) => {
    console.error("Synthetic outbound movement creation failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await newDb.end();
  });

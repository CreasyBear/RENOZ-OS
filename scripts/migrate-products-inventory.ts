import "dotenv/config";
import postgres from "postgres";
import { randomUUID } from "crypto";

const requiredEnv = [
  "OLD_DATABASE_URL",
  "NEW_DATABASE_URL",
  "OLD_ORG_ID",
  "NEW_ORG_ID",
  "MAIN_WAREHOUSE_LOCATION_ID",
];

const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const OLD_DATABASE_URL = process.env.OLD_DATABASE_URL!;
const NEW_DATABASE_URL = process.env.NEW_DATABASE_URL!;
const OLD_ORG_ID = process.env.OLD_ORG_ID!;
const NEW_ORG_ID = process.env.NEW_ORG_ID!;
const MAIN_WAREHOUSE_LOCATION_ID = process.env.MAIN_WAREHOUSE_LOCATION_ID!;

const DRY_RUN = process.env.DRY_RUN === "1";
const RESET_TARGET = process.env.RESET_TARGET === "1";

const oldDb = postgres(OLD_DATABASE_URL, { prepare: false, max: 1 });
const newDb = postgres(NEW_DATABASE_URL, { prepare: false, max: 1 });

type OldProduct = {
  id: string;
  organization_id: string;
  sku: string;
  name: string;
  description: string | null;
  product_type: "SYSTEM" | "COMPONENT" | "ACCESSORY" | string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED" | string;
  cost_price: number | null;
  sell_price: number | null;
  currency: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
};

type OldInventoryItem = {
  id: string;
  organization_id: string;
  product_id: string;
  serial_number: string | null;
  batch_number: string | null;
  status:
    | "IN_STOCK"
    | "ALLOCATED"
    | "SOLD"
    | "RETURNED"
    | "DAMAGED"
    | "QUARANTINED"
    | "ARCHIVED"
    | string;
  quantity: number;
  cost_price: number | null;
  created_at: string;
  updated_at: string;
};

type OldInventoryEvent = {
  id: string;
  organization_id: string;
  inventory_item_id: string | null;
  event_type: string;
  event_timestamp: string;
  quantity_changed: number | null;
  related_order_id: string | null;
  related_adjustment_id: string | null;
  user_id: string | null;
  product_id_snapshot: string | null;
  product_sku_snapshot: string | null;
  product_name_snapshot: string | null;
  serial_number_snapshot: string | null;
  previous_status: string | null;
  new_status: string | null;
  cost_price_snapshot: number | null;
  reason: string | null;
  notes: string | null;
};

type NewInventoryRow = {
  id: string;
  organization_id: string;
  product_id: string;
  location_id: string;
  status: string;
  quantity_on_hand: number;
  quantity_allocated: number;
  unit_cost: number;
  total_value: number;
  lot_number: string | null;
  serial_number: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

type NewMovementRow = {
  id: string;
  organization_id: string;
  inventory_id: string;
  product_id: string;
  location_id: string;
  movement_type: string;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  unit_cost: number;
  total_cost: number;
  reference_type: string | null;
  reference_id: string | null;
  metadata: Record<string, unknown>;
  notes: string | null;
  created_at: string;
  created_by: string | null;
};

function mapProductType(oldType: string) {
  switch (oldType) {
    case "SYSTEM":
    case "COMPONENT":
    case "ACCESSORY":
      return "physical";
    default:
      return "physical";
  }
}

function mapProductStatus(oldStatus: string) {
  switch (oldStatus) {
    case "ACTIVE":
      return "active";
    case "ARCHIVED":
      return "discontinued";
    case "DRAFT":
    default:
      return "inactive";
  }
}

function mapInventoryStatus(oldStatus: string) {
  switch (oldStatus) {
    case "IN_STOCK":
      return "available";
    case "ALLOCATED":
      return "allocated";
    case "SOLD":
      return "sold";
    case "RETURNED":
      return "returned";
    case "DAMAGED":
      return "damaged";
    case "QUARANTINED":
    case "ARCHIVED":
      return "quarantined";
    default:
      return "available";
  }
}

function mapMovementType(eventType: string) {
  switch (eventType) {
    case "STOCK_IN":
      return "receive";
    case "ALLOCATION":
      return "allocate";
    case "SALE":
      return "ship";
    case "ADJUSTMENT_UP":
    case "ADJUSTMENT_DOWN":
    case "STATUS_CHANGE":
      return "adjust";
    case "SHIPMENT_OUTBOUND":
      return "ship";
    case "SHIPMENT_INBOUND":
      return "receive";
    case "RETURN_PROCESSED":
      return "return";
    default:
      return "adjust";
  }
}

function inventoryQuantities(
  status: string,
  quantity: number
): { onHand: number; allocated: number } {
  switch (status) {
    case "allocated":
      return { onHand: quantity, allocated: quantity };
    case "sold":
      return { onHand: 0, allocated: 0 };
    case "available":
      return { onHand: quantity, allocated: 0 };
    case "returned":
      return { onHand: quantity, allocated: 0 };
    case "damaged":
    case "quarantined":
      return { onHand: quantity, allocated: 0 };
    default:
      return { onHand: quantity, allocated: 0 };
  }
}

async function main() {
  console.log("Starting products + inventory migration...");

  const oldProducts = (await oldDb<OldProduct[]>`
    select *
    from public.products
    where organization_id = ${OLD_ORG_ID}
  `) as OldProduct[];

  const oldInventoryItems = (await oldDb<OldInventoryItem[]>`
    select *
    from public.inventory_items
    where organization_id = ${OLD_ORG_ID}
  `) as OldInventoryItem[];

  const oldInventoryEvents = (await oldDb<OldInventoryEvent[]>`
    select *
    from public.inventory_transaction_events
    where organization_id = ${OLD_ORG_ID}
    order by event_timestamp asc
  `) as OldInventoryEvent[];

  const serializedProductIds = new Set(
    oldInventoryItems
      .filter((item) => item.serial_number)
      .map((item) => item.product_id)
  );

  const newProducts = oldProducts.map((product) => {
    const status = mapProductStatus(product.status);
    const isSerialized = serializedProductIds.has(product.id);
    return {
      id: product.id,
      organization_id: NEW_ORG_ID,
      sku: product.sku,
      name: product.name,
      description: product.description,
      category_id: null,
      type: mapProductType(product.product_type),
      status,
      base_price: product.sell_price ?? 0,
      cost_price: product.cost_price ?? null,
      tax_type: "gst",
      is_serialized: isSerialized,
      track_inventory: true,
      is_active: status === "active",
      is_sellable: true,
      is_purchasable: true,
      reorder_point: 0,
      reorder_qty: 0,
      tags: product.tags ?? [],
      metadata: {},
      created_at: product.created_at,
      updated_at: product.updated_at,
    };
  });

  if (RESET_TARGET && !DRY_RUN) {
    console.log("RESET_TARGET=1: clearing target tables for org...");
    await newDb`
      delete from public.inventory_movements where organization_id = ${NEW_ORG_ID}
    `;
    await newDb`
      delete from public.inventory where organization_id = ${NEW_ORG_ID}
    `;
    await newDb`
      delete from public.products where organization_id = ${NEW_ORG_ID}
    `;
  }

  if (!DRY_RUN) {
    if (newProducts.length > 0) {
      const productColumns = [
        "id",
        "organization_id",
        "sku",
        "name",
        "description",
        "category_id",
        "type",
        "status",
        "base_price",
        "cost_price",
        "tax_type",
        "is_serialized",
        "track_inventory",
        "is_active",
        "is_sellable",
        "is_purchasable",
        "reorder_point",
        "reorder_qty",
        "tags",
        "metadata",
        "created_at",
        "updated_at",
      ] as const;

      await newDb`
        insert into public.products ${newDb(newProducts, productColumns)}
        on conflict (id) do nothing
      `;
    }
  } else {
    console.log(`DRY_RUN: would insert ${newProducts.length} products`);
  }

  const inventoryRows: NewInventoryRow[] = [];
  const inventoryIdByOldItemId = new Map<string, string>();
  const productIdByOldItemId = new Map<string, string>();
  const aggregateMap = new Map<string, OldInventoryItem[]>();

  for (const item of oldInventoryItems) {
    if (item.serial_number) {
      const status = mapInventoryStatus(item.status);
      const quantities = inventoryQuantities(status, 1);
      inventoryIdByOldItemId.set(item.id, item.id);
      productIdByOldItemId.set(item.id, item.product_id);
      inventoryRows.push({
        id: item.id,
        organization_id: NEW_ORG_ID,
        product_id: item.product_id,
        location_id: MAIN_WAREHOUSE_LOCATION_ID,
        status,
        quantity_on_hand: quantities.onHand,
        quantity_allocated: quantities.allocated,
        unit_cost: item.cost_price ?? 0,
        total_value: (item.cost_price ?? 0) * quantities.onHand,
        lot_number: item.batch_number,
        serial_number: item.serial_number,
        created_at: item.created_at,
        updated_at: item.updated_at,
        created_by: null,
        updated_by: null,
      });
    } else {
      const status = mapInventoryStatus(item.status);
      const key = [
        item.product_id,
        item.batch_number ?? "none",
        status,
      ].join("|");
      const items = aggregateMap.get(key) ?? [];
      items.push(item);
      aggregateMap.set(key, items);
    }
  }

  for (const [key, items] of aggregateMap.entries()) {
    const [productId, batchNumber, status] = key.split("|");
    const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    if (totalQty <= 0) continue;

    const quantities = inventoryQuantities(status, totalQty);
    const unitCost =
      items.find((item) => item.cost_price !== null)?.cost_price ?? 0;
    const createdAt = items
      .map((item) => item.created_at)
      .sort()[0];
    const updatedAt = items
      .map((item) => item.updated_at)
      .sort()
      .reverse()[0];

    inventoryRows.push({
      id: randomUUID(),
      organization_id: NEW_ORG_ID,
      product_id: productId,
      location_id: MAIN_WAREHOUSE_LOCATION_ID,
      status,
      quantity_on_hand: quantities.onHand,
      quantity_allocated: quantities.allocated,
      unit_cost: unitCost,
      total_value: unitCost * quantities.onHand,
      lot_number: batchNumber === "none" ? null : batchNumber,
      serial_number: null,
      created_at: createdAt,
      updated_at: updatedAt,
      created_by: null,
      updated_by: null,
    });
  }

  if (!DRY_RUN) {
    if (inventoryRows.length > 0) {
      const inventoryColumns = [
        "id",
        "organization_id",
        "product_id",
        "location_id",
        "status",
        "quantity_on_hand",
        "quantity_allocated",
        "unit_cost",
        "total_value",
        "lot_number",
        "serial_number",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
      ] as const;

      await newDb`
        insert into public.inventory ${newDb(inventoryRows, inventoryColumns)}
        on conflict (id) do nothing
      `;
    }
  } else {
    console.log(`DRY_RUN: would insert ${inventoryRows.length} inventory rows`);
  }

  const movementRows: NewMovementRow[] = [];
  let skippedEvents = 0;

  for (const event of oldInventoryEvents) {
    if (!event.inventory_item_id) {
      skippedEvents += 1;
      continue;
    }

    const inventoryId = inventoryIdByOldItemId.get(event.inventory_item_id);
    if (!inventoryId) {
      skippedEvents += 1;
      continue;
    }
    const productId = productIdByOldItemId.get(event.inventory_item_id);
    if (!productId) {
      skippedEvents += 1;
      continue;
    }

    const movementType = mapMovementType(event.event_type);
    const quantity = event.quantity_changed ?? 1;
    const unitCost = event.cost_price_snapshot ?? 0;
    const referenceType = event.related_order_id
      ? "order"
      : event.related_adjustment_id
        ? "adjustment"
        : null;
    const referenceId = event.related_order_id ?? event.related_adjustment_id;

    movementRows.push({
      id: event.id,
      organization_id: NEW_ORG_ID,
      inventory_id: inventoryId,
      product_id: productId,
      location_id: MAIN_WAREHOUSE_LOCATION_ID,
      movement_type: movementType,
      quantity,
      previous_quantity: 0,
      new_quantity: 0,
      unit_cost: unitCost,
      total_cost: unitCost * quantity,
      reference_type: referenceType,
      reference_id: referenceId,
      metadata: {
        old_event_type: event.event_type,
        previous_status: event.previous_status,
        new_status: event.new_status,
        product_sku: event.product_sku_snapshot,
        product_name: event.product_name_snapshot,
        serial_number: event.serial_number_snapshot,
        reason: event.reason,
      },
      notes: event.notes,
      created_at: event.event_timestamp,
      created_by: event.user_id,
    });
  }

  if (!DRY_RUN) {
    if (movementRows.length > 0) {
      const movementColumns = [
        "id",
        "organization_id",
        "inventory_id",
        "product_id",
        "location_id",
        "movement_type",
        "quantity",
        "previous_quantity",
        "new_quantity",
        "unit_cost",
        "total_cost",
        "reference_type",
        "reference_id",
        "metadata",
        "notes",
        "created_at",
        "created_by",
      ] as const;

      await newDb`
        insert into public.inventory_movements ${newDb(
          movementRows,
          movementColumns
        )}
        on conflict (id) do nothing
      `;
    }
  } else {
    console.log(`DRY_RUN: would insert ${movementRows.length} movements`);
  }

  console.log("Migration summary:");
  console.log(`- Products: ${newProducts.length}`);
  console.log(`- Inventory rows: ${inventoryRows.length}`);
  console.log(`- Movements: ${movementRows.length}`);
  console.log(`- Events skipped (no inventory map): ${skippedEvents}`);

  await oldDb.end();
  await newDb.end();
}

main().catch(async (err) => {
  console.error("Migration failed:", err);
  await oldDb.end();
  await newDb.end();
  process.exit(1);
});

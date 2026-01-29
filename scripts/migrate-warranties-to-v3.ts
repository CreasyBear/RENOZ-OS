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

type OldWarrantyRow = {
  id: string;
  warranty_number: string;
  warranty_type: string | null;
  status: string | null;
  customer_id: string;
  order_id: string | null;
  registered_at: string | null;
  end_date: string | null;
  transferred_from_customer_id: string | null;
  transferred_at: string | null;
  registration_notes: string | null;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  product_id: string | null;
};

type OldWarrantyItemRow = {
  warranty_item_id: string;
  warranty_id: string;
  inventory_item_id: string | null;
  warranty_start_date: string;
  warranty_end_date: string;
  warranty_period_months: number;
  installation_notes: string | null;
  product_id: string | null;
  serial_number: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type NewPolicyRow = {
  id: string;
  type: "battery_performance" | "inverter_manufacturer" | "installation_workmanship";
};

type NewWarrantyInsert = {
  id: string;
  organization_id: string;
  warranty_number: string;
  customer_id: string;
  product_id: string;
  product_serial: string | null;
  warranty_policy_id: string;
  order_id: string | null;
  project_id: string | null;
  registration_date: string | null;
  expiry_date: string | null;
  status: "active" | "expiring_soon" | "expired" | "voided" | "transferred";
  original_customer_id: string | null;
  transferred_at: string | null;
  expiry_alert_opt_out: boolean;
  certificate_url: string | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type NewWarrantyItemInsert = {
  id: string;
  organization_id: string;
  warranty_id: string;
  product_id: string;
  product_serial: string | null;
  inventory_id: string | null;
  warranty_start_date: string;
  warranty_end_date: string;
  warranty_period_months: number;
  installation_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
};

const policyTypeMap: Record<string, NewPolicyRow["type"]> = {
  manufacturer: "inverter_manufacturer",
  extended: "battery_performance",
  service_plan: "installation_workmanship",
};

function chunk<T>(rows: T[], size: number) {
  const batches: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    batches.push(rows.slice(i, i + size));
  }
  return batches;
}

function mapStatus(status: string | null): NewWarrantyInsert["status"] {
  switch (status) {
    case "ACTIVE":
      return "active";
    case "EXPIRED":
      return "expired";
    case "VOID":
      return "voided";
    case "TRANSFERRED":
      return "transferred";
    default:
      return "active";
  }
}

async function main() {
  console.log("Migrating warranties to renoz-v3...");
  console.log(`OLD_ORG_ID: ${OLD_ORG_ID}`);
  console.log(`NEW_ORG_ID: ${NEW_ORG_ID}`);
  console.log(`DRY_RUN: ${DRY_RUN}`);
  console.log(`RESET_TARGET: ${RESET_TARGET}`);

  const [policies, warranties, items] = await Promise.all([
    newDb<NewPolicyRow[]>`
      select id, type
      from warranty_policies
      where organization_id = ${NEW_ORG_ID}
        and is_default = true
    `,
    oldDb<OldWarrantyRow[]>`
      select
        id,
        warranty_number,
        warranty_type,
        status,
        customer_id,
        order_id,
        registered_at,
        end_date,
        transferred_from_customer_id,
        transferred_at,
        registration_notes,
        created_by_user_id,
        updated_by_user_id,
        created_at,
        updated_at,
        product_id
      from warranties
      where organization_id = ${OLD_ORG_ID}
    `,
    oldDb<OldWarrantyItemRow[]>`
      select
        wi.id as warranty_item_id,
        wi.warranty_id,
        wi.inventory_item_id,
        wi.warranty_start_date,
        wi.warranty_end_date,
        wi.warranty_period_months,
        wi.installation_notes,
        ii.product_id,
        ii.serial_number,
        wi.created_at,
        wi.updated_at
      from warranty_items wi
      left join inventory_items ii on ii.id = wi.inventory_item_id
      where wi.organization_id = ${OLD_ORG_ID}
      order by wi.warranty_id, wi.warranty_start_date asc
    `,
  ]);

  if (policies.length === 0) {
    console.error("No default warranty policies found in target org. Aborting.");
    process.exit(1);
  }

  const policyByType = new Map(policies.map((p) => [p.type, p.id]));
  const itemsByWarranty = new Map<string, OldWarrantyItemRow[]>();
  const productIds = new Set<string>();
  const serials = new Set<string>();

  for (const item of items) {
    if (!itemsByWarranty.has(item.warranty_id)) {
      itemsByWarranty.set(item.warranty_id, []);
    }
    itemsByWarranty.get(item.warranty_id)!.push(item);
    if (item.product_id) {
      productIds.add(item.product_id);
    }
    if (item.serial_number) {
      serials.add(item.serial_number);
    }
  }

  const customerIds = Array.from(new Set(warranties.map((w) => w.customer_id)));
  const orderIds = Array.from(
    new Set(warranties.map((w) => w.order_id).filter(Boolean) as string[])
  );

  const [existingCustomers, existingProducts, existingOrders, inventoryRows] =
    await Promise.all([
      newDb<{ id: string }[]>`
        select id
        from customers
        where id in ${newDb(customerIds)}
      `,
      productIds.size === 0
        ? Promise.resolve([])
        : newDb<{ id: string }[]>`
            select id
            from products
            where id in ${newDb(Array.from(productIds))}
          `,
      orderIds.length === 0
        ? Promise.resolve([])
        : newDb<{ id: string }[]>`
            select id
            from orders
            where id in ${newDb(orderIds)}
          `,
      serials.size === 0
        ? Promise.resolve([])
        : newDb<{ id: string; serial_number: string }[]>`
            select id, serial_number
            from inventory
            where serial_number in ${newDb(Array.from(serials))}
          `,
    ]);

  const customerSet = new Set(existingCustomers.map((row) => row.id));
  const productSet = new Set(existingProducts.map((row) => row.id));
  const orderSet = new Set(existingOrders.map((row) => row.id));
  const inventoryBySerial = new Map(inventoryRows.map((row) => [row.serial_number, row.id]));

  const existingWarrantyIds = await newDb<{ id: string }[]>`
    select id
    from warranties
    where organization_id = ${NEW_ORG_ID}
      and id in ${newDb(warranties.map((w) => w.id))}
  `;
  const existingWarrantySet = new Set(existingWarrantyIds.map((row) => row.id));

  const warrantiesToInsert: NewWarrantyInsert[] = [];
  const warrantyItemsToInsert: NewWarrantyItemInsert[] = [];
  const skipped = {
    missingCustomer: 0,
    missingProduct: 0,
    missingPolicy: 0,
    existingWarranty: 0,
    missingItems: 0,
  };

  for (const warranty of warranties) {
    if (existingWarrantySet.has(warranty.id)) {
      skipped.existingWarranty += 1;
      continue;
    }
    if (!customerSet.has(warranty.customer_id)) {
      skipped.missingCustomer += 1;
      continue;
    }

    const typeKey = warranty.warranty_type ?? "manufacturer";
    const policyType = policyTypeMap[typeKey];
    const policyId = policyType ? policyByType.get(policyType) : undefined;
    if (!policyId) {
      skipped.missingPolicy += 1;
      continue;
    }

    const itemsForWarranty = itemsByWarranty.get(warranty.id) ?? [];
    const primaryItem = itemsForWarranty[0];

    const headerProductId = primaryItem?.product_id ?? warranty.product_id;
    if (!headerProductId || !productSet.has(headerProductId)) {
      skipped.missingProduct += 1;
      continue;
    }

    if (itemsForWarranty.length === 0) {
      skipped.missingItems += 1;
      continue;
    }

    const orderId = warranty.order_id && orderSet.has(warranty.order_id) ? warranty.order_id : null;

    warrantiesToInsert.push({
      id: warranty.id,
      organization_id: NEW_ORG_ID,
      warranty_number: warranty.warranty_number,
      customer_id: warranty.customer_id,
      product_id: headerProductId,
      product_serial: primaryItem?.serial_number ?? null,
      warranty_policy_id: policyId,
      order_id: orderId,
      project_id: null,
      registration_date: warranty.registered_at,
      expiry_date: warranty.end_date,
      status: mapStatus(warranty.status),
      original_customer_id: warranty.transferred_from_customer_id,
      transferred_at: warranty.transferred_at,
      expiry_alert_opt_out: false,
      certificate_url: null,
      notes: warranty.registration_notes,
      created_by: warranty.created_by_user_id,
      updated_by: warranty.updated_by_user_id,
      created_at: warranty.created_at,
      updated_at: warranty.updated_at,
    });

    for (const item of itemsForWarranty) {
      if (!item.product_id || !productSet.has(item.product_id)) {
        skipped.missingProduct += 1;
        continue;
      }

      warrantyItemsToInsert.push({
        id: item.warranty_item_id,
        organization_id: NEW_ORG_ID,
        warranty_id: warranty.id,
        product_id: item.product_id,
        product_serial: item.serial_number,
        inventory_id: item.serial_number ? inventoryBySerial.get(item.serial_number) ?? null : null,
        warranty_start_date: item.warranty_start_date,
        warranty_end_date: item.warranty_end_date,
        warranty_period_months: item.warranty_period_months,
        installation_notes: item.installation_notes,
        created_at: item.created_at,
        updated_at: item.updated_at,
        created_by: warranty.created_by_user_id,
        updated_by: warranty.updated_by_user_id,
      });
    }
  }

  console.log(`Source warranties: ${warranties.length}`);
  console.log(`Source warranty items: ${items.length}`);
  console.log(`Prepared warranties: ${warrantiesToInsert.length}`);
  console.log(`Prepared warranty items: ${warrantyItemsToInsert.length}`);
  console.log("Skipped:", skipped);

  if (DRY_RUN) {
    console.log("DRY_RUN=1: no data written.");
    return;
  }

  if (RESET_TARGET) {
    await newDb`
      delete from warranty_items
      where organization_id = ${NEW_ORG_ID}
    `;
    await newDb`
      delete from warranties
      where organization_id = ${NEW_ORG_ID}
    `;
  }

  for (const batch of chunk(warrantiesToInsert, 250)) {
    await newDb`insert into warranties ${newDb(batch as unknown as Record<string, unknown>[])};`;
  }

  for (const batch of chunk(warrantyItemsToInsert, 500)) {
    await newDb`insert into warranty_items ${newDb(batch as unknown as Record<string, unknown>[])};`;
  }

  console.log("Warranty migration complete.");
}

main()
  .catch((error) => {
    console.error("Warranty migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await oldDb.end();
    await newDb.end();
  });

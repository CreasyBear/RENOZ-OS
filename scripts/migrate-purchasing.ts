import "dotenv/config";
import postgres from "postgres";
import { randomUUID } from "crypto";

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

type OldSupplier = {
  id: string;
  organization_id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  default_currency: string | null;
  payment_terms: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
};

type OldPurchaseOrder = {
  id: string;
  organization_id: string;
  supplier_id: string;
  purchase_order_number: string;
  status: string;
  order_date: string;
  expected_delivery_date: string | null;
  notes: string | null;
  terms: string | null;
  subtotal_amount: number;
  total_additional_costs_estimated: number;
  total_additional_costs_actual: number | null;
  grand_total_amount_estimated: number;
  grand_total_amount_actual: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string | null;
  issued_at: string | null;
  closed_at: string | null;
  cancelled_at: string | null;
  goods_receipt_status: string;
};

type OldPurchaseOrderLineItem = {
  id: string;
  purchase_order_id: string;
  product_id: string;
  quantity_ordered: number;
  unit_cost: number;
  line_total: number;
  quantity_received_overall: number;
  expected_delivery_date: string | null;
  landed_unit_cost: number | null;
  created_at: string;
  updated_at: string;
};

type OldPurchaseOrderAdditionalCost = {
  id: string;
  purchase_order_id: string;
  type: string;
  description: string | null;
  estimated_amount: number;
  actual_amount: number | null;
  created_at: string;
  updated_at: string;
};

type OldShipment = {
  id: string;
  organization_id: string;
  shipment_reference: string;
  supplier_id: string;
  arrival_date: string;
  received_by_user_id: string;
  warehouse_location: string | null;
  freight_provider: string | null;
  tracking_number: string | null;
  customs_clearance_date: string | null;
  freight_cost_local: number;
  freight_currency: string;
  freight_exchange_rate: number;
  customs_cost_local: number;
  insurance_cost_local: number;
  status: string;
  stock_in_status: string;
  notes: string | null;
  total_landed_cost_aud: number | null;
  created_at: string;
  updated_at: string;
};

type OldShipmentItem = {
  id: string;
  shipment_id: string;
  product_id: string;
  product_sku_snapshot: string;
  product_name_snapshot: string;
  quantity_received: number;
  quantity_stocked_in: number;
  unit_fob_cost_aud: number;
  unit_landed_cost_aud: number;
  serial_numbers: string[] | null;
  batch_number: string | null;
  expiry_date: string | null;
  stock_in_status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type OldShipmentAllocation = {
  id: string;
  shipment_item_id: string;
  purchase_order_id: string;
  purchase_order_line_item_id: string;
  quantity_allocated: number;
  created_at: string;
  allocation_basis: string;
  allocation_percentage: number | null;
  allocated_freight_cost: number | null;
  allocated_customs_cost: number | null;
  allocated_insurance_cost: number | null;
  freight_cost_variance: number | null;
  updated_at: string | null;
};

type OldGoodsReceipt = {
  id: string;
  organization_id: string;
  purchase_order_id: string;
  receipt_number: string;
  receipt_date: string;
  received_by_user_id: string;
  status: string;
  stock_in_status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  shipment_reference: string | null;
  freight_provider: string | null;
  tracking_number: string | null;
  delivery_confirmed_date: string | null;
  shipment_id: string | null;
  freight_cost_local: number | null;
};

type OldGoodsReceiptLineItem = {
  id: string;
  goods_receipt_id: string;
  purchase_order_line_item_id: string;
  product_id: string;
  product_sku_snapshot: string;
  product_name_snapshot: string;
  quantity_ordered_snapshot: number;
  quantity_received: number;
  unit_landed_cost: number;
  total_landed_cost: number;
  serials_received: string[] | null;
  location_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type NewSupplierRow = {
  id: string;
  organization_id: string;
  name: string;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  supplier_type: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  billing_address: Record<string, unknown> | null;
  shipping_address: Record<string, unknown> | null;
  payment_terms: string | null;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  total_purchase_orders: number;
  total_purchase_value: number | null;
  average_order_value: number | null;
  first_order_date: string | null;
  last_order_date: string | null;
};

type NewPurchaseOrderRow = {
  id: string;
  organization_id: string;
  po_number: string;
  supplier_id: string;
  status: string;
  order_date: string;
  required_date: string | null;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  payment_terms: string | null;
  ordered_by: string | null;
  ordered_at: string | null;
  closed_by: string | null;
  closed_at: string | null;
  notes: string | null;
  internal_notes: string | null;
  metadata: Record<string, unknown> | null;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
};

type NewPurchaseOrderItemRow = {
  id: string;
  organization_id: string;
  purchase_order_id: string;
  product_id: string | null;
  line_number: number;
  product_name: string;
  product_sku: string | null;
  description: string | null;
  quantity: number;
  unit_of_measure: string | null;
  unit_price: number;
  discount_percent: number | null;
  tax_rate: number | null;
  line_total: number;
  quantity_received: number;
  quantity_rejected: number;
  quantity_pending: number;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type NewPurchaseOrderCostRow = {
  id: string;
  organization_id: string;
  purchase_order_id: string;
  cost_type: string;
  description: string | null;
  amount: number;
  currency: string;
  allocation_method: string;
  is_included_in_total: boolean;
  supplier_invoice_number: string | null;
  reference_number: string | null;
  notes: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

type NewReceiptRow = {
  id: string;
  organization_id: string;
  purchase_order_id: string;
  receipt_number: string;
  received_by: string;
  received_at: string;
  carrier: string | null;
  tracking_number: string | null;
  delivery_reference: string | null;
  total_items_expected: number;
  total_items_received: number;
  total_items_accepted: number;
  total_items_rejected: number;
  status: string;
  inspection_required: string;
  inspection_completed_at: string | null;
  inspection_completed_by: string | null;
  quality_notes: string | null;
  notes: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

type NewReceiptItemRow = {
  id: string;
  organization_id: string;
  receipt_id: string;
  purchase_order_item_id: string;
  line_number: number;
  quantity_expected: number;
  quantity_received: number;
  quantity_accepted: number;
  quantity_rejected: number;
  condition: string | null;
  rejection_reason: string | null;
  quality_notes: string | null;
  warehouse_location: string | null;
  bin_number: string | null;
  lot_number: string | null;
  serial_numbers: string[] | null;
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
};

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
};

type UserRow = {
  id: string;
};

const COST_TYPE_MAP: Record<string, string> = {
  freight: "freight",
  customs: "customs",
  insurance: "insurance",
  duty: "duty",
  handling: "handling",
};

function mapSupplierStatus(status: string | null): string {
  if (!status) return "active";
  return status.toUpperCase() === "ACTIVE" ? "active" : "inactive";
}

function mapPaymentTerms(value: string | null): string | null {
  if (!value) return "net_30";
  const normalized = value.toLowerCase().replace(/\s+/g, "_");
  if (["net_15", "net_30", "net_45", "net_60", "cod", "prepaid"].includes(normalized)) {
    return normalized;
  }
  return "net_30";
}

function mapPurchaseOrderStatus(status: string | null): string {
  if (!status) return "ordered";
  switch (status.toUpperCase()) {
    case "ORDERED":
      return "ordered";
    case "RECEIVED":
      return "received";
    case "CLOSED":
      return "closed";
    default:
      return "ordered";
  }
}

function mapReceiptStatus(status: string | null): string {
  if (!status) return "pending_inspection";
  switch (status.toUpperCase()) {
    case "COMPLETED":
      return "accepted";
    case "PENDING":
      return "pending_inspection";
    default:
      return "pending_inspection";
  }
}

function buildAddress(supplier: OldSupplier): Record<string, unknown> | null {
  const hasValue = [
    supplier.address_line1,
    supplier.address_line2,
    supplier.city,
    supplier.state,
    supplier.postal_code,
    supplier.country,
  ].some((value) => value && value.trim() !== "");
  if (!hasValue) return null;
  return {
    line1: supplier.address_line1,
    line2: supplier.address_line2,
    city: supplier.city,
    state: supplier.state,
    postalCode: supplier.postal_code,
    country: supplier.country,
  };
}

function sumAmount(values: Array<number | null | undefined>): number {
  return values.reduce<number>((sum, value) => sum + Number(value ?? 0), 0);
}

function chunk<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

async function main() {
  if (RESET_TARGET && !DRY_RUN) {
    console.log("RESET_TARGET=1: clearing target tables for org...");
    await newDb`delete from public.purchase_order_receipt_items where organization_id = ${NEW_ORG_ID}`;
    await newDb`delete from public.purchase_order_receipts where organization_id = ${NEW_ORG_ID}`;
    await newDb`delete from public.purchase_order_costs where organization_id = ${NEW_ORG_ID}`;
    await newDb`delete from public.purchase_order_items where organization_id = ${NEW_ORG_ID}`;
    await newDb`delete from public.purchase_orders where organization_id = ${NEW_ORG_ID}`;
    await newDb`delete from public.suppliers where organization_id = ${NEW_ORG_ID}`;
  }

  const [
    suppliers,
    purchaseOrders,
    purchaseOrderItems,
    purchaseOrderCosts,
    shipments,
    shipmentItems,
    shipmentAllocations,
    goodsReceipts,
    goodsReceiptItems,
  ] = await Promise.all([
    oldDb<OldSupplier[]>`
      select *
      from public.suppliers
      where organization_id = ${OLD_ORG_ID}
    `,
    oldDb<OldPurchaseOrder[]>`
      select *
      from public.purchase_orders
      where organization_id = ${OLD_ORG_ID}
    `,
    oldDb<OldPurchaseOrderLineItem[]>`
      select *
      from public.purchase_order_line_items
      where purchase_order_id in (
        select id from public.purchase_orders where organization_id = ${OLD_ORG_ID}
      )
    `,
    oldDb<OldPurchaseOrderAdditionalCost[]>`
      select *
      from public.purchase_order_additional_costs
      where purchase_order_id in (
        select id from public.purchase_orders where organization_id = ${OLD_ORG_ID}
      )
    `,
    oldDb<OldShipment[]>`
      select *
      from public.shipments
      where organization_id = ${OLD_ORG_ID}
    `,
    oldDb<OldShipmentItem[]>`
      select *
      from public.shipment_items
      where shipment_id in (
        select id from public.shipments where organization_id = ${OLD_ORG_ID}
      )
    `,
    oldDb<OldShipmentAllocation[]>`
      select *
      from public.shipment_po_allocations
      where shipment_item_id in (
        select id from public.shipment_items
        where shipment_id in (
          select id from public.shipments where organization_id = ${OLD_ORG_ID}
        )
      )
    `,
    oldDb<OldGoodsReceipt[]>`
      select *
      from public.goods_receipts
      where organization_id = ${OLD_ORG_ID}
    `,
    oldDb<OldGoodsReceiptLineItem[]>`
      select *
      from public.goods_receipt_line_items
      where goods_receipt_id in (
        select id from public.goods_receipts where organization_id = ${OLD_ORG_ID}
      )
    `,
  ]);

  const [products, users] = await Promise.all([
    newDb<ProductRow[]>`
      select id, name, sku, description
      from public.products
    `,
    newDb<UserRow[]>`
      select id
      from public.users
    `,
  ]);

  const productById = new Map(products.map((row) => [row.id, row]));
  const existingUserIds = new Set(users.map((row) => row.id));
  const fallbackUserId = users[0]?.id;
  if (!fallbackUserId) {
    throw new Error("No users found in target database to use as fallback.");
  }

  const supplierRows: NewSupplierRow[] = suppliers.map((supplier) => ({
    id: supplier.id,
    organization_id: NEW_ORG_ID,
    name: supplier.name,
    legal_name: null,
    email: supplier.email,
    phone: supplier.phone,
    status: mapSupplierStatus(supplier.status),
    supplier_type: null,
    primary_contact_name: supplier.contact_name,
    primary_contact_email: supplier.email,
    primary_contact_phone: supplier.phone,
    billing_address: buildAddress(supplier),
    shipping_address: null,
    payment_terms: mapPaymentTerms(supplier.payment_terms),
    currency: supplier.default_currency ?? "AUD",
    notes: supplier.notes,
    created_at: supplier.created_at,
    updated_at: supplier.updated_at,
    created_by: existingUserIds.has(supplier.created_by_user_id)
      ? supplier.created_by_user_id
      : null,
    updated_by:
      supplier.updated_by_user_id && existingUserIds.has(supplier.updated_by_user_id)
        ? supplier.updated_by_user_id
        : null,
    total_purchase_orders: 0,
    total_purchase_value: null,
    average_order_value: null,
    first_order_date: null,
    last_order_date: null,
  }));

  const supplierIds = new Set(supplierRows.map((row) => row.id));

  const purchaseOrderRows: NewPurchaseOrderRow[] = [];
  const skippedPurchaseOrders: string[] = [];

  for (const po of purchaseOrders) {
    if (!supplierIds.has(po.supplier_id)) {
      skippedPurchaseOrders.push(po.id);
      continue;
    }

    const subtotal = Number(po.subtotal_amount ?? 0);
    const totalAmount = subtotal;

    const orderedBy = existingUserIds.has(po.created_by_user_id) ? po.created_by_user_id : null;
    const closedByCandidate = po.updated_by_user_id ?? po.created_by_user_id;
    const closedBy =
      po.closed_at && closedByCandidate && existingUserIds.has(closedByCandidate)
        ? closedByCandidate
        : po.closed_at
          ? fallbackUserId
          : null;

    purchaseOrderRows.push({
      id: po.id,
      organization_id: NEW_ORG_ID,
      po_number: po.purchase_order_number,
      supplier_id: po.supplier_id,
      status: mapPurchaseOrderStatus(po.status),
      order_date: po.order_date,
      required_date: null,
      expected_delivery_date: po.expected_delivery_date,
      actual_delivery_date: null,
      subtotal,
      tax_amount: 0,
      shipping_amount: 0,
      discount_amount: 0,
      total_amount: totalAmount,
      currency: po.currency ?? "AUD",
      payment_terms: null,
      ordered_by: orderedBy,
      ordered_at: po.issued_at,
      closed_by: closedBy,
      closed_at: po.closed_at,
      notes: po.notes,
      internal_notes: po.terms,
      metadata: {
        legacy: {
          total_additional_costs_estimated: po.total_additional_costs_estimated,
          total_additional_costs_actual: po.total_additional_costs_actual,
          grand_total_amount_estimated: po.grand_total_amount_estimated,
          grand_total_amount_actual: po.grand_total_amount_actual,
          goods_receipt_status: po.goods_receipt_status,
          cancelled_at: po.cancelled_at,
        },
      },
      version: 1,
      created_at: po.created_at,
      updated_at: po.updated_at,
      created_by: existingUserIds.has(po.created_by_user_id)
        ? po.created_by_user_id
        : null,
      updated_by:
        po.updated_by_user_id && existingUserIds.has(po.updated_by_user_id)
          ? po.updated_by_user_id
          : null,
      deleted_at: null,
    });
  }

  const purchaseOrderIds = new Set(purchaseOrderRows.map((row) => row.id));
  const purchaseOrderNumberById = new Map(
    purchaseOrderRows.map((row) => [row.id, row.po_number])
  );

  const itemsByPo = new Map<string, OldPurchaseOrderLineItem[]>();
  for (const item of purchaseOrderItems) {
    const list = itemsByPo.get(item.purchase_order_id) ?? [];
    list.push(item);
    itemsByPo.set(item.purchase_order_id, list);
  }

  const purchaseOrderItemRows: NewPurchaseOrderItemRow[] = [];
  for (const [poId, items] of itemsByPo.entries()) {
    if (!purchaseOrderIds.has(poId)) continue;
    const sorted = [...items].sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      if (aTime === bTime) return a.id.localeCompare(b.id);
      return aTime - bTime;
    });

    sorted.forEach((item, index) => {
      const product = productById.get(item.product_id);
      const quantity = Number(item.quantity_ordered ?? 0);
      const quantityReceived = Number(item.quantity_received_overall ?? 0);
      const quantityPending = Math.max(0, quantity - quantityReceived);

      purchaseOrderItemRows.push({
        id: item.id,
        organization_id: NEW_ORG_ID,
        purchase_order_id: poId,
        product_id: product ? product.id : null,
        line_number: index + 1,
        product_name: product?.name ?? "Unknown product",
        product_sku: product?.sku ?? null,
        description: product?.description ?? null,
        quantity,
        unit_of_measure: "each",
        unit_price: Number(item.unit_cost ?? 0),
        discount_percent: 0,
        tax_rate: 0,
        line_total: Number(item.line_total ?? 0),
        quantity_received: quantityReceived,
        quantity_rejected: 0,
        quantity_pending: quantityPending,
        expected_delivery_date: item.expected_delivery_date,
        actual_delivery_date: null,
        notes: null,
        created_at: item.created_at,
        updated_at: item.updated_at,
      });
    });
  }

  const costRows: NewPurchaseOrderCostRow[] = [];
  for (const cost of purchaseOrderCosts) {
    if (!purchaseOrderIds.has(cost.purchase_order_id)) continue;
    const costTypeKey = cost.type?.toLowerCase() ?? "other";
    const costType = COST_TYPE_MAP[costTypeKey] ?? "other";
    const amount = Number(cost.actual_amount ?? cost.estimated_amount ?? 0);
    const description =
      costType === "other" && cost.type ? `${cost.type}: ${cost.description ?? ""}`.trim() : cost.description;

    costRows.push({
      id: cost.id,
      organization_id: NEW_ORG_ID,
      purchase_order_id: cost.purchase_order_id,
      cost_type: costType,
      description,
      amount,
      currency: "AUD",
      allocation_method: "by_value",
      is_included_in_total: true,
      supplier_invoice_number: null,
      reference_number: null,
      notes: null,
      version: 1,
      created_at: cost.created_at,
      updated_at: cost.updated_at,
      created_by: null,
      updated_by: null,
    });
  }

  const allocationsByShipment = new Map<string, OldShipmentAllocation[]>();
  const allocationsByShipmentItem = new Map<string, OldShipmentAllocation[]>();
  for (const allocation of shipmentAllocations) {
    const shipmentAllocationsList = allocationsByShipment.get(allocation.shipment_item_id) ?? [];
    shipmentAllocationsList.push(allocation);
    allocationsByShipment.set(allocation.shipment_item_id, shipmentAllocationsList);

    const list = allocationsByShipmentItem.get(allocation.shipment_item_id) ?? [];
    list.push(allocation);
    allocationsByShipmentItem.set(allocation.shipment_item_id, list);
  }

  const shipmentItemById = new Map(shipmentItems.map((item) => [item.id, item]));
  const shipmentById = new Map(shipments.map((shipment) => [shipment.id, shipment]));

  const allocatedCostsByPo = new Map<
    string,
    { freight: number; customs: number; insurance: number }
  >();

  const addAllocatedCost = (poId: string, costType: "freight" | "customs" | "insurance", amount: number) => {
    if (!purchaseOrderIds.has(poId)) return;
    if (amount <= 0) return;
    const entry = allocatedCostsByPo.get(poId) ?? { freight: 0, customs: 0, insurance: 0 };
    entry[costType] += amount;
    allocatedCostsByPo.set(poId, entry);
  };

  for (const allocation of shipmentAllocations) {
    if (!purchaseOrderIds.has(allocation.purchase_order_id)) continue;
    addAllocatedCost(allocation.purchase_order_id, "freight", Number(allocation.allocated_freight_cost ?? 0));
    addAllocatedCost(allocation.purchase_order_id, "customs", Number(allocation.allocated_customs_cost ?? 0));
    addAllocatedCost(allocation.purchase_order_id, "insurance", Number(allocation.allocated_insurance_cost ?? 0));
  }

  const allocationsByShipmentId = new Map<string, OldShipmentAllocation[]>();
  for (const allocation of shipmentAllocations) {
    const shipmentItem = shipmentItemById.get(allocation.shipment_item_id);
    if (!shipmentItem) continue;
    const list = allocationsByShipmentId.get(shipmentItem.shipment_id) ?? [];
    list.push(allocation);
    allocationsByShipmentId.set(shipmentItem.shipment_id, list);
  }

  for (const [shipmentId, allocations] of allocationsByShipmentId.entries()) {
    const shipment = shipmentById.get(shipmentId);
    if (!shipment) continue;
    const shipmentFreight = Number(shipment.freight_cost_local ?? 0);
    const shipmentCustoms = Number(shipment.customs_cost_local ?? 0);
    const shipmentInsurance = Number(shipment.insurance_cost_local ?? 0);
    if (shipmentFreight + shipmentCustoms + shipmentInsurance === 0) continue;

    const allocationValues = allocations.map((allocation) => {
      const shipmentItem = shipmentItemById.get(allocation.shipment_item_id);
      const quantity = Number(allocation.quantity_allocated ?? 0);
      const unitValue = Number(shipmentItem?.unit_fob_cost_aud ?? 0);
      return quantity * unitValue;
    });

    const totalValue = sumAmount(allocationValues);
    const totalQuantity = sumAmount(allocations.map((allocation) => allocation.quantity_allocated ?? 0));

    allocations.forEach((allocation, index) => {
      const value = allocationValues[index] ?? 0;
      const valueWeight = totalValue > 0 ? value / totalValue : 0;
      const quantityWeight =
        totalValue === 0 && totalQuantity > 0
          ? Number(allocation.quantity_allocated ?? 0) / totalQuantity
          : 0;
      const weight = totalValue > 0 ? valueWeight : quantityWeight;

      addAllocatedCost(allocation.purchase_order_id, "freight", shipmentFreight * weight);
      addAllocatedCost(allocation.purchase_order_id, "customs", shipmentCustoms * weight);
      addAllocatedCost(allocation.purchase_order_id, "insurance", shipmentInsurance * weight);
    });
  }

  for (const [poId, totals] of allocatedCostsByPo.entries()) {
    if (totals.freight > 0) {
      costRows.push({
        id: randomUUID(),
        organization_id: NEW_ORG_ID,
        purchase_order_id: poId,
        cost_type: "freight",
        description: "Allocated freight cost (shipments)",
        amount: totals.freight,
        currency: "AUD",
        allocation_method: "by_value",
        is_included_in_total: true,
        supplier_invoice_number: null,
        reference_number: null,
        notes: null,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
        updated_by: null,
      });
    }
    if (totals.customs > 0) {
      costRows.push({
        id: randomUUID(),
        organization_id: NEW_ORG_ID,
        purchase_order_id: poId,
        cost_type: "customs",
        description: "Allocated customs cost (shipments)",
        amount: totals.customs,
        currency: "AUD",
        allocation_method: "by_value",
        is_included_in_total: true,
        supplier_invoice_number: null,
        reference_number: null,
        notes: null,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
        updated_by: null,
      });
    }
    if (totals.insurance > 0) {
      costRows.push({
        id: randomUUID(),
        organization_id: NEW_ORG_ID,
        purchase_order_id: poId,
        cost_type: "insurance",
        description: "Allocated insurance cost (shipments)",
        amount: totals.insurance,
        currency: "AUD",
        allocation_method: "by_value",
        is_included_in_total: true,
        supplier_invoice_number: null,
        reference_number: null,
        notes: null,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
        updated_by: null,
      });
    }
  }

  const receipts: NewReceiptRow[] = [];
  const receiptItems: NewReceiptItemRow[] = [];

  const allocationsByShipmentAndPo = new Map<string, OldShipmentAllocation[]>();
  for (const allocation of shipmentAllocations) {
    if (!purchaseOrderIds.has(allocation.purchase_order_id)) continue;
    const shipmentItem = shipmentItemById.get(allocation.shipment_item_id);
    if (!shipmentItem) continue;
    const shipmentId = shipmentItem.shipment_id;
    const key = `${shipmentId}:${allocation.purchase_order_id}`;
    const list = allocationsByShipmentAndPo.get(key) ?? [];
    list.push(allocation);
    allocationsByShipmentAndPo.set(key, list);
  }

  for (const [key, allocations] of allocationsByShipmentAndPo.entries()) {
    const [shipmentId, purchaseOrderId] = key.split(":");
    const shipment = shipmentById.get(shipmentId);
    if (!shipment) continue;

    const receiptId = randomUUID();
    const receivedBy = existingUserIds.has(shipment.received_by_user_id)
      ? shipment.received_by_user_id
      : fallbackUserId;

    const totalReceived = allocations.reduce(
      (sum, allocation) => sum + Number(allocation.quantity_allocated ?? 0),
      0
    );

    const poNumber = purchaseOrderNumberById.get(purchaseOrderId);
    const receiptNumber = poNumber
      ? `${shipment.shipment_reference}-${poNumber}`
      : `${shipment.shipment_reference}-${purchaseOrderId.slice(0, 8)}`;

    receipts.push({
      id: receiptId,
      organization_id: NEW_ORG_ID,
      purchase_order_id: purchaseOrderId,
      receipt_number: receiptNumber,
      received_by: receivedBy,
      received_at: shipment.arrival_date ?? shipment.created_at,
      carrier: shipment.freight_provider,
      tracking_number: shipment.tracking_number,
      delivery_reference: shipment.shipment_reference,
      total_items_expected: totalReceived,
      total_items_received: totalReceived,
      total_items_accepted: totalReceived,
      total_items_rejected: 0,
      status: mapReceiptStatus(shipment.status),
      inspection_required: "no",
      inspection_completed_at: null,
      inspection_completed_by: null,
      quality_notes: null,
      notes: shipment.notes,
      version: 1,
      created_at: shipment.created_at,
      updated_at: shipment.updated_at,
      created_by: null,
      updated_by: null,
    });

    allocations.forEach((allocation, index) => {
      const shipmentItem = shipmentItemById.get(allocation.shipment_item_id);
      const allocationCount =
        allocationsByShipmentItem.get(allocation.shipment_item_id)?.length ?? 1;
      const serialNumbers =
        allocationCount === 1 ? shipmentItem?.serial_numbers ?? null : null;
      const qualityNotes =
        allocationCount > 1 && shipmentItem?.serial_numbers?.length
          ? `Serials: ${shipmentItem.serial_numbers.join(", ")}`
          : null;

      receiptItems.push({
        id: randomUUID(),
        organization_id: NEW_ORG_ID,
        receipt_id: receiptId,
        purchase_order_item_id: allocation.purchase_order_line_item_id,
        line_number: index + 1,
        quantity_expected: Number(allocation.quantity_allocated ?? 0),
        quantity_received: Number(allocation.quantity_allocated ?? 0),
        quantity_accepted: Number(allocation.quantity_allocated ?? 0),
        quantity_rejected: 0,
        condition: "new",
        rejection_reason: null,
        quality_notes: qualityNotes,
        warehouse_location: shipment.warehouse_location,
        bin_number: null,
        lot_number: shipmentItem?.batch_number ?? null,
        serial_numbers: serialNumbers,
        expiry_date: shipmentItem?.expiry_date ?? null,
        created_at: shipmentItem?.created_at ?? shipment.created_at,
        updated_at: shipmentItem?.updated_at ?? shipment.updated_at,
      });
    });
  }

  const shipmentIds = new Set(shipments.map((shipment) => shipment.id));
  const goodsReceiptItemsByReceipt = new Map<string, OldGoodsReceiptLineItem[]>();
  for (const item of goodsReceiptItems) {
    const list = goodsReceiptItemsByReceipt.get(item.goods_receipt_id) ?? [];
    list.push(item);
    goodsReceiptItemsByReceipt.set(item.goods_receipt_id, list);
  }

  for (const receipt of goodsReceipts) {
    if (!purchaseOrderIds.has(receipt.purchase_order_id)) continue;
    if (receipt.shipment_id && shipmentIds.has(receipt.shipment_id)) {
      continue;
    }

    const receiptId = randomUUID();
    const receivedBy = existingUserIds.has(receipt.received_by_user_id)
      ? receipt.received_by_user_id
      : fallbackUserId;

    const items = goodsReceiptItemsByReceipt.get(receipt.id) ?? [];
    const totalReceived = items.reduce(
      (sum, item) => sum + Number(item.quantity_received ?? 0),
      0
    );

    receipts.push({
      id: receiptId,
      organization_id: NEW_ORG_ID,
      purchase_order_id: receipt.purchase_order_id,
      receipt_number: receipt.receipt_number,
      received_by: receivedBy,
      received_at: receipt.receipt_date,
      carrier: receipt.freight_provider,
      tracking_number: receipt.tracking_number,
      delivery_reference: receipt.shipment_reference,
      total_items_expected: totalReceived,
      total_items_received: totalReceived,
      total_items_accepted: totalReceived,
      total_items_rejected: 0,
      status: mapReceiptStatus(receipt.status),
      inspection_required: "no",
      inspection_completed_at: null,
      inspection_completed_by: null,
      quality_notes: null,
      notes: receipt.notes,
      version: 1,
      created_at: receipt.created_at,
      updated_at: receipt.updated_at,
      created_by: null,
      updated_by: null,
    });

    const receiptFreight = Number(receipt.freight_cost_local ?? 0);
    if (receiptFreight > 0) {
      costRows.push({
        id: randomUUID(),
        organization_id: NEW_ORG_ID,
        purchase_order_id: receipt.purchase_order_id,
        cost_type: "freight",
        description: "Receipt freight cost (goods_receipts)",
        amount: receiptFreight,
        currency: "AUD",
        allocation_method: "by_value",
        is_included_in_total: true,
        supplier_invoice_number: null,
        reference_number: null,
        notes: null,
        version: 1,
        created_at: receipt.created_at,
        updated_at: receipt.updated_at,
        created_by: null,
        updated_by: null,
      });
    }

    items.forEach((item, index) => {
      receiptItems.push({
        id: randomUUID(),
        organization_id: NEW_ORG_ID,
        receipt_id: receiptId,
        purchase_order_item_id: item.purchase_order_line_item_id,
        line_number: index + 1,
        quantity_expected: Number(item.quantity_ordered_snapshot ?? 0),
        quantity_received: Number(item.quantity_received ?? 0),
        quantity_accepted: Number(item.quantity_received ?? 0),
        quantity_rejected: 0,
        condition: "new",
        rejection_reason: null,
        quality_notes: item.notes,
        warehouse_location: null,
        bin_number: null,
        lot_number: null,
        serial_numbers: item.serials_received ?? null,
        expiry_date: null,
        created_at: item.created_at,
        updated_at: item.updated_at,
      });
    });
  }

  if (!DRY_RUN) {
    if (supplierRows.length > 0) {
      for (const batch of chunk(supplierRows, 500)) {
        await newDb`insert into public.suppliers ${newDb(batch as unknown as Record<string, unknown>[])}`;
      }
    }

    if (purchaseOrderRows.length > 0) {
      for (const batch of chunk(purchaseOrderRows, 500)) {
        await newDb`insert into public.purchase_orders ${newDb(batch as unknown as Record<string, unknown>[])}`;
      }
    }

    if (purchaseOrderItemRows.length > 0) {
      for (const batch of chunk(purchaseOrderItemRows, 500)) {
        await newDb`insert into public.purchase_order_items ${newDb(batch as unknown as Record<string, unknown>[])}`;
      }
    }

    if (costRows.length > 0) {
      for (const batch of chunk(costRows, 500)) {
        await newDb`insert into public.purchase_order_costs ${newDb(batch as unknown as Record<string, unknown>[])}`;
      }
    }

    if (receipts.length > 0) {
      for (const batch of chunk(receipts, 500)) {
        await newDb`insert into public.purchase_order_receipts ${newDb(batch as unknown as Record<string, unknown>[])}`;
      }
    }

    if (receiptItems.length > 0) {
      for (const batch of chunk(receiptItems, 500)) {
        await newDb`insert into public.purchase_order_receipt_items ${newDb(batch as unknown as Record<string, unknown>[])}`;
      }
    }
  } else {
    console.log("DRY_RUN=1: no data written.");
  }

  if (process.env.PRINT_COSTS === "1" && costRows.length > 0) {
    const summary = new Map<string, Record<string, number>>();
    for (const row of costRows) {
      const byType = summary.get(row.purchase_order_id) ?? {};
      byType[row.cost_type] = (byType[row.cost_type] ?? 0) + Number(row.amount ?? 0);
      summary.set(row.purchase_order_id, byType);
    }
    console.log("PO Cost Breakdown (by purchase_order_id):");
    for (const [poId, totals] of summary.entries()) {
      const parts = Object.entries(totals)
        .map(([type, amount]) => `${type}: ${amount.toFixed(2)}`)
        .join(", ");
      console.log(`${poId} -> ${parts}`);
    }
  }

  console.log("Summary:");
  console.log(`Suppliers: ${supplierRows.length}`);
  console.log(`Purchase Orders: ${purchaseOrderRows.length}`);
  console.log(`PO Items: ${purchaseOrderItemRows.length}`);
  console.log(`PO Costs: ${costRows.length}`);
  console.log(`Receipts: ${receipts.length}`);
  console.log(`Receipt Items: ${receiptItems.length}`);
  if (skippedPurchaseOrders.length > 0) {
    console.log(`Skipped POs (missing supplier): ${skippedPurchaseOrders.length}`);
  }
}

main()
  .catch((error) => {
    console.error("Purchase migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await oldDb.end({ timeout: 5 });
    await newDb.end({ timeout: 5 });
  });

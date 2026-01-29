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

type OldOrder = {
  id: string;
  organization_id: string;
  customer_id: string;
  quote_id: string | null;
  order_number: string;
  order_date: string;
  status: string;
  subtotal_amount: number;
  discount_type: string | null;
  discount_value: number | null;
  discount_amount: number | null;
  tax_rate_percent: number | null;
  tax_amount: number;
  total_amount: number;
  shipping_cost: number | null;
  currency: string;
  shipping_address_snapshot: Record<string, unknown> | null;
  shipping_method: string | null;
  tracking_number: string | null;
  estimated_delivery_date: string | null;
  actual_shipped_date: string | null;
  actual_delivery_date: string | null;
  billing_address_snapshot: Record<string, unknown> | null;
  primary_contact_snapshot: Record<string, unknown> | null;
  payment_note: string | null;
  payment_status: string | null;
  internal_notes: string | null;
  notes_to_customer: string | null;
  terms_and_conditions: string | null;
  xero_invoice_id: string | null;
  xero_last_sync_at: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string | null;
  notes: string | null;
  delivery_instructions: string | null;
  assigned_installer_id: string | null;
  installation_date: string | null;
};

type OldOrderLineItem = {
  id: string;
  order_id: string;
  organization_id: string;
  product_id: string | null;
  product_sku_snapshot: string;
  product_name_snapshot: string;
  product_description_snapshot: string | null;
  product_type_snapshot: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  assigned_serial_numbers: string[] | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string | null;
  version: number;
};

type NewOrderRow = {
  id: string;
  organization_id: string;
  order_number: string;
  customer_id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  order_date: string;
  due_date: string | null;
  shipped_date: string | null;
  delivered_date: string | null;
  billing_address: Record<string, unknown> | null;
  shipping_address: Record<string, unknown> | null;
  subtotal: number;
  discount_amount: number;
  discount_percent: number | null;
  tax_amount: number;
  shipping_amount: number;
  total: number;
  paid_amount: number;
  balance_due: number;
  metadata: Record<string, unknown>;
  internal_notes: string | null;
  customer_notes: string | null;
  quote_pdf_url: string | null;
  invoice_pdf_url: string | null;
  xero_invoice_id: string | null;
  xero_sync_status: string | null;
  xero_sync_error: string | null;
  last_xero_sync_at: string | null;
  xero_invoice_url: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
};

type NewOrderLineItemRow = {
  id: string;
  organization_id: string;
  order_id: string;
  product_id: string | null;
  line_number: string;
  sku: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number | null;
  discount_amount: number;
  tax_type: "gst";
  tax_amount: number;
  line_total: number;
  pick_status: PickStatus;
  picked_at: string | null;
  picked_by: string | null;
  qty_picked: number;
  qty_shipped: number;
  qty_delivered: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type OrderStatus = "draft" | "confirmed" | "picking" | "picked" | "shipped" | "delivered" | "cancelled";
type PaymentStatus = "pending" | "partial" | "paid" | "refunded" | "overdue";
type PickStatus = "not_picked" | "picking" | "picked";

const ORDER_STATUS_MAP: Record<string, OrderStatus> = {
  PENDING_FULFILLMENT: "confirmed",
  AWAITING_PAYMENT: "draft",
  AWAITING_SHIPMENT: "picked",
  AWAITING_PICKING: "picking",
  SHIPPED: "shipped",
  COMPLETED: "delivered",
  CANCELLED: "cancelled",
};

const PAYMENT_STATUS_MAP: Record<string, PaymentStatus> = {
  UNPAID: "pending",
  PAID: "paid",
  PARTIALLY_PAID: "partial",
  REFUNDED: "refunded",
  PARTIALLY_REFUNDED: "refunded",
};

function mapOrderStatus(status: string | null): OrderStatus {
  if (!status) return "confirmed";
  return ORDER_STATUS_MAP[status] ?? "confirmed";
}

function mapPaymentStatus(status: string | null): PaymentStatus {
  if (!status) return "pending";
  return PAYMENT_STATUS_MAP[status] ?? "pending";
}

function buildLineNotes(description: string | null, serials: string[] | null): string | null {
  const parts = [];
  if (description) parts.push(description);
  if (serials && serials.length > 0) {
    parts.push(`Serials: ${serials.join(", ")}`);
  }
  return parts.length > 0 ? parts.join("\n") : null;
}

function toSortableTimestamp(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

async function main() {
  if (RESET_TARGET && !DRY_RUN) {
    console.log("RESET_TARGET=1: clearing target tables for org...");
    await newDb`delete from public.order_line_items where organization_id = ${NEW_ORG_ID}`;
    await newDb`delete from public.orders where organization_id = ${NEW_ORG_ID}`;
  }

  const orders = (await oldDb<OldOrder[]>`
    select *
    from public.orders
    where organization_id = ${OLD_ORG_ID}
  `) as OldOrder[];

  const orderLineItems = (await oldDb<OldOrderLineItem[]>`
    select *
    from public.order_line_items
    where organization_id = ${OLD_ORG_ID}
  `) as OldOrderLineItem[];

  const existingCustomers = (await newDb<{ id: string }[]>`
    select id
    from public.customers
    where organization_id = ${NEW_ORG_ID}
  `) as { id: string }[];
  const existingCustomerIds = new Set(existingCustomers.map((row) => row.id));

  const existingUsers = (await newDb<{ id: string }[]>`
    select id
    from public.users
    where organization_id = ${NEW_ORG_ID}
  `) as { id: string }[];
  const existingUserIds = new Set(existingUsers.map((row) => row.id));

  const existingProducts = (await newDb<{ id: string }[]>`
    select id
    from public.products
    where organization_id = ${NEW_ORG_ID}
  `) as { id: string }[];
  const existingProductIds = new Set(existingProducts.map((row) => row.id));

  const ordersById = new Map<string, OldOrder>();
  for (const order of orders) {
    ordersById.set(order.id, order);
  }

  const lineItemsByOrder = new Map<string, OldOrderLineItem[]>();
  for (const line of orderLineItems) {
    const list = lineItemsByOrder.get(line.order_id) ?? [];
    list.push(line);
    lineItemsByOrder.set(line.order_id, list);
  }

  const orderRows: NewOrderRow[] = [];
  const orderStatusById = new Map<string, OrderStatus>();
  const skippedOrders: string[] = [];

  for (const order of orders) {
    if (!existingCustomerIds.has(order.customer_id)) {
      skippedOrders.push(order.id);
      continue;
    }

    const mappedStatus = mapOrderStatus(order.status);
    const mappedPaymentStatus = mapPaymentStatus(order.payment_status);

    const subtotal = Number(order.subtotal_amount ?? 0);
    const discountAmount = Number(order.discount_amount ?? 0);
    const taxAmount = Number(order.tax_amount ?? 0);
    const shippingAmount = Number(order.shipping_cost ?? 0);
    const total = Number(order.total_amount ?? 0);
    const paidAmount = mappedPaymentStatus === "paid" ? total : 0;
    const balanceDue = Math.max(0, total - paidAmount);

    orderRows.push({
      id: order.id,
      organization_id: NEW_ORG_ID,
      order_number: order.order_number,
      customer_id: order.customer_id,
      status: mappedStatus,
      payment_status: mappedPaymentStatus,
      order_date: order.order_date,
      due_date: null,
      shipped_date: order.actual_shipped_date,
      delivered_date: order.actual_delivery_date,
      billing_address: order.billing_address_snapshot,
      shipping_address: order.shipping_address_snapshot,
      subtotal,
      discount_amount: discountAmount,
      discount_percent: null,
      tax_amount: taxAmount,
      shipping_amount: shippingAmount,
      total,
      paid_amount: paidAmount,
      balance_due: balanceDue,
      metadata: {
        legacy: {
          status: order.status,
          payment_status: order.payment_status,
          currency: order.currency,
          discount_type: order.discount_type,
          discount_value: order.discount_value,
          tax_rate_percent: order.tax_rate_percent,
          shipping_method: order.shipping_method,
          tracking_number: order.tracking_number,
          estimated_delivery_date: order.estimated_delivery_date,
          actual_shipped_date: order.actual_shipped_date,
          actual_delivery_date: order.actual_delivery_date,
          primary_contact_snapshot: order.primary_contact_snapshot,
          payment_note: order.payment_note,
          notes_to_customer: order.notes_to_customer,
          terms_and_conditions: order.terms_and_conditions,
          notes: order.notes,
          delivery_instructions: order.delivery_instructions,
          assigned_installer_id: order.assigned_installer_id,
          installation_date: order.installation_date,
          quote_id: order.quote_id,
          xero_last_sync_at: order.xero_last_sync_at,
        },
      },
      internal_notes: order.internal_notes,
      customer_notes: order.notes_to_customer,
      quote_pdf_url: null,
      invoice_pdf_url: null,
      xero_invoice_id: order.xero_invoice_id,
      xero_sync_status: null,
      xero_sync_error: null,
      last_xero_sync_at: order.xero_last_sync_at,
      xero_invoice_url: null,
      version: 1,
      created_at: order.created_at,
      updated_at: order.updated_at,
      created_by: existingUserIds.has(order.created_by_user_id) ? order.created_by_user_id : null,
      updated_by:
        order.updated_by_user_id && existingUserIds.has(order.updated_by_user_id)
          ? order.updated_by_user_id
          : null,
      deleted_at: null,
    });

    orderStatusById.set(order.id, mappedStatus);
  }

  const orderLineItemRows: NewOrderLineItemRow[] = [];

  for (const [orderId, lines] of lineItemsByOrder.entries()) {
    if (!orderStatusById.has(orderId)) continue;
    const orderStatus = orderStatusById.get(orderId)!;
    const sorted = [...lines].sort((a, b) => {
      const aTime = toSortableTimestamp(a.created_at);
      const bTime = toSortableTimestamp(b.created_at);
      if (aTime === bTime) return a.id.localeCompare(b.id);
      return aTime - bTime;
    });

    sorted.forEach((line, index) => {
      const quantity = Number(line.quantity ?? 0);
      const pickStatus: PickStatus =
        orderStatus === "picked" || orderStatus === "shipped" || orderStatus === "delivered"
          ? "picked"
          : orderStatus === "picking"
            ? "picking"
            : "not_picked";
      const qtyPicked =
        orderStatus === "picked" || orderStatus === "shipped" || orderStatus === "delivered"
          ? quantity
          : 0;
      const qtyShipped = orderStatus === "shipped" || orderStatus === "delivered" ? quantity : 0;
      const qtyDelivered = orderStatus === "delivered" ? quantity : 0;

      const sku = line.product_sku_snapshot?.trim() || null;
      const description =
        line.product_name_snapshot?.trim() ||
        sku ||
        "Line item";

      orderLineItemRows.push({
        id: line.id,
        organization_id: NEW_ORG_ID,
        order_id: orderId,
        product_id: line.product_id && existingProductIds.has(line.product_id) ? line.product_id : null,
        line_number: String(index + 1),
        sku,
        description,
        quantity,
        unit_price: Number(line.unit_price ?? 0),
        discount_percent: null,
        discount_amount: 0,
        tax_type: "gst",
        tax_amount: 0,
        line_total: Number(line.line_total ?? 0),
        pick_status: pickStatus,
        picked_at: null,
        picked_by: null,
        qty_picked: qtyPicked,
        qty_shipped: qtyShipped,
        qty_delivered: qtyDelivered,
        notes: buildLineNotes(line.product_description_snapshot, line.assigned_serial_numbers),
        created_at: line.created_at,
        updated_at: line.updated_at,
      });
    });
  }

  if (!DRY_RUN) {
    if (orderRows.length > 0) {
      const orderColumns = [
        "id",
        "organization_id",
        "order_number",
        "customer_id",
        "status",
        "payment_status",
        "order_date",
        "due_date",
        "shipped_date",
        "delivered_date",
        "billing_address",
        "shipping_address",
        "subtotal",
        "discount_amount",
        "discount_percent",
        "tax_amount",
        "shipping_amount",
        "total",
        "paid_amount",
        "balance_due",
        "metadata",
        "internal_notes",
        "customer_notes",
        "quote_pdf_url",
        "invoice_pdf_url",
        "xero_invoice_id",
        "xero_sync_status",
        "xero_sync_error",
        "last_xero_sync_at",
        "xero_invoice_url",
        "version",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "deleted_at",
      ] as const;

      await newDb`
        insert into public.orders ${newDb(orderRows, orderColumns)}
        on conflict (id) do nothing
      `;
    }

    if (orderLineItemRows.length > 0) {
      const lineItemColumns = [
        "id",
        "organization_id",
        "order_id",
        "product_id",
        "line_number",
        "sku",
        "description",
        "quantity",
        "unit_price",
        "discount_percent",
        "discount_amount",
        "tax_type",
        "tax_amount",
        "line_total",
        "pick_status",
        "picked_at",
        "picked_by",
        "qty_picked",
        "qty_shipped",
        "qty_delivered",
        "notes",
        "created_at",
        "updated_at",
      ] as const;

      await newDb`
        insert into public.order_line_items ${newDb(orderLineItemRows, lineItemColumns)}
        on conflict (id) do nothing
      `;
    }

  } else {
    console.log(`DRY_RUN: would insert ${orderRows.length} orders`);
    console.log(`DRY_RUN: would insert ${orderLineItemRows.length} order line items`);
  }

  console.log("Migration summary:");
  console.log(`- Orders: ${orders.length}`);
  console.log(`- Orders inserted: ${orderRows.length}`);
  console.log(`- Order line items: ${orderLineItemRows.length}`);
  if (skippedOrders.length > 0) {
    console.log(`- Orders skipped (missing customer): ${skippedOrders.length}`);
  }

  await oldDb.end();
  await newDb.end();
}

main().catch(async (err) => {
  console.error("Order migration failed:", err);
  await oldDb.end();
  await newDb.end();
  process.exit(1);
});

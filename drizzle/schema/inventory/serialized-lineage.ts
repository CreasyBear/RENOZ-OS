/**
 * Canonical serialized lineage tables.
 *
 * These tables provide one-row-per-serial identity and append-only event history.
 * They are additive and can run in dual-write mode beside legacy JSON/text paths.
 */

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  index,
  uniqueIndex,
  boolean,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { standardRlsPolicies, timestampColumns, auditColumns } from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { products } from "../products/products";
import { inventory } from "./inventory";
import { orderLineItems } from "../orders/orders";
import { shipmentItems } from "../orders/order-shipments";
import { purchaseOrderReceiptItems } from "../suppliers/purchase-order-receipts";

export const serializedItemStatusEnum = pgEnum("serialized_item_status", [
  "available",
  "allocated",
  "shipped",
  "returned",
  "quarantined",
  "scrapped",
]);

export const serializedItemEventTypeEnum = pgEnum("serialized_item_event_type", [
  "received",
  "allocated",
  "deallocated",
  "shipped",
  "returned",
  "warranty_registered",
  "warranty_claimed",
  "rma_requested",
  "rma_received",
  "status_changed",
]);

export const serializedItems = pgTable(
  "serialized_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    serialNumberRaw: text("serial_number_raw").notNull(),
    serialNumberNormalized: text("serial_number_normalized").notNull(),
    status: serializedItemStatusEnum("status").notNull().default("available"),
    currentInventoryId: uuid("current_inventory_id").references(() => inventory.id, {
      onDelete: "set null",
    }),
    sourceReceiptItemId: uuid("source_receipt_item_id").references(
      () => purchaseOrderReceiptItems.id,
      { onDelete: "set null" }
    ),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    orgSerialUnique: uniqueIndex("idx_serialized_items_org_serial_unique").on(
      table.organizationId,
      table.serialNumberNormalized
    ),
    orgProductIdx: index("idx_serialized_items_org_product").on(
      table.organizationId,
      table.productId
    ),
    orgStatusIdx: index("idx_serialized_items_org_status").on(table.organizationId, table.status),
    ...standardRlsPolicies("serialized_items"),
  })
);

export const orderLineSerialAllocations = pgTable(
  "order_line_serial_allocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    serializedItemId: uuid("serialized_item_id")
      .notNull()
      .references(() => serializedItems.id, { onDelete: "cascade" }),
    orderLineItemId: uuid("order_line_item_id")
      .notNull()
      .references(() => orderLineItems.id, { onDelete: "cascade" }),
    isActive: boolean("is_active").notNull().default(true),
    allocatedAt: timestamp("allocated_at", { withTimezone: true }).notNull().defaultNow(),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    ...timestampColumns,
  },
  (table) => ({
    serializedActiveUnique: uniqueIndex("idx_order_line_serial_allocations_active_unique")
      .on(table.organizationId, table.serializedItemId)
      .where(sql`${table.isActive} = true`),
    orderLineIdx: index("idx_order_line_serial_allocations_order_line").on(table.orderLineItemId),
    orgActiveIdx: index("idx_order_line_serial_allocations_org_active").on(
      table.organizationId,
      table.isActive
    ),
    ...standardRlsPolicies("order_line_serial_allocations"),
  })
);

export const shipmentItemSerials = pgTable(
  "shipment_item_serials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    shipmentItemId: uuid("shipment_item_id")
      .notNull()
      .references(() => shipmentItems.id, { onDelete: "cascade" }),
    serializedItemId: uuid("serialized_item_id")
      .notNull()
      .references(() => serializedItems.id, { onDelete: "cascade" }),
    shippedAt: timestamp("shipped_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestampColumns,
  },
  (table) => ({
    shipmentItemSerialUnique: uniqueIndex("idx_shipment_item_serials_unique").on(
      table.shipmentItemId,
      table.serializedItemId
    ),
    orgSerializedIdx: index("idx_shipment_item_serials_org_serialized").on(
      table.organizationId,
      table.serializedItemId
    ),
    ...standardRlsPolicies("shipment_item_serials"),
  })
);

export const serializedItemEvents = pgTable(
  "serialized_item_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    serializedItemId: uuid("serialized_item_id")
      .notNull()
      .references(() => serializedItems.id, { onDelete: "cascade" }),
    eventType: serializedItemEventTypeEnum("event_type").notNull(),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    notes: text("notes"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    orgSerializedOccurredIdx: index("idx_serialized_item_events_org_serialized_occurred").on(
      table.organizationId,
      table.serializedItemId,
      table.occurredAt
    ),
    entityIdx: index("idx_serialized_item_events_entity").on(table.entityType, table.entityId),
    ...standardRlsPolicies("serialized_item_events"),
  })
);

export const serializedItemsRelations = relations(serializedItems, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [serializedItems.organizationId],
    references: [organizations.id],
  }),
  product: one(products, {
    fields: [serializedItems.productId],
    references: [products.id],
  }),
  inventory: one(inventory, {
    fields: [serializedItems.currentInventoryId],
    references: [inventory.id],
  }),
  events: many(serializedItemEvents),
  allocations: many(orderLineSerialAllocations),
  shipmentLinks: many(shipmentItemSerials),
}));

export const serializedItemEventsRelations = relations(serializedItemEvents, ({ one }) => ({
  serializedItem: one(serializedItems, {
    fields: [serializedItemEvents.serializedItemId],
    references: [serializedItems.id],
  }),
}));

export const orderLineSerialAllocationsRelations = relations(
  orderLineSerialAllocations,
  ({ one }) => ({
    serializedItem: one(serializedItems, {
      fields: [orderLineSerialAllocations.serializedItemId],
      references: [serializedItems.id],
    }),
    orderLineItem: one(orderLineItems, {
      fields: [orderLineSerialAllocations.orderLineItemId],
      references: [orderLineItems.id],
    }),
  })
);

export const shipmentItemSerialsRelations = relations(shipmentItemSerials, ({ one }) => ({
  serializedItem: one(serializedItems, {
    fields: [shipmentItemSerials.serializedItemId],
    references: [serializedItems.id],
  }),
  shipmentItem: one(shipmentItems, {
    fields: [shipmentItemSerials.shipmentItemId],
    references: [shipmentItems.id],
  }),
}));

export type SerializedItem = typeof serializedItems.$inferSelect;
export type NewSerializedItem = typeof serializedItems.$inferInsert;
export type SerializedItemEvent = typeof serializedItemEvents.$inferSelect;

/**
 * Order Shipments Schema
 *
 * Tracking shipments and partial deliveries for orders.
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-SHIPPING-SCHEMA)
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { shipmentStatusEnum } from "./enums";
import {
  timestampColumns,
  auditColumns,
  organizationColumnBase,
  quantityColumn,
} from "./patterns";
import { orders, orderLineItems } from "./orders";
import { users } from "./users";

// ============================================================================
// INTERFACES
// ============================================================================

export interface ShipmentAddress {
  name: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone?: string;
  email?: string;
  instructions?: string;
}

export interface ShipmentTracking {
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  events?: ShipmentTrackingEvent[];
}

export interface ShipmentTrackingEvent {
  timestamp: string;
  status: string;
  location?: string;
  description?: string;
}

export interface DeliveryConfirmation {
  signedBy?: string;
  signature?: string; // Base64 encoded signature image
  photoUrl?: string;
  confirmedAt: string;
  notes?: string;
}

// ============================================================================
// ORDER SHIPMENTS TABLE
// ============================================================================

export const orderShipments = pgTable(
  "order_shipments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...organizationColumnBase,

    // Order reference
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),

    // Shipment identification
    shipmentNumber: text("shipment_number").notNull(),

    // Status tracking
    status: shipmentStatusEnum("status").notNull().default("pending"),

    // Carrier information
    carrier: text("carrier"), // e.g., "Australia Post", "StarTrack", "TNT"
    carrierService: text("carrier_service"), // e.g., "Express", "Standard"
    trackingNumber: text("tracking_number"),
    trackingUrl: text("tracking_url"),

    // Addresses
    shippingAddress: jsonb("shipping_address").$type<ShipmentAddress>(),
    returnAddress: jsonb("return_address").$type<ShipmentAddress>(),

    // Shipping details
    weight: integer("weight"), // in grams
    length: integer("length"), // in mm
    width: integer("width"), // in mm
    height: integer("height"), // in mm
    packageCount: integer("package_count").default(1),

    // Dates
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    estimatedDeliveryAt: timestamp("estimated_delivery_at", {
      withTimezone: true,
    }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),

    // Delivery confirmation
    deliveryConfirmation:
      jsonb("delivery_confirmation").$type<DeliveryConfirmation>(),

    // Tracking events history
    trackingEvents: jsonb("tracking_events").$type<ShipmentTrackingEvent[]>(),

    // Users
    shippedBy: uuid("shipped_by").references(() => users.id, {
      onDelete: "set null",
    }),

    // Notes
    notes: text("notes"),
    carrierNotes: text("carrier_notes"), // Notes from carrier

    // Timestamps
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    // Performance indexes
    index("order_shipments_order_id_idx").on(table.orderId),
    index("order_shipments_status_idx").on(table.status),
    index("order_shipments_org_status_idx").on(
      table.organizationId,
      table.status
    ),
    index("order_shipments_tracking_number_idx").on(table.trackingNumber),
    index("order_shipments_shipped_at_idx").on(table.shippedAt),
  ]
);

// ============================================================================
// SHIPMENT ITEMS TABLE (for partial shipments)
// ============================================================================

export const shipmentItems = pgTable(
  "shipment_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...organizationColumnBase,

    // References
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => orderShipments.id, { onDelete: "cascade" }),
    orderLineItemId: uuid("order_line_item_id")
      .notNull()
      .references(() => orderLineItems.id, { onDelete: "cascade" }),

    // Quantity shipped in this shipment
    quantity: quantityColumn("quantity").notNull(),

    // Serial numbers for serialized products
    serialNumbers: jsonb("serial_numbers").$type<string[]>(),

    // Lot/batch information
    lotNumber: text("lot_number"),
    expiryDate: timestamp("expiry_date", { withTimezone: true }),

    // Notes
    notes: text("notes"),

    // Timestamps
    ...timestampColumns,
  },
  (table) => [
    index("shipment_items_shipment_id_idx").on(table.shipmentId),
    index("shipment_items_line_item_id_idx").on(table.orderLineItemId),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const orderShipmentsRelations = relations(
  orderShipments,
  ({ one, many }) => ({
    order: one(orders, {
      fields: [orderShipments.orderId],
      references: [orders.id],
    }),
    shippedByUser: one(users, {
      fields: [orderShipments.shippedBy],
      references: [users.id],
    }),
    items: many(shipmentItems),
  })
);

export const shipmentItemsRelations = relations(shipmentItems, ({ one }) => ({
  shipment: one(orderShipments, {
    fields: [shipmentItems.shipmentId],
    references: [orderShipments.id],
  }),
  orderLineItem: one(orderLineItems, {
    fields: [shipmentItems.orderLineItemId],
    references: [orderLineItems.id],
  }),
}));

// ============================================================================
// TYPES
// ============================================================================

export type OrderShipment = typeof orderShipments.$inferSelect;
export type NewOrderShipment = typeof orderShipments.$inferInsert;
export type ShipmentItem = typeof shipmentItems.$inferSelect;
export type NewShipmentItem = typeof shipmentItems.$inferInsert;
export type ShipmentStatus = (typeof shipmentStatusEnum.enumValues)[number];

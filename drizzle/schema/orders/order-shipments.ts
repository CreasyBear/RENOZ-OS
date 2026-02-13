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
import { shipmentStatusEnum } from "../_shared/enums";
import {
  timestampColumns,
  auditColumns,
  quantityColumn,
  standardRlsPolicies,
} from "../_shared/patterns";
import { orders, orderLineItems } from "./orders";
import { users } from "../users/users";
import { organizations } from "../settings/organizations";

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
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

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

    // Shipping cost (actual cost from carrier)
    shippingCost: integer("shipping_cost"), // in cents, null if not yet known

    // Notes
    notes: text("notes"),
    carrierNotes: text("carrier_notes"), // Notes from carrier

    // Timestamps
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    // Performance indexes
    orderIdIdx: index("order_shipments_order_id_idx").on(table.orderId),
    statusIdx: index("order_shipments_status_idx").on(table.status),
    orgStatusIdx: index("order_shipments_org_status_idx").on(
      table.organizationId,
      table.status
    ),
    orgCreatedIdx: index("order_shipments_org_created_idx").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),
    trackingNumberIdx: index("order_shipments_tracking_number_idx").on(table.trackingNumber),
    shippedAtIdx: index("order_shipments_shipped_at_idx").on(table.shippedAt.desc()),
    orgDeliveredIdx: index("order_shipments_org_delivered_idx").on(
      table.organizationId,
      table.deliveredAt.desc()
    ),
    // RLS Policies
    ...standardRlsPolicies("order_shipments"),
  })
);

// ============================================================================
// SHIPMENT ITEMS TABLE (for partial shipments)
// ============================================================================

export const shipmentItems = pgTable(
  "shipment_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

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
  (table) => ({
    shipmentIdIdx: index("shipment_items_shipment_id_idx").on(table.shipmentId),
    lineItemIdIdx: index("shipment_items_line_item_id_idx").on(table.orderLineItemId),
    orgCreatedIdx: index("shipment_items_org_created_idx").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),
    // RLS Policies
    ...standardRlsPolicies("shipment_items"),
  })
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

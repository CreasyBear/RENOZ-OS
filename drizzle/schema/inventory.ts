/**
 * Inventory Schema
 *
 * Inventory tracking, locations, and stock movements.
 * Table categories:
 * - inventory, locations: business (per column-patterns.json)
 * - inventory_movements: appendOnly (per column-patterns.json)
 *
 * @see _Initiation/_prd/1-foundation/patterns/canonical-enums.json for enum values
 */

import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  integer,
  decimal,
  date,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  inventoryStatusEnum,
  movementTypeEnum,
  stockCountStatusEnum,
  stockCountTypeEnum,
  inventoryAlertTypeEnum,
  forecastPeriodEnum,
  costLayerReferenceTypeEnum,
} from "./enums";
import {
  timestampColumns,
  auditColumns,
  organizationColumnBase,
  quantityColumn,
  currencyColumn,
} from "./patterns";
import { products } from "./products";
import { warehouseLocations } from "./warehouse-locations";

// ============================================================================
// INTERFACES
// ============================================================================

export interface LocationAddress {
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface MovementMetadata {
  reference?: string;
  orderId?: string;
  purchaseOrderId?: string;
  reason?: string;
  [key: string]: unknown;
}

// ============================================================================
// LOCATIONS TABLE (Warehouses/Stores)
// ============================================================================

export const locations = pgTable(
  "locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...organizationColumnBase,

    // Identification
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),

    // Address
    address: jsonb("address").$type<LocationAddress>().default({}),

    // Flags
    isActive: boolean("is_active").notNull().default(true),
    isDefault: boolean("is_default").notNull().default(false),
    allowNegative: boolean("allow_negative").notNull().default(false),

    // Tracking
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    // Unique code per organization
    codeOrgUnique: uniqueIndex("idx_locations_code_org_unique").on(
      table.organizationId,
      table.code
    ),

    // Multi-tenant queries
    orgActiveIdx: index("idx_locations_org_active").on(
      table.organizationId,
      table.isActive
    ),
  })
);

// ============================================================================
// INVENTORY TABLE (Stock Levels)
// ============================================================================

export const inventory = pgTable(
  "inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...organizationColumnBase,

    // Product and Location
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),

    // Status
    status: inventoryStatusEnum("status").notNull().default("available"),

    // Quantities
    quantityOnHand: quantityColumn("quantity_on_hand"),
    quantityAllocated: quantityColumn("quantity_allocated"),
    quantityAvailable: quantityColumn("quantity_available"), // onHand - allocated

    // Cost tracking (for FIFO/weighted average)
    unitCost: currencyColumn("unit_cost"),
    totalValue: currencyColumn("total_value"),

    // Lot/Serial tracking (optional)
    lotNumber: text("lot_number"),
    serialNumber: text("serial_number"),
    expiryDate: text("expiry_date"),

    // Tracking
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    // Unique product+location+lot per organization
    productLocationUnique: uniqueIndex("idx_inventory_product_location_unique")
      .on(table.organizationId, table.productId, table.locationId, table.lotNumber)
      .where(sql`${table.lotNumber} IS NOT NULL`),

    // Multi-tenant queries
    orgProductIdx: index("idx_inventory_org_product").on(
      table.organizationId,
      table.productId
    ),
    orgLocationIdx: index("idx_inventory_org_location").on(
      table.organizationId,
      table.locationId
    ),
    orgStatusIdx: index("idx_inventory_org_status").on(
      table.organizationId,
      table.status
    ),

    // Common queries
    productIdx: index("idx_inventory_product").on(table.productId),
    locationIdx: index("idx_inventory_location").on(table.locationId),
  })
);

// ============================================================================
// INVENTORY MOVEMENTS TABLE (Audit Trail)
// Table category: appendOnly - never updated or deleted
// ============================================================================

export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...organizationColumnBase,

    // References
    inventoryId: uuid("inventory_id")
      .notNull()
      .references(() => inventory.id, { onDelete: "restrict" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),

    // Movement details
    movementType: movementTypeEnum("movement_type").notNull(),
    quantity: quantityColumn("quantity"), // Can be negative for outbound
    previousQuantity: quantityColumn("previous_quantity"),
    newQuantity: quantityColumn("new_quantity"),

    // Cost tracking
    unitCost: currencyColumn("unit_cost"),
    totalCost: currencyColumn("total_cost"),

    // Reference to source document
    referenceType: text("reference_type"), // order, purchase_order, adjustment, transfer
    referenceId: uuid("reference_id"),

    // Metadata
    metadata: jsonb("metadata").$type<MovementMetadata>().default({}),
    notes: text("notes"),

    // Audit only (no updates on append-only table)
    createdAt: timestampColumns.createdAt,
    createdBy: auditColumns.createdBy,
  },
  (table) => ({
    // Multi-tenant queries
    orgProductIdx: index("idx_movements_org_product").on(
      table.organizationId,
      table.productId
    ),
    orgLocationIdx: index("idx_movements_org_location").on(
      table.organizationId,
      table.locationId
    ),
    orgTypeIdx: index("idx_movements_org_type").on(
      table.organizationId,
      table.movementType
    ),
    orgCreatedIdx: index("idx_movements_org_created").on(
      table.organizationId,
      table.createdAt,
    ),

    // Reference lookups
    referenceIdx: index("idx_movements_reference").on(
      table.referenceType,
      table.referenceId
    ),
  })
);

// ============================================================================
// STOCK COUNTS TABLE (Cycle Counting)
// ============================================================================

export interface StockCountMetadata {
  instructions?: string;
  varianceNotes?: string;
  [key: string]: unknown;
}

export const stockCounts = pgTable(
  "stock_counts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...organizationColumnBase,

    // Identification
    countCode: varchar("count_code", { length: 20 }).notNull(),
    status: stockCountStatusEnum("status").notNull().default("draft"),
    countType: stockCountTypeEnum("count_type").notNull().default("cycle"),

    // Location scope
    locationId: uuid("location_id").references(() => warehouseLocations.id),

    // Assignment
    assignedTo: uuid("assigned_to"),

    // Timing
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    // Approval
    approvedBy: uuid("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),

    // Configuration
    varianceThreshold: decimal("variance_threshold", { precision: 5, scale: 2 }).default("5.00"),
    notes: text("notes"),
    metadata: jsonb("metadata").$type<StockCountMetadata>().default({}),

    // Audit
    ...timestampColumns,
    ...auditColumns,
    version: integer("version").notNull().default(1),
  },
  (table) => ({
    // Unique code per organization
    codeOrgUnique: uniqueIndex("idx_stock_counts_code_org").on(
      table.organizationId,
      table.countCode
    ),
    // Common queries
    orgStatusIdx: index("idx_stock_counts_org_status").on(
      table.organizationId,
      table.status
    ),
    orgTypeIdx: index("idx_stock_counts_org_type").on(
      table.organizationId,
      table.countType
    ),
    assignedIdx: index("idx_stock_counts_assigned").on(table.assignedTo),
    locationIdx: index("idx_stock_counts_location").on(table.locationId),
  })
);

// ============================================================================
// STOCK COUNT ITEMS TABLE (Individual Items in Count)
// ============================================================================

export const stockCountItems = pgTable(
  "stock_count_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Parent count
    stockCountId: uuid("stock_count_id")
      .notNull()
      .references(() => stockCounts.id, { onDelete: "cascade" }),

    // Item reference
    inventoryId: uuid("inventory_id")
      .notNull()
      .references(() => inventory.id, { onDelete: "restrict" }),

    // Quantities
    expectedQuantity: integer("expected_quantity").notNull(),
    countedQuantity: integer("counted_quantity"),
    // Variance is countedQuantity - expectedQuantity (calculated)

    // Variance tracking
    varianceReason: varchar("variance_reason", { length: 255 }),

    // Count tracking
    countedBy: uuid("counted_by"),
    countedAt: timestamp("counted_at", { withTimezone: true }),

    // Review
    reviewedBy: uuid("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),

    notes: text("notes"),

    // Audit
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Unique inventory item per count
    countItemUnique: uniqueIndex("idx_stock_count_items_unique").on(
      table.stockCountId,
      table.inventoryId
    ),
    // Lookups
    countIdx: index("idx_stock_count_items_count").on(table.stockCountId),
    inventoryIdx: index("idx_stock_count_items_inventory").on(table.inventoryId),
    countedByIdx: index("idx_stock_count_items_counted_by").on(table.countedBy),
  })
);

// ============================================================================
// INVENTORY COST LAYERS TABLE (FIFO Costing)
// ============================================================================

export const inventoryCostLayers = pgTable(
  "inventory_cost_layers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...organizationColumnBase,

    // Item reference
    inventoryId: uuid("inventory_id")
      .notNull()
      .references(() => inventory.id, { onDelete: "cascade" }),

    // Layer details
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    quantityReceived: integer("quantity_received").notNull(),
    quantityRemaining: integer("quantity_remaining").notNull(),
    unitCost: decimal("unit_cost", { precision: 10, scale: 4 }).notNull(),
    // totalCost is quantityRemaining * unitCost (calculated)

    // Reference to source
    referenceType: costLayerReferenceTypeEnum("reference_type"),
    referenceId: uuid("reference_id"),

    // Expiry tracking
    expiryDate: date("expiry_date"),

    // Audit
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Multi-tenant queries
    orgInventoryIdx: index("idx_cost_layers_org_inventory").on(
      table.organizationId,
      table.inventoryId
    ),
    // FIFO ordering
    receivedIdx: index("idx_cost_layers_received").on(table.receivedAt),
    // Remaining quantity lookup
    remainingIdx: index("idx_cost_layers_remaining").on(table.quantityRemaining),
    inventoryIdx: index("idx_cost_layers_inventory").on(table.inventoryId),
  })
);

// ============================================================================
// INVENTORY FORECASTS TABLE (Demand Forecasting)
// ============================================================================

export const inventoryForecasts = pgTable(
  "inventory_forecasts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...organizationColumnBase,

    // Product reference
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),

    // Forecast details
    forecastDate: date("forecast_date").notNull(),
    forecastPeriod: forecastPeriodEnum("forecast_period").notNull(),
    demandQuantity: decimal("demand_quantity", { precision: 10, scale: 2 }).notNull(),

    // Accuracy tracking
    forecastAccuracy: decimal("forecast_accuracy", { precision: 5, scale: 2 }),
    confidenceLevel: decimal("confidence_level", { precision: 5, scale: 2 }),

    // Planning values
    safetyStockLevel: integer("safety_stock_level"),
    reorderPoint: integer("reorder_point"),
    recommendedOrderQuantity: integer("recommended_order_quantity"),

    // Calculation tracking
    calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Unique forecast per product/date/period
    forecastUnique: uniqueIndex("idx_forecasts_unique").on(
      table.organizationId,
      table.productId,
      table.forecastDate,
      table.forecastPeriod
    ),
    // Common queries
    orgProductIdx: index("idx_forecasts_org_product").on(
      table.organizationId,
      table.productId
    ),
    dateIdx: index("idx_forecasts_date").on(table.forecastDate),
    periodIdx: index("idx_forecasts_period").on(table.forecastPeriod),
  })
);

// ============================================================================
// INVENTORY ALERTS TABLE (Automated Alerts)
// ============================================================================

export interface AlertThreshold {
  minQuantity?: number;
  maxQuantity?: number;
  daysBeforeExpiry?: number;
  daysWithoutMovement?: number;
  deviationPercentage?: number;
  [key: string]: unknown;
}

export const inventoryAlerts = pgTable(
  "inventory_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...organizationColumnBase,

    // Alert configuration
    alertType: inventoryAlertTypeEnum("alert_type").notNull(),

    // Scope (optional - if null, applies to all)
    productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
    locationId: uuid("location_id").references(() => warehouseLocations.id, { onDelete: "cascade" }),

    // Threshold configuration
    threshold: jsonb("threshold").$type<AlertThreshold>().notNull(),

    // Status
    isActive: boolean("is_active").notNull().default(true),

    // Notification settings
    notificationChannels: text("notification_channels").array().default(sql`'{}'::text[]`),
    escalationUsers: uuid("escalation_users").array().default(sql`'{}'::uuid[]`),

    // Tracking
    lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true }),

    // Audit
    ...timestampColumns,
    ...auditColumns,
    version: integer("version").notNull().default(1),
  },
  (table) => ({
    // Common queries
    orgTypeIdx: index("idx_alerts_org_type").on(
      table.organizationId,
      table.alertType
    ),
    orgActiveIdx: index("idx_alerts_org_active").on(
      table.organizationId,
      table.isActive
    ),
    productIdx: index("idx_alerts_product").on(table.productId),
    locationIdx: index("idx_alerts_location").on(table.locationId),
    triggeredIdx: index("idx_alerts_triggered").on(table.lastTriggeredAt),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const locationsRelations = relations(locations, ({ many }) => ({
  inventory: many(inventory),
  movements: many(inventoryMovements),
}));

export const inventoryRelations = relations(inventory, ({ one, many }) => ({
  product: one(products, {
    fields: [inventory.productId],
    references: [products.id],
  }),
  location: one(locations, {
    fields: [inventory.locationId],
    references: [locations.id],
  }),
  movements: many(inventoryMovements),
  costLayers: many(inventoryCostLayers),
  countItems: many(stockCountItems),
}));

export const inventoryMovementsRelations = relations(
  inventoryMovements,
  ({ one }) => ({
    inventory: one(inventory, {
      fields: [inventoryMovements.inventoryId],
      references: [inventory.id],
    }),
    product: one(products, {
      fields: [inventoryMovements.productId],
      references: [products.id],
    }),
    location: one(locations, {
      fields: [inventoryMovements.locationId],
      references: [locations.id],
    }),
  })
);

// Stock Counts Relations
export const stockCountsRelations = relations(stockCounts, ({ one, many }) => ({
  location: one(warehouseLocations, {
    fields: [stockCounts.locationId],
    references: [warehouseLocations.id],
  }),
  items: many(stockCountItems),
}));

export const stockCountItemsRelations = relations(stockCountItems, ({ one }) => ({
  stockCount: one(stockCounts, {
    fields: [stockCountItems.stockCountId],
    references: [stockCounts.id],
  }),
  inventory: one(inventory, {
    fields: [stockCountItems.inventoryId],
    references: [inventory.id],
  }),
}));

// Cost Layers Relations
export const inventoryCostLayersRelations = relations(inventoryCostLayers, ({ one }) => ({
  inventory: one(inventory, {
    fields: [inventoryCostLayers.inventoryId],
    references: [inventory.id],
  }),
}));

// Forecasts Relations
export const inventoryForecastsRelations = relations(inventoryForecasts, ({ one }) => ({
  product: one(products, {
    fields: [inventoryForecasts.productId],
    references: [products.id],
  }),
}));

// Alerts Relations
export const inventoryAlertsRelations = relations(inventoryAlerts, ({ one }) => ({
  product: one(products, {
    fields: [inventoryAlerts.productId],
    references: [products.id],
  }),
  location: one(warehouseLocations, {
    fields: [inventoryAlerts.locationId],
    references: [warehouseLocations.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
export type Inventory = typeof inventory.$inferSelect;
export type NewInventory = typeof inventory.$inferInsert;
export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type NewInventoryMovement = typeof inventoryMovements.$inferInsert;

// Stock Counts
export type StockCount = typeof stockCounts.$inferSelect;
export type NewStockCount = typeof stockCounts.$inferInsert;
export type StockCountItem = typeof stockCountItems.$inferSelect;
export type NewStockCountItem = typeof stockCountItems.$inferInsert;

// Cost Layers
export type InventoryCostLayer = typeof inventoryCostLayers.$inferSelect;
export type NewInventoryCostLayer = typeof inventoryCostLayers.$inferInsert;

// Forecasts
export type InventoryForecast = typeof inventoryForecasts.$inferSelect;
export type NewInventoryForecast = typeof inventoryForecasts.$inferInsert;

// Alerts
export type InventoryAlert = typeof inventoryAlerts.$inferSelect;
export type NewInventoryAlert = typeof inventoryAlerts.$inferInsert;

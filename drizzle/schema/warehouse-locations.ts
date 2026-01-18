/**
 * Warehouse Locations Schema
 *
 * Hierarchical location structure for inventory management.
 * Shared between Products, Inventory, and Suppliers domains.
 *
 * Created as part of PRD-2 schema remediation to resolve
 * circular dependencies between domain migrations.
 *
 * @see supabase/migrations/0009_inventory_core_shared.sql
 */

import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { inventory, inventoryMovements } from "./inventory";

// ============================================================================
// TYPES
// ============================================================================

export type LocationType =
  | "warehouse"
  | "zone"
  | "aisle"
  | "rack"
  | "shelf"
  | "bin";

export interface LocationAttributes {
  temperature?: "ambient" | "refrigerated" | "frozen";
  hazmat?: boolean;
  maxWeight?: number;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
    unit: "cm" | "in";
  };
  [key: string]: unknown;
}

// ============================================================================
// WAREHOUSE LOCATIONS TABLE
// ============================================================================

export const warehouseLocations = pgTable(
  "warehouse_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),

    // Hierarchy
    locationCode: varchar("location_code", { length: 20 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    locationType: varchar("location_type", { length: 20 })
      .$type<LocationType>()
      .notNull(),
    parentId: uuid("parent_id"),

    // Attributes
    capacity: integer("capacity"),
    isActive: boolean("is_active").default(true),
    isPickable: boolean("is_pickable").default(true),
    isReceivable: boolean("is_receivable").default(true),
    attributes: jsonb("attributes").$type<LocationAttributes>().default({}),

    // Audit
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
    version: integer("version").notNull().default(1),
  },
  (table) => ({
    // Unique code per organization
    codeOrgUnique: uniqueIndex("idx_warehouse_locations_code_org").on(
      table.organizationId,
      table.locationCode
    ),
    // Hierarchy traversal
    parentIdx: index("idx_warehouse_locations_parent_fk").on(table.parentId),
    // Multi-tenant + type queries
    orgTypeIdx: index("idx_warehouse_locations_org_type_fk").on(
      table.organizationId,
      table.locationType
    ),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const warehouseLocationsRelations = relations(
  warehouseLocations,
  ({ one, many }) => ({
    // Self-referencing for hierarchy
    parent: one(warehouseLocations, {
      fields: [warehouseLocations.parentId],
      references: [warehouseLocations.id],
      relationName: "locationHierarchy",
    }),
    children: many(warehouseLocations, { relationName: "locationHierarchy" }),

    // Relations to inventory tables
    inventoryItems: many(inventory),
    movements: many(inventoryMovements),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type WarehouseLocation = typeof warehouseLocations.$inferSelect;
export type NewWarehouseLocation = typeof warehouseLocations.$inferInsert;

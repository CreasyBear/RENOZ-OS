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
  pgPolicy,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
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
  /** Optional metadata carried from legacy location models */
  description?: string;
  address?: Record<string, {}>;
  /** Flag used by product-inventory default location selection */
  isDefault?: boolean;
  /** Whether negative stock adjustments are allowed */
  allowNegative?: boolean;
  /** Security level for access control */
  securityLevel?: "standard" | "restricted" | "high_security";
  /** Whether location requires special equipment to access */
  requiresEquipment?: boolean;
  /** Type of equipment needed (forklift, ladder, etc.) */
  equipmentType?: string;
  /** Floor level (-1 for basement, 0 for ground, etc.) */
  floorLevel?: number;
  /** Whether location is currently accessible */
  accessible?: boolean;
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
    orgCreatedIdx: index("idx_warehouse_locations_org_created").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),

    // Standard CRUD RLS policies for org isolation
    selectPolicy: pgPolicy("warehouse_locations_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("warehouse_locations_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("warehouse_locations_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("warehouse_locations_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
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

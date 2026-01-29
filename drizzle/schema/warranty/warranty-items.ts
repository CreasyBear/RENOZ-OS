/**
 * Warranty Items Schema
 *
 * Line items for warranty certificates (one warranty can cover multiple products/components).
 * Supports serial-level reporting and product-level analytics.
 */

import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  date,
  index,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { timestampColumns, auditColumns } from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { warranties } from "./warranties";
import { products } from "../products/products";
import { inventory } from "../inventory/inventory";

// ============================================================================
// WARRANTY ITEMS TABLE
// ============================================================================

export const warrantyItems = pgTable(
  "warranty_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Parent warranty (certificate header)
    warrantyId: uuid("warranty_id")
      .notNull()
      .references(() => warranties.id, { onDelete: "cascade" }),

    // Product coverage
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    productSerial: varchar("product_serial", { length: 255 }),

    // Optional inventory reference (if available in target)
    inventoryId: uuid("inventory_id").references(() => inventory.id, {
      onDelete: "set null",
    }),

    // Coverage dates for this specific item
    warrantyStartDate: date("warranty_start_date").notNull(),
    warrantyEndDate: date("warranty_end_date").notNull(),
    warrantyPeriodMonths: integer("warranty_period_months").notNull(),

    // Notes for installation or item-specific details
    installationNotes: text("installation_notes"),

    // Standard columns
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    orgWarrantyIdx: index("idx_warranty_items_org_warranty").on(
      table.organizationId,
      table.warrantyId
    ),
    orgProductIdx: index("idx_warranty_items_org_product").on(
      table.organizationId,
      table.productId
    ),
    orgSerialIdx: index("idx_warranty_items_org_serial").on(
      table.organizationId,
      table.productSerial
    ),
    warrantyIdx: index("idx_warranty_items_warranty").on(table.warrantyId),

    // RLS policies
    selectPolicy: pgPolicy("warranty_items_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("warranty_items_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("warranty_items_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("warranty_items_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const warrantyItemsRelations = relations(warrantyItems, ({ one }) => ({
  organization: one(organizations, {
    fields: [warrantyItems.organizationId],
    references: [organizations.id],
  }),
  warranty: one(warranties, {
    fields: [warrantyItems.warrantyId],
    references: [warranties.id],
  }),
  product: one(products, {
    fields: [warrantyItems.productId],
    references: [products.id],
  }),
  inventory: one(inventory, {
    fields: [warrantyItems.inventoryId],
    references: [inventory.id],
  }),
}));

// ============================================================================
// TYPES
// ============================================================================

export type WarrantyItem = typeof warrantyItems.$inferSelect;
export type NewWarrantyItem = typeof warrantyItems.$inferInsert;

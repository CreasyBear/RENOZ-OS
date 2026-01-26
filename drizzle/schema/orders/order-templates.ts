/**
 * Order Templates Schema
 *
 * Reusable order templates for quick order creation.
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-TEMPLATES-SCHEMA)
 */

import {
  pgTable,
  pgPolicy,
  uuid,
  text,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { taxTypeEnum } from "../_shared/enums";
import {
  timestampColumns,
  auditColumns,
  softDeleteColumn,
  currencyColumn,
  quantityColumn,
  percentageColumn,
} from "../_shared/patterns";
import { products } from "../products/products";
import { customers } from "../customers/customers";
import { organizations } from "../settings/organizations";

// ============================================================================
// INTERFACES
// ============================================================================

export interface TemplateMetadata {
  category?: string;
  tags?: string[];
  usageCount?: number;
  lastUsedAt?: string;
  notes?: string;
}

export interface TemplateDefaultValues {
  discountPercent?: number;
  discountAmount?: number;
  shippingAmount?: number;
  paymentTermsDays?: number;
  internalNotes?: string;
  customerNotes?: string;
}

// ============================================================================
// ORDER TEMPLATES TABLE
// ============================================================================

export const orderTemplates = pgTable(
  "order_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Template identification
    name: text("name").notNull(),
    description: text("description"),

    // Template configuration
    isActive: boolean("is_active").notNull().default(true),
    isGlobal: boolean("is_global").notNull().default(false), // Available to all users in org

    // Default customer (optional)
    defaultCustomerId: uuid("default_customer_id").references(
      () => customers.id,
      { onDelete: "set null" }
    ),

    // Default values for orders created from this template
    defaultValues: jsonb("default_values").$type<TemplateDefaultValues>(),

    // Metadata
    metadata: jsonb("metadata").$type<TemplateMetadata>(),

    // Timestamps and audit
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumn,
  },
  (table) => [
    // Performance indexes
    index("order_templates_org_idx").on(table.organizationId),
    index("order_templates_org_active_idx").on(
      table.organizationId,
      table.isActive
    ),
    index("order_templates_org_created_idx").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),
    index("order_templates_name_idx").on(table.name),
    // RLS Policies
    pgPolicy("order_templates_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    pgPolicy("order_templates_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    pgPolicy("order_templates_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    pgPolicy("order_templates_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  ]
);

// ============================================================================
// ORDER TEMPLATE ITEMS TABLE
// ============================================================================

export const orderTemplateItems = pgTable(
  "order_template_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Template reference
    templateId: uuid("template_id")
      .notNull()
      .references(() => orderTemplates.id, { onDelete: "cascade" }),

    // Item position
    lineNumber: text("line_number").notNull(),
    sortOrder: text("sort_order").notNull().default("0"),

    // Product reference (optional - can have non-product items)
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null",
    }),

    // Item details (can override product details)
    sku: text("sku"),
    description: text("description").notNull(),

    // Quantity (default quantity for this item)
    defaultQuantity: quantityColumn("default_quantity").notNull().default(1),

    // Pricing (optional - will use current product price if not set)
    fixedUnitPrice: currencyColumn("fixed_unit_price"), // If set, uses this instead of product price
    useCurrentPrice: boolean("use_current_price").notNull().default(true),

    // Discounts
    discountPercent: percentageColumn("discount_percent"),
    discountAmount: currencyColumn("discount_amount"),

    // Tax
    taxType: taxTypeEnum("tax_type").default("gst"),

    // Notes
    notes: text("notes"),

    // Timestamps
    ...timestampColumns,
  },
  (table) => [
    index("order_template_items_template_idx").on(table.templateId),
    index("order_template_items_product_idx").on(table.productId),
    index("order_template_items_org_created_idx").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),
    // RLS Policies
    pgPolicy("order_template_items_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    pgPolicy("order_template_items_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    pgPolicy("order_template_items_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    pgPolicy("order_template_items_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const orderTemplatesRelations = relations(
  orderTemplates,
  ({ one, many }) => ({
    defaultCustomer: one(customers, {
      fields: [orderTemplates.defaultCustomerId],
      references: [customers.id],
    }),
    items: many(orderTemplateItems),
  })
);

export const orderTemplateItemsRelations = relations(
  orderTemplateItems,
  ({ one }) => ({
    template: one(orderTemplates, {
      fields: [orderTemplateItems.templateId],
      references: [orderTemplates.id],
    }),
    product: one(products, {
      fields: [orderTemplateItems.productId],
      references: [products.id],
    }),
  })
);

// ============================================================================
// TYPES
// ============================================================================

export type OrderTemplate = typeof orderTemplates.$inferSelect;
export type NewOrderTemplate = typeof orderTemplates.$inferInsert;
export type OrderTemplateItem = typeof orderTemplateItems.$inferSelect;
export type NewOrderTemplateItem = typeof orderTemplateItems.$inferInsert;

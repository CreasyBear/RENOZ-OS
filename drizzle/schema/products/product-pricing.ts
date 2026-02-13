/**
 * Product Pricing Schema
 *
 * Volume-based pricing tiers and customer-specific pricing overrides.
 * Implements price resolution: Customer-specific -> Volume tier -> Base price
 *
 * @see _Initiation/_prd/2-domains/products/products.prd.json for specification
 */

import {
  pgTable,
  uuid,
  integer,
  boolean,
  timestamp,
  text,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  currencyColumn,
  percentageColumn,
  auditColumns,
  standardRlsPolicies,
  nonNegativeCheck,
  positiveCheck,
  numericRangeCheck,
  rangeCheck,
  dateRangeCheck,
} from "../_shared/patterns";
import { products } from "./products";
import { customers } from "../customers/customers";
import { priceChangeTypeEnum } from "../_shared/enums";
import { organizations } from "../settings/organizations";

// ============================================================================
// PRODUCT PRICE TIERS TABLE
// ============================================================================

/**
 * Volume-based pricing tiers for products.
 * Applied when quantity >= minQuantity and <= maxQuantity.
 */
export const productPriceTiers = pgTable(
  "product_price_tiers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Product reference (cascade delete when product is deleted)
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),

    // Quantity range
    minQuantity: integer("min_quantity").notNull(),
    maxQuantity: integer("max_quantity"), // NULL = unlimited

    // Pricing
    price: currencyColumn("price"),
    discountPercent: percentageColumn("discount_percent"),

    // Status
    isActive: boolean("is_active").notNull().default(true),

    // Audit
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Multi-tenant + product queries
    orgProductIdx: index("idx_price_tiers_org_product").on(
      table.organizationId,
      table.productId
    ),

    // Price tier lookups by quantity
    productQtyIdx: index("idx_price_tiers_product_qty").on(
      table.productId,
      table.minQuantity
    ),

    // Active tiers only
    orgActiveIdx: index("idx_price_tiers_org_active").on(
      table.organizationId,
      table.isActive
    ),

    // Quantity constraints
    minQtyPositiveCheck: positiveCheck("price_tier_min_qty_positive", table.minQuantity),
    maxQtyValidCheck: numericRangeCheck("price_tier_max_qty_valid", table.minQuantity, table.maxQuantity, false),
    priceNonNegativeCheck: nonNegativeCheck("price_tier_price_non_negative", table.price),
    discountRangeCheck: rangeCheck("price_tier_discount_range", table.discountPercent, 0, 100),

    // Standard CRUD RLS policies for org isolation
    ...standardRlsPolicies("product_price_tiers"),
  })
);

// ============================================================================
// CUSTOMER PRODUCT PRICES TABLE
// ============================================================================

/**
 * Customer-specific pricing overrides.
 * Takes priority over volume tiers when active and within validity period.
 */
export const customerProductPrices = pgTable(
  "customer_product_prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // References (cascade delete when customer or product is deleted)
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),

    // Pricing
    price: currencyColumn("price"),
    discountPercent: percentageColumn("discount_percent"),

    // Validity period
    validFrom: timestamp("valid_from", { withTimezone: true })
      .notNull()
      .defaultNow(),
    validTo: timestamp("valid_to", { withTimezone: true }), // NULL = no expiration

    // Audit
    ...auditColumns,
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Unique customer-product combination per org (for active prices)
    customerProductOrgUnique: uniqueIndex("idx_customer_prices_unique").on(
      table.organizationId,
      table.customerId,
      table.productId
    ),

    // Customer price lookups
    orgCustomerIdx: index("idx_customer_prices_org_customer").on(
      table.organizationId,
      table.customerId
    ),

    // Product price lookups
    orgProductIdx: index("idx_customer_prices_org_product").on(
      table.organizationId,
      table.productId
    ),

    // Validity period lookups
    validFromIdx: index("idx_customer_prices_valid_from").on(table.validFrom),
    validToIdx: index("idx_customer_prices_valid_to").on(table.validTo),

    // Validity constraints
    validToAfterFromCheck: dateRangeCheck("customer_price_valid_to_after_from", table.validFrom, table.validTo),
    priceNonNegativeCheck: nonNegativeCheck("customer_price_non_negative", table.price),
    discountRangeCheck: rangeCheck("customer_price_discount_range", table.discountPercent, 0, 100),

    // Standard CRUD RLS policies for org isolation
    ...standardRlsPolicies("customer_product_prices"),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const productPriceTiersRelations = relations(
  productPriceTiers,
  ({ one }) => ({
    product: one(products, {
      fields: [productPriceTiers.productId],
      references: [products.id],
    }),
  })
);

export const customerProductPricesRelations = relations(
  customerProductPrices,
  ({ one }) => ({
    product: one(products, {
      fields: [customerProductPrices.productId],
      references: [products.id],
    }),
  })
);

// ============================================================================
// PRICE HISTORY TABLE
// ============================================================================

/**
 * Tracks all price changes for audit trail and analysis.
 * Records both base price changes and tier/customer price modifications.
 */
export const priceHistory = pgTable(
  "price_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Product reference (cascade delete when product is deleted)
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),

    // Change type
    changeType: priceChangeTypeEnum("change_type").notNull(),

    // Price values (before and after)
    previousPrice: currencyColumn("previous_price"),
    newPrice: currencyColumn("new_price"),
    previousDiscountPercent: percentageColumn("previous_discount_percent"),
    newDiscountPercent: percentageColumn("new_discount_percent"),

    // Context
    tierId: uuid("tier_id"), // If tier-related change
    customerId: uuid("customer_id"), // If customer-specific change

    // Audit
    reason: text("reason"), // Optional reason for change
    changedBy: uuid("changed_by").notNull(),
    changedAt: timestamp("changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Product history lookups
    orgProductIdx: index("idx_price_history_org_product").on(
      table.organizationId,
      table.productId
    ),

    // Timeline queries
    changedAtIdx: index("idx_price_history_changed_at").on(table.changedAt),

    // Type filtering
    changeTypeIdx: index("idx_price_history_change_type").on(table.changeType),

    // Customer history
    orgCustomerIdx: index("idx_price_history_org_customer").on(
      table.organizationId,
      table.customerId
    ),

    // Standard CRUD RLS policies for org isolation
    ...standardRlsPolicies("price_history"),
  })
);

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  product: one(products, {
    fields: [priceHistory.productId],
    references: [products.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ProductPriceTier = typeof productPriceTiers.$inferSelect;
export type NewProductPriceTier = typeof productPriceTiers.$inferInsert;
export type CustomerProductPrice = typeof customerProductPrices.$inferSelect;
export type NewCustomerProductPrice = typeof customerProductPrices.$inferInsert;
export type PriceHistory = typeof priceHistory.$inferSelect;
export type NewPriceHistory = typeof priceHistory.$inferInsert;

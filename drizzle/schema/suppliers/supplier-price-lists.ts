/**
 * Supplier Price Lists Schema
 *
 * Supplier-specific pricing agreements and price history tracking.
 * Includes support for quantity-based pricing and effective dates.
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/2-domains/suppliers/suppliers.prd.json for SUPP-PRICING-MANAGEMENT
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  timestampColumns,
  auditColumns,
  currencyColumn,
  percentageColumn,
  standardRlsPolicies,
  nonNegativeCheck,
  positiveCheck,
  nullableNonNegativeCheck,
  numericRangeCheck,
  dateRangeCheck,
  rangeCheck,
  sqlCurrentDate,
} from "../_shared/patterns";
import { suppliers } from "./suppliers";
import { products } from "../products/products";
import { organizations } from "../settings/organizations";

// ============================================================================
// SUPPLIER PRICE LISTS TABLE
// ============================================================================

export const supplierPriceLists = pgTable(
  "supplier_price_lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Links
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),

    // Denormalized info for display (avoid joins)
    supplierName: text("supplier_name"),
    productName: text("product_name"),
    productSku: text("product_sku"),

    // Pricing details
    basePrice: currencyColumn("base_price"),
    price: currencyColumn("price"),
    effectivePrice: currencyColumn("effective_price"), // After discounts
    currency: text("currency").notNull().default("AUD"),

    // Status
    status: text("status").notNull().default("active"), // active, expired, draft

    // Quantity-based pricing
    minQuantity: integer("min_quantity").notNull().default(1),
    maxQuantity: integer("max_quantity"),
    minOrderQty: integer("min_order_qty"),
    maxOrderQty: integer("max_order_qty"),

    // Tracking
    lastUpdated: timestamp("last_updated", { withTimezone: true }),

    // Discounts
    discountPercent: percentageColumn("discount_percent"),
    discountType: text("discount_type"), // percent, fixed
    discountValue: currencyColumn("discount_value"),

    // Validity period
    effectiveDate: date("effective_date").notNull().default(sqlCurrentDate()),
    expiryDate: date("expiry_date"),

    // Preference flags
    isPreferredPrice: boolean("is_preferred_price").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),

    // Supplier's reference
    supplierProductCode: text("supplier_product_code"),
    supplierProductName: text("supplier_product_name"),

    // Lead time for this specific product from this supplier
    leadTimeDays: integer("lead_time_days"),

    // Notes
    notes: text("notes"),

    // Version for optimistic locking
    version: integer("version").notNull().default(1),

    // Tracking
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    // Unique active price per supplier-product-quantity combination
    // (allows multiple prices for different quantity tiers)
    supplierProductQtyUnique: uniqueIndex("idx_supplier_price_lists_supplier_product_qty_unique")
      .on(table.supplierId, table.productId, table.minQuantity)
      .where(sql`${table.isActive} = true`),

    // Supplier queries
    supplierIdx: index("idx_supplier_price_lists_supplier").on(table.supplierId),

    orgSupplierIdx: index("idx_supplier_price_lists_org_supplier").on(
      table.organizationId,
      table.supplierId
    ),

    // Product queries
    productIdx: index("idx_supplier_price_lists_product").on(table.productId),

    orgProductIdx: index("idx_supplier_price_lists_org_product").on(
      table.organizationId,
      table.productId
    ),

    // Supplier-product combination
    supplierProductIdx: index("idx_supplier_price_lists_supplier_product").on(
      table.supplierId,
      table.productId
    ),

    // Active and preferred queries
    orgActiveIdx: index("idx_supplier_price_lists_org_active").on(
      table.organizationId,
      table.isActive
    ),

    preferredIdx: index("idx_supplier_price_lists_preferred").on(
      table.isPreferredPrice
    ),

    // Date-based queries
    effectiveDateIdx: index("idx_supplier_price_lists_effective_date").on(
      table.effectiveDate
    ),

    expiryDateIdx: index("idx_supplier_price_lists_expiry_date").on(
      table.expiryDate
    ),

    // Cursor pagination
    orgCreatedIdIdx: index("idx_supplier_price_lists_org_created_id").on(
      table.organizationId,
      table.createdAt,
      table.id
    ),

    // Price must be non-negative
    priceCheck: nonNegativeCheck("supplier_price_lists_price_non_negative", table.price),

    // Min quantity must be positive
    minQuantityCheck: positiveCheck("supplier_price_lists_min_quantity_positive", table.minQuantity),

    // Max quantity must be >= min quantity
    quantityRangeCheck: numericRangeCheck("supplier_price_lists_quantity_range", table.minQuantity, table.maxQuantity),

    // Expiry date must be after effective date
    dateRangeCheckConstraint: dateRangeCheck("supplier_price_lists_date_range", table.effectiveDate, table.expiryDate),

    // Discount percent range (0-100)
    discountCheck: rangeCheck("supplier_price_lists_discount_range", table.discountPercent, 0, 100),

    // Lead time must be non-negative
    leadTimeCheck: nullableNonNegativeCheck("supplier_price_lists_lead_time_non_negative", table.leadTimeDays),

    // RLS Policies
    ...standardRlsPolicies("supplier_price_lists"),
  })
);

// ============================================================================
// SUPPLIER PRICE HISTORY TABLE
// ============================================================================

export const supplierPriceHistory = pgTable(
  "supplier_price_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Links
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    priceListId: uuid("price_list_id")
      .references(() => supplierPriceLists.id, { onDelete: "set null" }),

    // Historical price data
    previousPrice: currencyColumn("previous_price"),
    newPrice: currencyColumn("new_price"),
    priceChange: currencyColumn("price_change"),
    changePercent: percentageColumn("change_percent"),

    // Change context
    changeReason: text("change_reason"),
    effectiveDate: date("effective_date").notNull(),

    // Who made the change
    changedBy: uuid("changed_by"),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),

    // Notes
    notes: text("notes"),
  },
  (table) => ({
    // Supplier-product queries
    supplierProductIdx: index("idx_supplier_price_history_supplier_product").on(
      table.supplierId,
      table.productId
    ),

    // Date queries for trending
    effectiveDateIdx: index("idx_supplier_price_history_effective_date").on(
      table.effectiveDate
    ),

    changedAtIdx: index("idx_supplier_price_history_changed_at").on(
      table.changedAt
    ),

    // Price list reference
    priceListIdx: index("idx_supplier_price_history_price_list").on(
      table.priceListId
    ),

    // Organization queries
    orgSupplierIdx: index("idx_supplier_price_history_org_supplier").on(
      table.organizationId,
      table.supplierId
    ),

    orgProductIdx: index("idx_supplier_price_history_org_product").on(
      table.organizationId,
      table.productId
    ),

    // Cursor pagination
    orgCreatedIdIdx: index("idx_supplier_price_history_org_created_id").on(
      table.organizationId,
      table.changedAt,
      table.id
    ),

    // RLS Policies
    ...standardRlsPolicies("supplier_price_history"),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const supplierPriceListsRelations = relations(
  supplierPriceLists,
  ({ one, many }) => ({
    supplier: one(suppliers, {
      fields: [supplierPriceLists.supplierId],
      references: [suppliers.id],
    }),
    product: one(products, {
      fields: [supplierPriceLists.productId],
      references: [products.id],
    }),
    priceHistory: many(supplierPriceHistory),
  })
);

export const supplierPriceHistoryRelations = relations(
  supplierPriceHistory,
  ({ one }) => ({
    supplier: one(suppliers, {
      fields: [supplierPriceHistory.supplierId],
      references: [suppliers.id],
    }),
    product: one(products, {
      fields: [supplierPriceHistory.productId],
      references: [products.id],
    }),
    priceList: one(supplierPriceLists, {
      fields: [supplierPriceHistory.priceListId],
      references: [supplierPriceLists.id],
    }),
  })
);

// ============================================================================
// TYPES
// ============================================================================

export type SupplierPriceList = typeof supplierPriceLists.$inferSelect;
export type NewSupplierPriceList = typeof supplierPriceLists.$inferInsert;

export type SupplierPriceHistory = typeof supplierPriceHistory.$inferSelect;
export type NewSupplierPriceHistory = typeof supplierPriceHistory.$inferInsert;

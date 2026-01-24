/**
 * Suppliers Schema
 *
 * Core supplier relationship management database schema.
 * Includes suppliers and supplier performance metrics for tracking.
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/2-domains/suppliers/suppliers.prd.json for full specification
 * @see _Initiation/_prd/1-foundation/patterns/canonical-enums.json for enum values
 */

import {
  pgTable,
  uuid,
  text,
  jsonb,
  integer,
  date,
  check,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  supplierStatusEnum,
  supplierTypeEnum,
  paymentTermsEnum,
} from "../_shared/enums";
import {
  timestampColumns,
  auditColumns,
  softDeleteColumn,
  fullTextSearchSql,
  currencyColumnNullable,
  numericCasted,
} from "../_shared/patterns";
import { organizations } from "../settings/organizations";

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Address structure for supplier billing/shipping addresses (JSONB column)
 */
export interface SupplierAddress {
  street1: string;
  street2?: string;
  city: string;
  state?: string;
  postcode: string;
  country: string;
}

/**
 * Flexible custom fields for supplier-specific data (JSONB column)
 */
export interface SupplierCustomFields {
  [key: string]: string | number | boolean | null | undefined;
}

// ============================================================================
// SUPPLIERS TABLE
// ============================================================================

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Supplier code (auto-generated, unique per org)
    supplierCode: text("supplier_code")
      .notNull()
      .default(sql`'SUPP-' || substr(gen_random_uuid()::text, 1, 8)`),

    // Basic info
    name: text("name").notNull(),
    legalName: text("legal_name"),
    email: text("email"),
    phone: text("phone"),
    website: text("website"),

    // Classification
    status: supplierStatusEnum("status").notNull().default("active"),
    supplierType: supplierTypeEnum("supplier_type"),

    // Business identifiers
    taxId: text("tax_id"), // ABN for Australian businesses
    registrationNumber: text("registration_number"),

    // Contact information
    primaryContactName: text("primary_contact_name"),
    primaryContactEmail: text("primary_contact_email"),
    primaryContactPhone: text("primary_contact_phone"),

    // Addresses (JSONB for flexibility)
    billingAddress: jsonb("billing_address").$type<SupplierAddress>(),
    shippingAddress: jsonb("shipping_address").$type<SupplierAddress>(),

    // Financial terms
    paymentTerms: paymentTermsEnum("payment_terms").default("net_30"),
    currency: text("currency").notNull().default("AUD"),

    // Procurement parameters
    leadTimeDays: integer("lead_time_days"),
    minimumOrderValue: currencyColumnNullable("minimum_order_value"),
    maximumOrderValue: currencyColumnNullable("maximum_order_value"),

    // Performance ratings (0-5 scale, stored as numeric for precision)
    qualityRating: numericCasted("quality_rating", { precision: 3, scale: 1 }),
    deliveryRating: numericCasted("delivery_rating", { precision: 3, scale: 1 }),
    communicationRating: numericCasted("communication_rating", { precision: 3, scale: 1 }),
    overallRating: numericCasted("overall_rating", { precision: 3, scale: 1 })
      .generatedAlwaysAs(sql`(quality_rating + delivery_rating + communication_rating) / 3`),
    ratingUpdatedAt: text("rating_updated_at"), // ISO timestamp

    // Lifetime metrics
    totalPurchaseOrders: integer("total_purchase_orders").notNull().default(0),
    totalPurchaseValue: currencyColumnNullable("total_purchase_value"),
    averageOrderValue: currencyColumnNullable("average_order_value"),
    firstOrderDate: date("first_order_date"),
    lastOrderDate: date("last_order_date"),

    // Flexible data
    tags: jsonb("tags").$type<string[]>().default([]),
    customFields: jsonb("custom_fields").$type<SupplierCustomFields>().default({}),
    notes: text("notes"),

    // Tracking
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumn,
  },
  (table) => ({
    // Unique supplier code per organization
    supplierCodeOrgUnique: uniqueIndex("idx_suppliers_code_org_unique")
      .on(table.organizationId, table.supplierCode)
      .where(sql`${table.deletedAt} IS NULL`),

    // Unique email per organization (when set)
    emailOrgUnique: uniqueIndex("idx_suppliers_email_org_unique")
      .on(table.organizationId, table.email)
      .where(sql`${table.email} IS NOT NULL AND ${table.deletedAt} IS NULL`),

    // Multi-tenant queries
    orgStatusIdx: index("idx_suppliers_org_status").on(
      table.organizationId,
      table.status
    ),

    orgTypeIdx: index("idx_suppliers_org_type").on(
      table.organizationId,
      table.supplierType
    ),

    // Rating queries
    orgOverallRatingIdx: index("idx_suppliers_org_overall_rating").on(
      table.organizationId,
      table.overallRating
    ),

    // Last order date for recency queries
    orgLastOrderIdx: index("idx_suppliers_org_last_order").on(
      table.organizationId,
      table.lastOrderDate
    ),

    // Cursor pagination index (org + createdAt + id for deterministic ordering)
    orgCreatedIdIdx: index("idx_suppliers_org_created_id").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),

    // Full-text search on name
    nameSearchIdx: index("idx_suppliers_name_search").using(
      "gin",
      fullTextSearchSql(table.name)
    ),

    // GIN index for tags array queries
    tagsGinIdx: index("idx_suppliers_tags_gin").using("gin", table.tags),

    // Rating constraints (0-5 scale)
    qualityRatingCheck: check(
      "suppliers_quality_rating_range",
      sql`${table.qualityRating} IS NULL OR (${table.qualityRating} >= 0 AND ${table.qualityRating} <= 5)`
    ),
    deliveryRatingCheck: check(
      "suppliers_delivery_rating_range",
      sql`${table.deliveryRating} IS NULL OR (${table.deliveryRating} >= 0 AND ${table.deliveryRating} <= 5)`
    ),
    communicationRatingCheck: check(
      "suppliers_communication_rating_range",
      sql`${table.communicationRating} IS NULL OR (${table.communicationRating} >= 0 AND ${table.communicationRating} <= 5)`
    ),
    overallRatingCheck: check(
      "suppliers_overall_rating_range",
      sql`${table.overallRating} IS NULL OR (${table.overallRating} >= 0 AND ${table.overallRating} <= 5)`
    ),

    // Order value constraints
    orderValueCheck: check(
      "suppliers_order_value_range",
      sql`${table.minimumOrderValue} IS NULL OR ${table.maximumOrderValue} IS NULL OR ${table.maximumOrderValue} >= ${table.minimumOrderValue}`
    ),
  })
);

// ============================================================================
// SUPPLIER PERFORMANCE METRICS TABLE (Historical tracking)
// ============================================================================

export const supplierPerformanceMetrics = pgTable(
  "supplier_performance_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Link to supplier
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),

    // Metric period (one record per supplier per month)
    metricMonth: date("metric_month").notNull(),

    // Delivery performance
    totalOrdersDelivered: integer("total_orders_delivered").notNull().default(0),
    onTimeDeliveries: integer("on_time_deliveries").notNull().default(0),
    lateDeliveries: integer("late_deliveries").notNull().default(0),
    averageDeliveryDays: numericCasted("average_delivery_days", { precision: 5, scale: 2 }),

    // Quality performance
    totalItemsReceived: integer("total_items_received").notNull().default(0),
    acceptedItems: integer("accepted_items").notNull().default(0),
    rejectedItems: integer("rejected_items").notNull().default(0),
    defectRate: numericCasted("defect_rate", { precision: 5, scale: 2 }),

    // Financial metrics
    totalSpend: currencyColumnNullable("total_spend"),
    averageOrderValue: currencyColumnNullable("average_order_value"),

    // Response metrics
    averageResponseTimeHours: numericCasted("average_response_time_hours", { precision: 6, scale: 2 }),

    // Calculated scores (0-100 scale)
    deliveryScore: numericCasted("delivery_score", { precision: 5, scale: 2 }),
    qualityScore: numericCasted("quality_score", { precision: 5, scale: 2 }),
    overallScore: numericCasted("overall_score", { precision: 5, scale: 2 }),

    // Tracking
    createdAt: text("created_at").notNull().default(sql`now()`),
  },
  (table) => ({
    // Unique metric per supplier per month
    supplierMonthUnique: uniqueIndex("idx_supplier_performance_metrics_unique").on(
      table.supplierId,
      table.metricMonth
    ),

    supplierIdx: index("idx_supplier_performance_metrics_supplier").on(
      table.supplierId
    ),

    orgSupplierIdx: index("idx_supplier_performance_metrics_org_supplier").on(
      table.organizationId,
      table.supplierId
    ),

    metricMonthIdx: index("idx_supplier_performance_metrics_month").on(
      table.metricMonth
    ),

    overallScoreIdx: index("idx_supplier_performance_metrics_overall").on(
      table.overallScore
    ),

    // Score range checks
    deliveryScoreCheck: check(
      "supplier_metrics_delivery_score_range",
      sql`${table.deliveryScore} IS NULL OR (${table.deliveryScore} >= 0 AND ${table.deliveryScore} <= 100)`
    ),
    qualityScoreCheck: check(
      "supplier_metrics_quality_score_range",
      sql`${table.qualityScore} IS NULL OR (${table.qualityScore} >= 0 AND ${table.qualityScore} <= 100)`
    ),
    overallScoreCheck: check(
      "supplier_metrics_overall_score_range",
      sql`${table.overallScore} IS NULL OR (${table.overallScore} >= 0 AND ${table.overallScore} <= 100)`
    ),

    // Defect rate check (0-100%)
    defectRateCheck: check(
      "supplier_metrics_defect_rate_range",
      sql`${table.defectRate} IS NULL OR (${table.defectRate} >= 0 AND ${table.defectRate} <= 100)`
    ),
  })
);

// ============================================================================
// RELATIONS (defined after all tables to avoid circular references)
// ============================================================================

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  performanceMetrics: many(supplierPerformanceMetrics),
  // Note: purchaseOrders, priceLists relations defined in their respective files
}));

export const supplierPerformanceMetricsRelations = relations(
  supplierPerformanceMetrics,
  ({ one }) => ({
    supplier: one(suppliers, {
      fields: [supplierPerformanceMetrics.supplierId],
      references: [suppliers.id],
    }),
  })
);

// ============================================================================
// TYPES
// ============================================================================

export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;

export type SupplierPerformanceMetric = typeof supplierPerformanceMetrics.$inferSelect;
export type NewSupplierPerformanceMetric = typeof supplierPerformanceMetrics.$inferInsert;

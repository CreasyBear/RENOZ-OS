/**
 * Reusable Schema Patterns
 *
 * Common column patterns for consistent table definitions.
 * Import these helpers to reduce boilerplate and ensure consistency.
 *
 * @example
 * import { timestampColumns, auditColumns, organizationColumn } from "./patterns";
 *
 * export const myTable = pgTable("my_table", {
 *   id: uuid("id").primaryKey().defaultRandom(),
 *   ...organizationColumn,
 *   ...timestampColumns,
 *   ...auditColumns,
 * });
 */

import { uuid, timestamp, customType, pgPolicy, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ============================================================================
// TIMESTAMP COLUMNS
// ============================================================================

/**
 * Standard timestamp columns for all tables.
 * - createdAt: Set automatically on insert
 * - updatedAt: Updated automatically via $onUpdate
 */
export const timestampColumns = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ============================================================================
// AUDIT COLUMNS
// ============================================================================

/**
 * Audit trail columns for tracking who created/modified records.
 * References to users table must be added via separate FK definition.
 */
export const auditColumns = {
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
};

// ============================================================================
// SOFT DELETE COLUMN
// ============================================================================

/**
 * Soft delete column for recoverable deletions.
 * NULL = active, timestamp = deleted at that time
 */
export const softDeleteColumn = {
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

// ============================================================================
// ORGANIZATION COLUMN
// ============================================================================

/**
 * Multi-tenant organization column.
 *
 * Note: The FK reference must be added separately as it depends on
 * the organizations table existing:
 *
 * organizationId: uuid("organization_id")
 *   .notNull()
 *   .references(() => organizations.id, { onDelete: "cascade" }),
 */
/**
 * Multi-tenant organization column.
 *
 * Note: The FK reference must be added separately as it depends on
 * the organizations table existing:
 *
 * organizationId: uuid("organization_id")
 *   .notNull()
 *   .references(() => organizations.id, { onDelete: "cascade" }),
 */
export const organizationColumnBase = {
  organizationId: uuid("organization_id").notNull(),
};

/**
 * Alias for organizationColumnBase for backward compatibility.
 */
export const organizationColumn = organizationColumnBase;

// ============================================================================
// CUSTOM TYPES
// ============================================================================

/**
 * Currency/money type with proper precision.
 *
 * Uses numeric(12,2) which:
 * - Avoids JavaScript floating point issues
 * - Supports values up to 9,999,999,999.99
 * - Stores exactly 2 decimal places
 *
 * Drizzle returns numeric as string by default for precision.
 * This custom type converts to number on read for convenience.
 *
 * @example
 * price: numericCasted("price", { precision: 12, scale: 2 }),
 */
export const numericCasted = customType<{
  data: number;
  driverData: string;
  config: { precision?: number; scale?: number };
}>({
  dataType(config) {
    const precision = config?.precision ?? 12;
    const scale = config?.scale ?? 2;
    return `numeric(${precision}, ${scale})`;
  },
  fromDriver(value: string): number {
    return parseFloat(value);
  },
  toDriver(value: number): string {
    return value.toString();
  },
});

/**
 * Shorthand for currency columns (12,2 precision).
 */
export const currencyColumn = (name: string) =>
  numericCasted(name, { precision: 12, scale: 2 }).notNull().default(0);

/**
 * Shorthand for nullable currency columns.
 */
export const currencyColumnNullable = (name: string) =>
  numericCasted(name, { precision: 12, scale: 2 });

/**
 * TSVECTOR column for full-text search.
 * Intended for generated columns; returns string for driver compatibility.
 */
export const tsvectorColumn = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return "tsvector";
  },
  fromDriver(value: string): string {
    return value;
  },
  toDriver(value: string): string {
    return value;
  },
});

// ============================================================================
// PERCENTAGE COLUMN
// ============================================================================

/**
 * Percentage column (5,2 precision for values like 99.99%).
 */
export const percentageColumn = (name: string) =>
  numericCasted(name, { precision: 5, scale: 2 });

// ============================================================================
// QUANTITY COLUMN
// ============================================================================

/**
 * Quantity column for inventory (10,3 precision for fractional units).
 */
export const quantityColumn = (name: string) =>
  numericCasted(name, { precision: 10, scale: 3 }).notNull().default(0);

// ============================================================================
// HELPER: FULL TEXT SEARCH INDEX SQL
// ============================================================================

/**
 * Generate SQL for GIN full-text search index.
 *
 * @example
 * In table indexes:
 * nameSearchIdx: index("idx_customers_name_search")
 *   .using("gin", fullTextSearchSql(table.name)),
 */
export const fullTextSearchSql = (column: any) =>
  sql`to_tsvector('english', ${column})`;

// ============================================================================
// RLS POLICY HELPERS
// ============================================================================

/**
 * Standard RLS policy SQL expression for organization-based multi-tenancy.
 * Uses PostgreSQL session variable 'app.organization_id' set by application.
 *
 * @example
 * selectPolicy: pgPolicy("table_select_policy", {
 *   for: "select",
 *   to: "authenticated",
 *   using: organizationRlsUsing(),
 * }),
 */
export const organizationRlsUsing = () =>
  sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`;

/**
 * Standard RLS policy SQL expression for organization-based multi-tenancy (withCheck).
 * Uses PostgreSQL session variable 'app.organization_id' set by application.
 *
 * @example
 * insertPolicy: pgPolicy("table_insert_policy", {
 *   for: "insert",
 *   to: "authenticated",
 *   withCheck: organizationRlsWithCheck(),
 * }),
 */
export const organizationRlsWithCheck = () =>
  sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`;

/**
 * Generate standard CRUD RLS policies for a table.
 * Returns an object with selectPolicy, insertPolicy, updatePolicy, and deletePolicy.
 *
 * @param tableName - The table name (e.g., "customers")
 * @returns Object with RLS policy definitions
 *
 * @example
 * export const customers = pgTable("customers", {
 *   // ... columns
 * }, (table) => ({
 *   ...standardRlsPolicies("customers"),
 *   // ... other indexes/constraints
 * }));
 */
export const standardRlsPolicies = (tableName: string) => {
  const using = organizationRlsUsing();
  const withCheck = organizationRlsWithCheck();

  return {
    selectPolicy: pgPolicy(`${tableName}_select_policy`, {
      for: "select",
      to: "authenticated",
      using,
    }),
    insertPolicy: pgPolicy(`${tableName}_insert_policy`, {
      for: "insert",
      to: "authenticated",
      withCheck,
    }),
    updatePolicy: pgPolicy(`${tableName}_update_policy`, {
      for: "update",
      to: "authenticated",
      using,
      withCheck,
    }),
    deletePolicy: pgPolicy(`${tableName}_delete_policy`, {
      for: "delete",
      to: "authenticated",
      using,
    }),
  };
};

// ============================================================================
// CHECK CONSTRAINT HELPERS
// ============================================================================

/**
 * Check constraint for nullable numeric range (e.g., scores 0-100).
 *
 * @param name - Constraint name
 * @param column - Column reference from table
 * @param min - Minimum value (default: 0)
 * @param max - Maximum value (default: 100)
 *
 * @example
 * healthScoreCheck: rangeCheck("health_score_range", table.healthScore, 0, 100),
 */
export const rangeCheck = (
  name: string,
  column: any,
  min: number = 0,
  max: number = 100
) =>
  check(
    name,
    sql`${column} IS NULL OR (${column} >= ${min} AND ${column} <= ${max})`
  );

/**
 * Check constraint for non-negative numeric values.
 *
 * @param name - Constraint name
 * @param column - Column reference from table
 *
 * @example
 * priceNonNegativeCheck: nonNegativeCheck("price_non_negative", table.price),
 */
export const nonNegativeCheck = (name: string, column: any) =>
  check(name, sql`${column} >= 0`);

/**
 * Check constraint for positive numeric values (must be > 0).
 *
 * @param name - Constraint name
 * @param column - Column reference from table
 *
 * @example
 * minQuantityCheck: positiveCheck("min_quantity_positive", table.minQuantity),
 */
export const positiveCheck = (name: string, column: any) =>
  check(name, sql`${column} > 0`);

/**
 * Check constraint for nullable non-negative numeric values.
 *
 * @param name - Constraint name
 * @param column - Column reference from table
 *
 * @example
 * costNonNegativeCheck: nullableNonNegativeCheck("cost_non_negative", table.cost),
 */
export const nullableNonNegativeCheck = (name: string, column: any) =>
  check(name, sql`${column} IS NULL OR ${column} >= 0`);

/**
 * Check constraint for date range validation (end date must be after start date).
 *
 * @param name - Constraint name
 * @param startColumn - Start date column reference
 * @param endColumn - End date column reference
 *
 * @example
 * contractDatesCheck: dateRangeCheck("contract_dates_valid", table.contractStartDate, table.contractEndDate),
 */
export const dateRangeCheck = (
  name: string,
  startColumn: any,
  endColumn: any
) =>
  check(
    name,
    sql`${endColumn} IS NULL OR ${startColumn} IS NULL OR ${endColumn} > ${startColumn}`
  );

/**
 * Check constraint for nullable numeric range validation (max >= min).
 * Useful for quantity ranges, amount ranges, etc.
 *
 * @param name - Constraint name
 * @param minColumn - Minimum value column reference
 * @param maxColumn - Maximum value column reference
 * @param allowEqual - Whether min can equal max (default: true)
 *
 * @example
 * quantityRangeCheck: numericRangeCheck("quantity_range", table.minQuantity, table.maxQuantity),
 */
export const numericRangeCheck = (
  name: string,
  minColumn: any,
  maxColumn: any,
  allowEqual: boolean = true
) => {
  if (allowEqual) {
    return check(
      name,
      sql`${maxColumn} IS NULL OR ${minColumn} IS NULL OR ${maxColumn} >= ${minColumn}`
    );
  } else {
    return check(
      name,
      sql`${maxColumn} IS NULL OR ${minColumn} IS NULL OR ${maxColumn} > ${minColumn}`
    );
  }
};

/**
 * Check constraint for non-nullable numeric range (e.g., scores 0-100).
 * Unlike rangeCheck(), this does NOT allow NULL values.
 *
 * @param name - Constraint name
 * @param column - Column reference from table
 * @param min - Minimum value (default: 0)
 * @param max - Maximum value (default: 100)
 *
 * @example
 * discountPercentCheck: nonNullableRangeCheck("discount_percent_range", table.discountPercent, 0, 100),
 */
export const nonNullableRangeCheck = (
  name: string,
  column: any,
  min: number = 0,
  max: number = 100
) =>
  check(
    name,
    sql`${column} >= ${min} AND ${column} <= ${max}`
  );

// ============================================================================
// DEFAULT VALUE HELPERS
// ============================================================================

/**
 * SQL expression for current timestamp (for text columns that store ISO strings).
 * Note: Prefer using timestamp columns with .defaultNow() when possible.
 *
 * @example
 * createdAt: text("created_at").notNull().default(sqlNow()),
 */
export const sqlNow = () => sql`now()`;

/**
 * SQL expression for current date.
 *
 * @example
 * orderDate: date("order_date").notNull().default(sqlCurrentDate()),
 */
export const sqlCurrentDate = () => sql`CURRENT_DATE`;

/**
 * SQL expression for empty text array default.
 *
 * @example
 * tags: text("tags").array().default(sqlEmptyTextArray()),
 */
export const sqlEmptyTextArray = () => sql`'{}'::text[]`;

/**
 * SQL expression for empty UUID array default.
 *
 * @example
 * userIds: uuid("user_ids").array().default(sqlEmptyUuidArray()),
 */
export const sqlEmptyUuidArray = () => sql`'{}'::uuid[]`;

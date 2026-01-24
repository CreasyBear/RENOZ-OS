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

import { uuid, timestamp, customType } from "drizzle-orm/pg-core";
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

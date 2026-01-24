/**
 * Data Exports Schema
 *
 * Tracking of data export jobs for backup and portability.
 * Supports background processing with status tracking.
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/2-domains/settings/settings.prd.json for requirements
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  bigint,
  integer,
  timestamp,
  jsonb,
  index,
  pgPolicy,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { organizations } from "./organizations";
import { users } from "../users/users";

// ============================================================================
// ENUMS (inline for this domain)
// ============================================================================

import { pgEnum } from "drizzle-orm/pg-core";

export const exportFormatEnum = pgEnum("export_format", [
  "csv",
  "json",
  "xlsx",
]);

export const exportStatusEnum = pgEnum("export_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
  "expired",
]);

// ============================================================================
// INTERFACES
// ============================================================================

export interface ExportMetadata {
  /** Filter criteria used for export */
  filters?: {
    entityType?: string;
    status?: string[];
    tags?: string[];
    customerId?: string;
    createdAfter?: string;
    createdBefore?: string;
  };
  /** Whether data was anonymized */
  anonymized?: boolean;
  /** Columns/fields included */
  includedFields?: string[];
  /** Date range if applicable */
  dateRange?: {
    start?: string;
    end?: string;
  };
  /** Processing notes */
  notes?: string;
  /** Error details if failed */
  errorDetails?: {
    code?: string;
    message?: string;
    stack?: string;
    retryCount?: number;
  };
  /** Total row count */
  rowCount?: number;
  /** File size in bytes */
  fileSizeBytes?: number;
  /** Compression used */
  compression?: "none" | "gzip" | "zip";
  /** Character encoding */
  encoding?: "utf-8" | "utf-16" | "iso-8859-1";
}

// ============================================================================
// DATA EXPORTS TABLE
// ============================================================================

export const dataExports = pgTable(
  "data_exports",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Organization scoping
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Who requested the export
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // What entities are being exported (array of entity type names)
    // e.g., ["customers", "orders", "products"]
    entities: text("entities").array().notNull(),

    // Export format
    format: exportFormatEnum("format").notNull(),

    // Export status
    status: exportStatusEnum("status").notNull().default("pending"),

    // File information (populated when completed)
    fileUrl: text("file_url"), // Signed URL or storage path
    fileName: varchar("file_name", { length: 255 }), // Generated filename
    fileSize: bigint("file_size", { mode: "number" }), // Size in bytes

    // Statistics
    recordCount: integer("record_count"), // Total records exported

    // Lifecycle timestamps
    expiresAt: timestamp("expires_at", { withTimezone: true }), // When file expires
    startedAt: timestamp("started_at", { withTimezone: true }), // When processing started
    completedAt: timestamp("completed_at", { withTimezone: true }), // When processing finished

    // Error handling
    errorMessage: text("error_message"), // User-friendly error message

    // Extended metadata
    metadata: jsonb("metadata").$type<ExportMetadata>().default({}),

    // Tracking
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    // Organization queries
    orgIdx: index("idx_data_exports_org").on(table.organizationId),

    // User's exports
    userIdx: index("idx_data_exports_user").on(table.requestedBy),

    // Organization + user for list view
    orgUserIdx: index("idx_data_exports_org_user").on(
      table.organizationId,
      table.requestedBy
    ),

    // Status-based queries (e.g., find pending exports to process)
    statusIdx: index("idx_data_exports_status").on(table.status),

    // Organization + status for dashboard
    orgStatusIdx: index("idx_data_exports_org_status").on(
      table.organizationId,
      table.status
    ),

    // Cleanup queries (find expired exports)
    expiresIdx: index("idx_data_exports_expires").on(table.expiresAt),

    // Recent exports
    createdIdx: index("idx_data_exports_created").on(table.createdAt),

    // Entities must be non-empty array
    entitiesNonEmptyCheck: check(
      "data_exports_entities_nonempty",
      sql`array_length(${table.entities}, 1) > 0`
    ),

    // RLS Policies
    selectPolicy: pgPolicy("data_exports_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
    insertPolicy: pgPolicy("data_exports_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
    updatePolicy: pgPolicy("data_exports_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
      withCheck: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
    deletePolicy: pgPolicy("data_exports_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const dataExportsRelations = relations(dataExports, ({ one }) => ({
  organization: one(organizations, {
    fields: [dataExports.organizationId],
    references: [organizations.id],
  }),
  requestedByUser: one(users, {
    fields: [dataExports.requestedBy],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type DataExport = typeof dataExports.$inferSelect;
export type NewDataExport = typeof dataExports.$inferInsert;

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Export file expiration time (7 days by default).
 */
export const EXPORT_EXPIRATION_DAYS = 7;

/**
 * Maximum concurrent exports per organization.
 */
export const MAX_CONCURRENT_EXPORTS = 5;

/**
 * Maximum export file size (1GB).
 */
export const MAX_EXPORT_SIZE_BYTES = 1024 * 1024 * 1024;

/**
 * Exportable entity types.
 */
export const EXPORTABLE_ENTITIES = [
  "customers",
  "contacts",
  "orders",
  "products",
  "suppliers",
  "opportunities",
  "issues",
  "activities",
  "audit_logs",
] as const;

export type ExportableEntity = (typeof EXPORTABLE_ENTITIES)[number];

/**
 * Entity dependencies for export (to maintain referential integrity).
 * Key is entity, value is array of entities that must be included.
 */
export const ENTITY_DEPENDENCIES: Record<string, string[]> = {
  contacts: ["customers"],
  orders: ["customers", "products"],
  opportunities: ["customers"],
  issues: ["customers"],
  activities: ["customers"],
};

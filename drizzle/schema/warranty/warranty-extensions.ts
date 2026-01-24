/**
 * Warranty Extensions Schema
 *
 * Tracks warranty period extensions for batteries, inverters, and installations.
 * Supports paid extensions, promotional offers, loyalty rewards, and goodwill gestures.
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-007a
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  timestampColumns,
  currencyColumnNullable,
  auditColumns,
} from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { warranties } from "./warranties";
import { users } from "../users/users";

// ============================================================================
// WARRANTY EXTENSION TYPE ENUM
// ============================================================================

export const warrantyExtensionTypeEnum = pgEnum("warranty_extension_type", [
  "paid_extension", // Customer purchased additional coverage
  "promotional", // Free extension from marketing promotion
  "loyalty_reward", // Extension granted for customer loyalty
  "goodwill", // Goodwill gesture (e.g., after complaint resolution)
]);

// ============================================================================
// WARRANTY EXTENSIONS TABLE
// ============================================================================

export const warrantyExtensions = pgTable(
  "warranty_extensions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // The warranty being extended
    warrantyId: uuid("warranty_id").notNull(),

    // Type of extension
    extensionType: warrantyExtensionTypeEnum("extension_type").notNull(),

    // Duration of extension in months
    extensionMonths: integer("extension_months").notNull(),

    // Expiry date tracking
    previousExpiryDate: timestamp("previous_expiry_date", {
      withTimezone: true,
    }).notNull(),
    newExpiryDate: timestamp("new_expiry_date", {
      withTimezone: true,
    }).notNull(),

    // Price (nullable for free extensions like promotional, loyalty, goodwill)
    price: currencyColumnNullable("price"),

    // Reason/notes for the extension
    notes: text("notes"),

    // Who approved this extension
    approvedById: uuid("approved_by_id"),

    ...auditColumns,
    ...timestampColumns,
  },
  (table) => [
    // Lookup extensions by warranty
    index("idx_warranty_extensions_warranty").on(table.warrantyId),

    // Lookup by organization
    index("idx_warranty_extensions_org").on(table.organizationId),

    // Lookup by extension type (for reporting)
    index("idx_warranty_extensions_type").on(
      table.organizationId,
      table.extensionType
    ),

    // Lookup by approver
    index("idx_warranty_extensions_approver").on(table.approvedById),

    // Date range queries for reporting
    index("idx_warranty_extensions_created").on(
      table.organizationId,
      table.createdAt
    ),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const warrantyExtensionsRelations = relations(
  warrantyExtensions,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [warrantyExtensions.organizationId],
      references: [organizations.id],
    }),
    warranty: one(warranties, {
      fields: [warrantyExtensions.warrantyId],
      references: [warranties.id],
    }),
    approvedBy: one(users, {
      fields: [warrantyExtensions.approvedById],
      references: [users.id],
      relationName: "warrantyExtensionApprovedBy",
    }),
    createdByUser: one(users, {
      fields: [warrantyExtensions.createdBy],
      references: [users.id],
      relationName: "warrantyExtensionCreatedBy",
    }),
    updatedByUser: one(users, {
      fields: [warrantyExtensions.updatedBy],
      references: [users.id],
      relationName: "warrantyExtensionUpdatedBy",
    }),
  })
);

// ============================================================================
// TYPES
// ============================================================================

export type WarrantyExtension = typeof warrantyExtensions.$inferSelect;
export type NewWarrantyExtension = typeof warrantyExtensions.$inferInsert;
export type WarrantyExtensionType =
  (typeof warrantyExtensionTypeEnum.enumValues)[number];

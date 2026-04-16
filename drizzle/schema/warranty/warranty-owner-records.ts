/**
 * Warranty Owner Records Schema
 *
 * Structured owner-of-record details for activated warranties.
 * Intentionally separate from CRM customers to avoid creating homeowner accounts.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  auditColumns,
  standardRlsPolicies,
  timestampColumns,
} from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { users } from "../users/users";

export interface WarrantyOwnerAddress {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export const warrantyOwnerRecords = pgTable(
  "warranty_owner_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    address: jsonb("address").$type<WarrantyOwnerAddress>(),
    notes: text("notes"),
    ...auditColumns,
    ...timestampColumns,
  },
  (table) => ({
    orgIdx: index("idx_warranty_owner_records_org").on(table.organizationId),
    orgNameIdx: index("idx_warranty_owner_records_org_name").on(
      table.organizationId,
      table.fullName
    ),
    ...standardRlsPolicies("warranty_owner_records"),
  })
);

export const warrantyOwnerRecordsRelations = relations(
  warrantyOwnerRecords,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [warrantyOwnerRecords.organizationId],
      references: [organizations.id],
    }),
    createdByUser: one(users, {
      fields: [warrantyOwnerRecords.createdBy],
      references: [users.id],
      relationName: "warrantyOwnerRecordCreatedBy",
    }),
    updatedByUser: one(users, {
      fields: [warrantyOwnerRecords.updatedBy],
      references: [users.id],
      relationName: "warrantyOwnerRecordUpdatedBy",
    }),
  })
);

export type WarrantyOwnerRecord = typeof warrantyOwnerRecords.$inferSelect;
export type NewWarrantyOwnerRecord = typeof warrantyOwnerRecords.$inferInsert;

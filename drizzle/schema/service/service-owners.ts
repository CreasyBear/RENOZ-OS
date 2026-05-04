/**
 * Service Owners Schema
 *
 * Canonical non-CRM beneficial owners for installed systems.
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

export interface ServiceOwnerAddress {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export const serviceOwners = pgTable(
  "service_owners",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    normalizedFullName: varchar("normalized_full_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    normalizedEmail: varchar("normalized_email", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    normalizedPhone: varchar("normalized_phone", { length: 50 }),
    address: jsonb("address").$type<ServiceOwnerAddress>(),
    notes: text("notes"),
    ...auditColumns,
    ...timestampColumns,
  },
  (table) => ({
    orgIdx: index("idx_service_owners_org").on(table.organizationId),
    orgNameIdx: index("idx_service_owners_org_name").on(
      table.organizationId,
      table.normalizedFullName
    ),
    orgEmailIdx: index("idx_service_owners_org_email").on(
      table.organizationId,
      table.normalizedEmail
    ),
    orgPhoneIdx: index("idx_service_owners_org_phone").on(
      table.organizationId,
      table.normalizedPhone
    ),
    ...standardRlsPolicies("service_owners"),
  })
);

export const serviceOwnersRelations = relations(serviceOwners, ({ one }) => ({
  organization: one(organizations, {
    fields: [serviceOwners.organizationId],
    references: [organizations.id],
  }),
  createdByUser: one(users, {
    fields: [serviceOwners.createdBy],
    references: [users.id],
    relationName: "serviceOwnerCreatedBy",
  }),
  updatedByUser: one(users, {
    fields: [serviceOwners.updatedBy],
    references: [users.id],
    relationName: "serviceOwnerUpdatedBy",
  }),
}));

export type ServiceOwner = typeof serviceOwners.$inferSelect;
export type NewServiceOwner = typeof serviceOwners.$inferInsert;

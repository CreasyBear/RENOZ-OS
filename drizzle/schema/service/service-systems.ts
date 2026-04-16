/**
 * Service Systems Schema
 *
 * Canonical installed-system identities for service and warranty flows.
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
import { customers } from "../customers/customers";
import { orders } from "../orders/orders";
import { projects } from "../jobs/projects";

export interface ServiceSystemAddress {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export const serviceSystems = pgTable(
  "service_systems",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    siteAddress: jsonb("site_address").$type<ServiceSystemAddress>(),
    normalizedSiteAddressKey: text("normalized_site_address_key"),
    commercialCustomerId: uuid("commercial_customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    sourceOrderId: uuid("source_order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    ...auditColumns,
    ...timestampColumns,
  },
  (table) => ({
    orgIdx: index("idx_service_systems_org").on(table.organizationId),
    orgAddressIdx: index("idx_service_systems_org_address").on(
      table.organizationId,
      table.normalizedSiteAddressKey
    ),
    orgOrderIdx: index("idx_service_systems_org_order").on(
      table.organizationId,
      table.sourceOrderId
    ),
    orgProjectIdx: index("idx_service_systems_org_project").on(
      table.organizationId,
      table.projectId
    ),
    orgCustomerIdx: index("idx_service_systems_org_customer").on(
      table.organizationId,
      table.commercialCustomerId
    ),
    ...standardRlsPolicies("service_systems"),
  })
);

export const serviceSystemsRelations = relations(serviceSystems, ({ one }) => ({
  organization: one(organizations, {
    fields: [serviceSystems.organizationId],
    references: [organizations.id],
  }),
  commercialCustomer: one(customers, {
    fields: [serviceSystems.commercialCustomerId],
    references: [customers.id],
  }),
  sourceOrder: one(orders, {
    fields: [serviceSystems.sourceOrderId],
    references: [orders.id],
  }),
  project: one(projects, {
    fields: [serviceSystems.projectId],
    references: [projects.id],
  }),
  createdByUser: one(users, {
    fields: [serviceSystems.createdBy],
    references: [users.id],
    relationName: "serviceSystemCreatedBy",
  }),
  updatedByUser: one(users, {
    fields: [serviceSystems.updatedBy],
    references: [users.id],
    relationName: "serviceSystemUpdatedBy",
  }),
}));

export type ServiceSystem = typeof serviceSystems.$inferSelect;
export type NewServiceSystem = typeof serviceSystems.$inferInsert;

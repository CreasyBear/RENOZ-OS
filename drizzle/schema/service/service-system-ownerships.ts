/**
 * Service System Ownerships Schema
 *
 * Ownership history for service systems.
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  auditColumns,
  standardRlsPolicies,
  timestampColumns,
} from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { users } from "../users/users";
import { serviceOwners } from "./service-owners";
import { serviceSystems } from "./service-systems";

export const serviceSystemOwnerships = pgTable(
  "service_system_ownerships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    serviceSystemId: uuid("service_system_id")
      .notNull()
      .references(() => serviceSystems.id, { onDelete: "cascade" }),
    serviceOwnerId: uuid("service_owner_id")
      .notNull()
      .references(() => serviceOwners.id, { onDelete: "restrict" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    transferReason: text("transfer_reason"),
    notes: text("notes"),
    ...auditColumns,
    ...timestampColumns,
  },
  (table) => ({
    orgIdx: index("idx_service_system_ownerships_org").on(table.organizationId),
    systemIdx: index("idx_service_system_ownerships_system").on(table.serviceSystemId),
    ownerIdx: index("idx_service_system_ownerships_owner").on(table.serviceOwnerId),
    currentOwnershipUnique: uniqueIndex("idx_service_system_ownerships_current_unique")
      .on(table.serviceSystemId)
      .where(sql`${table.endedAt} IS NULL`),
    ...standardRlsPolicies("service_system_ownerships"),
  })
);

export const serviceSystemOwnershipsRelations = relations(
  serviceSystemOwnerships,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [serviceSystemOwnerships.organizationId],
      references: [organizations.id],
    }),
    serviceSystem: one(serviceSystems, {
      fields: [serviceSystemOwnerships.serviceSystemId],
      references: [serviceSystems.id],
    }),
    serviceOwner: one(serviceOwners, {
      fields: [serviceSystemOwnerships.serviceOwnerId],
      references: [serviceOwners.id],
    }),
    createdByUser: one(users, {
      fields: [serviceSystemOwnerships.createdBy],
      references: [users.id],
      relationName: "serviceSystemOwnershipCreatedBy",
    }),
    updatedByUser: one(users, {
      fields: [serviceSystemOwnerships.updatedBy],
      references: [users.id],
      relationName: "serviceSystemOwnershipUpdatedBy",
    }),
  })
);

export type ServiceSystemOwnership = typeof serviceSystemOwnerships.$inferSelect;
export type NewServiceSystemOwnership = typeof serviceSystemOwnerships.$inferInsert;

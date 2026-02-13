/**
 * Job Material Reservations Schema
 *
 * Links job materials to inventory reservations (pick before install).
 * PHASE12-007: Enables inventory reservation workflow for job BOM items.
 *
 * @see PHASE12-007-JOB-MATERIALS-SCHEMA-DESIGN.md
 */

import {
  pgTable,
  uuid,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { timestampColumns, standardRlsPolicies } from "../_shared/patterns";
import { jobMaterialReservationStatusEnum } from "../_shared/enums";
import { organizations } from "../settings/organizations";
import { jobMaterials } from "./job-materials";
import { inventory } from "../inventory/inventory";

export const jobMaterialReservations = pgTable(
  "job_material_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    jobMaterialId: uuid("job_material_id")
      .notNull()
      .references(() => jobMaterials.id, { onDelete: "cascade" }),

    inventoryId: uuid("inventory_id")
      .notNull()
      .references(() => inventory.id, { onDelete: "restrict" }),

    quantityReserved: integer("quantity_reserved").notNull(),

    status: jobMaterialReservationStatusEnum("status")
      .notNull()
      .default("pending"),

    expiresAt: timestamp("expires_at", { withTimezone: true }),

    ...timestampColumns,
  },
  (table) => ({
    orgJobMaterialIdx: index("idx_job_material_reservations_org_job_material").on(
      table.organizationId,
      table.jobMaterialId
    ),
    orgInventoryIdx: index("idx_job_material_reservations_org_inventory").on(
      table.organizationId,
      table.inventoryId
    ),
    statusIdx: index("idx_job_material_reservations_status").on(table.status),
    ...standardRlsPolicies("job_material_reservations"),
  })
);

export const jobMaterialReservationsRelations = relations(
  jobMaterialReservations,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [jobMaterialReservations.organizationId],
      references: [organizations.id],
    }),
    jobMaterial: one(jobMaterials, {
      fields: [jobMaterialReservations.jobMaterialId],
      references: [jobMaterials.id],
    }),
    inventory: one(inventory, {
      fields: [jobMaterialReservations.inventoryId],
      references: [inventory.id],
    }),
  })
);

export type JobMaterialReservation =
  typeof jobMaterialReservations.$inferSelect;
export type NewJobMaterialReservation =
  typeof jobMaterialReservations.$inferInsert;

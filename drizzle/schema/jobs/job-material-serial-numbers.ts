/**
 * Job Material Serial Numbers Schema
 *
 * One row per serial number for traceability and warranty linkage.
 * PHASE12-007: Replaces denormalized job_materials.serialNumbers JSONB.
 *
 * @see PHASE12-007-JOB-MATERIALS-SCHEMA-DESIGN.md
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { timestampColumns, standardRlsPolicies } from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { jobMaterials } from "./job-materials";
import { products } from "../products/products";

export const jobMaterialSerialNumbers = pgTable(
  "job_material_serial_numbers",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    jobMaterialId: uuid("job_material_id")
      .notNull()
      .references(() => jobMaterials.id, { onDelete: "cascade" }),

    serialNumber: text("serial_number").notNull(),

    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),

    installedAt: timestamp("installed_at", { withTimezone: true }),

    ...timestampColumns,
  },
  (table) => ({
    orgJobMaterialIdx: index(
      "idx_job_material_serial_numbers_org_job_material"
    ).on(table.organizationId, table.jobMaterialId),
    orgSerialIdx: uniqueIndex(
      "idx_job_material_serial_numbers_org_serial"
    ).on(table.organizationId, table.serialNumber),
    ...standardRlsPolicies("job_material_serial_numbers"),
  })
);

export const jobMaterialSerialNumbersRelations = relations(
  jobMaterialSerialNumbers,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [jobMaterialSerialNumbers.organizationId],
      references: [organizations.id],
    }),
    jobMaterial: one(jobMaterials, {
      fields: [jobMaterialSerialNumbers.jobMaterialId],
      references: [jobMaterials.id],
    }),
    product: one(products, {
      fields: [jobMaterialSerialNumbers.productId],
      references: [products.id],
    }),
  })
);

export type JobMaterialSerialNumber =
  typeof jobMaterialSerialNumbers.$inferSelect;
export type NewJobMaterialSerialNumber =
  typeof jobMaterialSerialNumbers.$inferInsert;

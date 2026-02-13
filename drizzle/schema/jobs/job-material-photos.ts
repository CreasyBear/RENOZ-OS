/**
 * Job Material Photos Schema
 *
 * Links photos to job materials (evidence, compliance).
 * PHASE12-007: Replaces denormalized job_materials.photos JSONB.
 *
 * @see PHASE12-007-JOB-MATERIALS-SCHEMA-DESIGN.md
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { timestampColumns, standardRlsPolicies } from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { jobMaterials } from "./job-materials";

export const jobMaterialPhotos = pgTable(
  "job_material_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    jobMaterialId: uuid("job_material_id")
      .notNull()
      .references(() => jobMaterials.id, { onDelete: "cascade" }),

    storagePath: text("storage_path").notNull(),

    caption: text("caption"),

    takenAt: timestamp("taken_at", { withTimezone: true }),

    ...timestampColumns,
  },
  (table) => ({
    orgJobMaterialIdx: index("idx_job_material_photos_org_job_material").on(
      table.organizationId,
      table.jobMaterialId
    ),
    ...standardRlsPolicies("job_material_photos"),
  })
);

export const jobMaterialPhotosRelations = relations(
  jobMaterialPhotos,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [jobMaterialPhotos.organizationId],
      references: [organizations.id],
    }),
    jobMaterial: one(jobMaterials, {
      fields: [jobMaterialPhotos.jobMaterialId],
      references: [jobMaterials.id],
    }),
  })
);

export type JobMaterialPhoto = typeof jobMaterialPhotos.$inferSelect;
export type NewJobMaterialPhoto = typeof jobMaterialPhotos.$inferInsert;

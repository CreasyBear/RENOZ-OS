/**
 * Job Assignments Schema
 *
 * Field work assignments for battery installations and service jobs.
 * Jobs are assigned to technicians (installers) from orders.
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json
 * @see _Initiation/_prd/archive/_audits/jobs-audit.json for v2 reference
 */

import {
  pgTable,
  uuid,
  text,
  date,
  time,
  integer,
  jsonb,
  index,
  pgEnum,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  timestampColumns,
  auditColumns,
} from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { users } from "../users/users";
import { orders } from "../orders/orders";
import { customers } from "../customers/customers";
import { slaTracking } from "../support/sla-tracking";
import { projects } from "./projects";

// ============================================================================
// ENUMS
// ============================================================================

export const jobAssignmentStatusEnum = pgEnum("job_assignment_status", [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
  "on_hold",
]);

export const jobAssignmentTypeEnum = pgEnum("job_assignment_type", [
  "installation",
  "service",
  "warranty",
  "inspection",
  "commissioning",
]);

export const jobPhotoTypeEnum = pgEnum("job_photo_type", [
  "before",
  "during",
  "after",
  "issue",
  "signature",
]);

// ============================================================================
// INTERFACES
// ============================================================================

export interface JobLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: string;
}

export interface JobAssignmentMetadata {
  /** Installation notes */
  notes?: string;
  /** Weather conditions at job site */
  weatherConditions?: string;
  /** Access instructions */
  accessInstructions?: string;
  /** Equipment needed */
  equipmentRequired?: string[];
  /** Allow additional properties */
  [key: string]: string | string[] | undefined;
}

// ============================================================================
// JOB ASSIGNMENTS TABLE
// ============================================================================

export const jobAssignments = pgTable(
  "job_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Link to order (optional - some jobs may not be from orders)
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),

    // Link to customer (required for job location)
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),

    // Assigned technician/installer
    installerId: uuid("installer_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    // Job type
    jobType: jobAssignmentTypeEnum("job_type").notNull().default("installation"),

    // Job identification
    jobNumber: text("job_number").notNull(),
    title: text("title").notNull(),
    description: text("description"),

    // Scheduling
    scheduledDate: date("scheduled_date").notNull(),
    scheduledTime: time("scheduled_time"),
    estimatedDuration: integer("estimated_duration"), // minutes

    // Status
    status: jobAssignmentStatusEnum("status").notNull().default("scheduled"),

    // Timing
    startedAt: text("started_at"), // Using text for timestamptz flexibility
    completedAt: text("completed_at"),

    // Location tracking
    startLocation: jsonb("start_location").$type<JobLocation>(),
    completeLocation: jsonb("complete_location").$type<JobLocation>(),

    // Sign-off
    signatureUrl: text("signature_url"),
    signedByName: text("signed_by_name"),
    signOffToken: text("sign_off_token"),
    signOffTokenExpiresAt: text("sign_off_token_expires_at"),

    // Customer confirmation
    confirmationStatus: text("confirmation_status"), // pending, confirmed, disputed
    confirmationToken: text("confirmation_token"),

    // Internal notes
    internalNotes: text("internal_notes"),

    // Metadata
    metadata: jsonb("metadata").$type<JobAssignmentMetadata>().default({}),

    // Optional SLA tracking (set when job created from template with SLA config)
    slaTrackingId: uuid("sla_tracking_id").references(() => slaTracking.id, {
      onDelete: "set null",
    }),

    // SPRINT-03: Migration tracking
    migratedToProjectId: uuid("migrated_to_project_id").references(() => projects.id, {
      onDelete: "set null",
    }),

    // Optimistic locking
    version: integer("version").notNull().default(1),

    // Standard columns
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    // Multi-tenant queries
    orgStatusIdx: index("idx_job_assignments_org_status").on(
      table.organizationId,
      table.status
    ),
    orgInstallerIdx: index("idx_job_assignments_org_installer").on(
      table.organizationId,
      table.installerId
    ),
    orgScheduledIdx: index("idx_job_assignments_org_scheduled").on(
      table.organizationId,
      table.scheduledDate
    ),
    orgCustomerIdx: index("idx_job_assignments_org_customer").on(
      table.organizationId,
      table.customerId
    ),

    // Common queries
    installerDateIdx: index("idx_job_assignments_installer_date").on(
      table.installerId,
      table.scheduledDate
    ),
    orderIdx: index("idx_job_assignments_order").on(table.orderId),
    // Portal RLS (customer + subcontractor scope)
    portalSelectPolicy: pgPolicy("job_assignments_portal_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`(
        ${table.organizationId} = (SELECT current_setting('app.organization_id', true)::uuid)
        OR EXISTS (
          SELECT 1 FROM portal_identities pi
          WHERE pi.auth_user_id = auth.uid()
            AND pi.status = 'active'
            AND pi.organization_id = ${table.organizationId}
            AND pi.scope = 'customer'
            AND pi.customer_id = ${table.customerId}
        )
        OR EXISTS (
          SELECT 1 FROM portal_identities pi
          WHERE pi.auth_user_id = auth.uid()
            AND pi.status = 'active'
            AND pi.organization_id = ${table.organizationId}
            AND pi.scope = 'subcontractor'
            AND pi.job_assignment_id = ${table.id}
        )
      )`,
    }),
  })
);

// ============================================================================
// JOB PHOTOS TABLE
// ============================================================================

export const jobPhotos = pgTable(
  "job_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Link to job assignment
    jobAssignmentId: uuid("job_assignment_id")
      .notNull()
      .references(() => jobAssignments.id, { onDelete: "cascade" }),

    // Photo details
    type: jobPhotoTypeEnum("type").notNull(),
    photoUrl: text("photo_url").notNull(),
    caption: text("caption"),

    // Location where photo was taken
    location: jsonb("location").$type<JobLocation>(),

    // Standard columns
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    jobIdx: index("idx_job_photos_job").on(table.jobAssignmentId),
    orgJobIdx: index("idx_job_photos_org_job").on(
      table.organizationId,
      table.jobAssignmentId
    ),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const jobAssignmentsRelations = relations(jobAssignments, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [jobAssignments.organizationId],
    references: [organizations.id],
  }),
  order: one(orders, {
    fields: [jobAssignments.orderId],
    references: [orders.id],
  }),
  customer: one(customers, {
    fields: [jobAssignments.customerId],
    references: [customers.id],
  }),
  installer: one(users, {
    fields: [jobAssignments.installerId],
    references: [users.id],
  }),
  slaTrackingRecord: one(slaTracking, {
    fields: [jobAssignments.slaTrackingId],
    references: [slaTracking.id],
  }),
  photos: many(jobPhotos),
}));

export const jobPhotosRelations = relations(jobPhotos, ({ one }) => ({
  organization: one(organizations, {
    fields: [jobPhotos.organizationId],
    references: [organizations.id],
  }),
  jobAssignment: one(jobAssignments, {
    fields: [jobPhotos.jobAssignmentId],
    references: [jobAssignments.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type JobAssignment = typeof jobAssignments.$inferSelect;
export type NewJobAssignment = typeof jobAssignments.$inferInsert;
export type JobPhoto = typeof jobPhotos.$inferSelect;
export type NewJobPhoto = typeof jobPhotos.$inferInsert;

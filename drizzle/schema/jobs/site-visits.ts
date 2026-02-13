/**
 * Site Visits Schema
 * 
 * Scheduled site visits/appointments for project work.
 * A site visit represents a single scheduled instance of work at the project site.
 * Tasks and time entries are linked to site visits.
 * 
 * @see _Initiation/_prd/sprints/sprint-03-jobs-domain-restructure.prd.json
 */

import {
  pgTable,
  uuid,
  text,
  varchar,
  date,
  time,
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  timestampColumns,
  auditColumns,
  standardRlsPolicies,
} from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { users } from "../users/users";
import { projects } from "./projects";
import { jobTasks } from "./job-tasks";
// Note: SLA tracking will be added when support module is ready
// import { slaTracking } from "../support/sla-tracking";

// ============================================================================
// ENUMS
// ============================================================================

export const siteVisitStatusEnum = pgEnum("site_visit_status", [
  "scheduled",      // Planned but not started
  "in_progress",    // Installer checked in
  "completed",      // Work done, signed off
  "cancelled",      // Cancelled before completion
  "no_show",        // Installer didn't show
  "rescheduled",    // Moved to different date
]);

export const siteVisitTypeEnum = pgEnum("site_visit_type", [
  "assessment",       // Site assessment/quote
  "installation",     // Main installation work
  "commissioning",    // System commissioning
  "service",          // General service call
  "warranty",         // Warranty repair
  "inspection",       // Quality/safety inspection
  "maintenance",      // Scheduled maintenance
]);

// ============================================================================
// INTERFACES
// ============================================================================

export interface VisitLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: string;
  address?: string;
}

export interface SiteVisitMetadata {
  /** Weather conditions during visit */
  weatherConditions?: string;
  /** Access issues or notes */
  accessNotes?: string;
  /** Safety incidents */
  safetyIncidents?: string[];
  /** Equipment used on site */
  equipmentUsed?: string[];
  /** Custom check-in/check-out data */
  checkInMethod?: "manual" | "geofence" | "qr_code" | "nfc";
  checkOutMethod?: "manual" | "geofence" | "qr_code" | "nfc";
  /** Customer satisfaction (1-5) */
  customerSatisfaction?: number;
  /** Additional custom fields - use explicit types, not unknown */
  customFields?: Record<string, string | number | boolean | null>;
}

// ============================================================================
// SITE VISITS TABLE
// ============================================================================

export const siteVisits = pgTable(
  "site_visits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Link to parent project
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    // Visit identification
    visitNumber: varchar("visit_number", { length: 50 }).notNull(),
    visitType: siteVisitTypeEnum("visit_type").notNull().default("installation"),
    status: siteVisitStatusEnum("status").notNull().default("scheduled"),

    // Scheduling
    scheduledDate: date("scheduled_date").notNull(),
    scheduledTime: time("scheduled_time"),
    estimatedDuration: integer("estimated_duration"), // minutes

    // Actual timing
    actualStartTime: text("actual_start_time"), // ISO timestamp
    actualEndTime: text("actual_end_time"),

    // Assigned installer/technician
    installerId: uuid("installer_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    // Location tracking
    startLocation: jsonb("start_location").$type<VisitLocation>(),
    completeLocation: jsonb("complete_location").$type<VisitLocation>(),

    // Notes
    notes: text("notes"),              // Customer-facing notes
    internalNotes: text("internal_notes"), // Internal-only notes

    // Sign-off
    signatureUrl: text("signature_url"),
    signedByName: text("signed_by_name"),
    signOffToken: text("sign_off_token"),
    signOffTokenExpiresAt: text("sign_off_token_expires_at"),

    // Customer confirmation
    confirmationStatus: varchar("confirmation_status", { length: 50 }), // pending, confirmed, disputed
    confirmationToken: text("confirmation_token"),
    confirmedAt: text("confirmed_at"),

    // Customer sign-off (checkbox confirmation for completion)
    customerSignOffName: text("customer_sign_off_name"),
    customerSignOffDate: date("customer_sign_off_date"),
    customerSignOffConfirmed: boolean("customer_sign_off_confirmed").default(false),
    customerRating: integer("customer_rating"), // 1-5 stars
    customerFeedback: text("customer_feedback"),

    // SLA tracking (to be added when support module is ready)
    // slaTrackingId: uuid("sla_tracking_id").references(() => slaTracking.id, {
    //   onDelete: "set null",
    // }),

    // Metadata
    metadata: jsonb("metadata").$type<SiteVisitMetadata>().default({}),

    // Optimistic locking
    version: integer("version").notNull().default(1),

    // Standard columns
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    // Multi-tenant queries
    orgStatusIdx: index("idx_site_visits_org_status").on(
      table.organizationId,
      table.status
    ),
    orgProjectIdx: index("idx_site_visits_org_project").on(
      table.organizationId,
      table.projectId
    ),

    // Scheduling queries (most common)
    installerDateIdx: index("idx_site_visits_installer_date").on(
      table.installerId,
      table.scheduledDate
    ),
    orgDateIdx: index("idx_site_visits_org_date").on(
      table.organizationId,
      table.scheduledDate
    ),

    // Project visit number uniqueness
    projectVisitNumberIdx: uniqueIndex("idx_site_visits_project_number").on(
      table.projectId,
      table.visitNumber
    ),

    // RLS policies
    ...standardRlsPolicies("site_visits"),
  })
);

// ============================================================================
// SITE VISIT PHOTOS TABLE
// ============================================================================

export const siteVisitPhotoTypeEnum = pgEnum("site_visit_photo_type", [
  "before",
  "during",
  "after",
  "issue",
  "signature",
  "receipt",
  "document",
]);

export const siteVisitPhotos = pgTable(
  "site_visit_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Link to site visit
    siteVisitId: uuid("site_visit_id")
      .notNull()
      .references(() => siteVisits.id, { onDelete: "cascade" }),

    // Also link to project for easier querying
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    // Photo details
    type: siteVisitPhotoTypeEnum("type").notNull(),
    photoUrl: text("photo_url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    caption: text("caption"),

    // Location where photo was taken
    location: jsonb("location").$type<VisitLocation>(),

    // Standard columns
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    siteVisitIdx: index("idx_site_visit_photos_visit").on(table.siteVisitId),
    projectIdx: index("idx_site_visit_photos_project").on(table.projectId),
    orgVisitIdx: index("idx_site_visit_photos_org_visit").on(
      table.organizationId,
      table.siteVisitId
    ),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const siteVisitsRelations = relations(siteVisits, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [siteVisits.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [siteVisits.projectId],
    references: [projects.id],
  }),
  installer: one(users, {
    fields: [siteVisits.installerId],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [siteVisits.createdBy],
    references: [users.id],
  }),
  // slaTrackingRecord: one(slaTracking, {
  //   fields: [siteVisits.slaTrackingId],
  //   references: [slaTracking.id],
  // }),
  // One-to-many relations
  photos: many(siteVisitPhotos),
  tasks: many(jobTasks),
  // timeEntries: many(jobTimeEntries), // Will be defined in job-time-entries.ts
}));

export const siteVisitPhotosRelations = relations(siteVisitPhotos, ({ one }) => ({
  organization: one(organizations, {
    fields: [siteVisitPhotos.organizationId],
    references: [organizations.id],
  }),
  siteVisit: one(siteVisits, {
    fields: [siteVisitPhotos.siteVisitId],
    references: [siteVisits.id],
  }),
  project: one(projects, {
    fields: [siteVisitPhotos.projectId],
    references: [projects.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type SiteVisit = typeof siteVisits.$inferSelect;
export type NewSiteVisit = typeof siteVisits.$inferInsert;
export type SiteVisitStatus = (typeof siteVisitStatusEnum.enumValues)[number];
export type SiteVisitType = (typeof siteVisitTypeEnum.enumValues)[number];
export type SiteVisitPhoto = typeof siteVisitPhotos.$inferSelect;
export type NewSiteVisitPhoto = typeof siteVisitPhotos.$inferInsert;
export type SiteVisitPhotoType = (typeof siteVisitPhotoTypeEnum.enumValues)[number];

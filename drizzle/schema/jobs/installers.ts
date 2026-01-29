/**
 * Installer Management Schema
 *
 * Comprehensive installer profiles extending users with:
 * - Certifications (licenses, accreditations)
 * - Skills (solar, battery, electrical, roof work)
 * - Territories (service areas by postcode)
 * - Availability (working hours, blockout dates)
 * - Performance metrics
 *
 * @see _Initiation/_prd/sprints/sprint-03-jobs-domain-restructure.prd.json
 */

import {
  pgTable,
  uuid,
  text,
  varchar,
  date,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { timestampColumns, auditColumns } from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { users } from "../users/users";
// Relations will be added when all schemas are in place
// import { projects } from "./projects";
// import { siteVisits } from "./site-visits";

// ============================================================================
// ENUMS
// ============================================================================

export const installerStatusEnum = pgEnum("installer_status", [
  "active",      // Fully available for assignments
  "busy",        // At capacity
  "away",        // Extended leave
  "suspended",   // Temporarily suspended
  "inactive",    // No longer working
]);

export const certificationTypeEnum = pgEnum("certification_type", [
  "solar_accredited",      // CEC solar accreditation
  "electrical_license",    // Licensed electrician
  "battery_certified",     // Battery installation certified
  "roofing_certified",     // Roof work certification
  "first_aid",            // First aid certificate
  "working_at_heights",   // Working at heights
]);

export const installerSkillEnum = pgEnum("installer_skill", [
  "solar_panels",      // Solar panel installation
  "battery_systems",   // Battery installation
  "electrical_work",   // Electrical wiring/inverters
  "roof_work",         // Roof mounting/prep
  "conduit_install",   // Conduit/cabling
  "commissioning",     // System commissioning
  "diagnostics",       // Troubleshooting
  "customer_training", // Customer handover/training
]);

export const vehicleTypeEnum = pgEnum("vehicle_type", [
  "none",
  "ute",
  "van",
  "truck",
  "trailer",
]);

// ============================================================================
// INTERFACES
// ============================================================================

export interface WorkingHours {
  monday: { start: string; end: string; working: boolean };
  tuesday: { start: string; end: string; working: boolean };
  wednesday: { start: string; end: string; working: boolean };
  thursday: { start: string; end: string; working: boolean };
  friday: { start: string; end: string; working: boolean };
  saturday: { start: string; end: string; working: boolean };
  sunday: { start: string; end: string; working: boolean };
}

// ============================================================================
// INSTALLER PROFILES TABLE
// ============================================================================

export const installerProfiles = pgTable(
  "installer_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Link to user
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Profile status
    status: installerStatusEnum("status").notNull().default("active"),

    // Extended profile
    yearsExperience: integer("years_experience").default(0),
    vehicleType: vehicleTypeEnum("vehicle_type").default("none"),
    vehicleReg: varchar("vehicle_reg", { length: 50 }),
    equipment: jsonb("equipment").$type<string[]>().default([]),

    // Working capacity
    maxJobsPerDay: integer("max_jobs_per_day").notNull().default(2),
    maxTravelKm: integer("max_travel_km"), // null = unlimited

    // Working hours (stored as JSON for flexibility)
    workingHours: jsonb("working_hours").$type<WorkingHours>().default({
      monday: { start: "08:00", end: "17:00", working: true },
      tuesday: { start: "08:00", end: "17:00", working: true },
      wednesday: { start: "08:00", end: "17:00", working: true },
      thursday: { start: "08:00", end: "17:00", working: true },
      friday: { start: "08:00", end: "17:00", working: true },
      saturday: { start: "08:00", end: "12:00", working: false },
      sunday: { start: "08:00", end: "12:00", working: false },
    }),

    // Emergency contact
    emergencyContactName: varchar("emergency_contact_name", { length: 255 }),
    emergencyContactPhone: varchar("emergency_contact_phone", { length: 50 }),
    emergencyContactRelationship: varchar("emergency_contact_relationship", { length: 100 }),

    // Preferences
    notes: text("notes"),

    // Versioning
    version: integer("version").notNull().default(1),

    // Standard columns
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    orgUserIdx: uniqueIndex("idx_installer_profiles_org_user").on(
      table.organizationId,
      table.userId
    ),
    orgStatusIdx: index("idx_installer_profiles_org_status").on(
      table.organizationId,
      table.status
    ),
    userIdx: uniqueIndex("idx_installer_profiles_user").on(table.userId),

    // RLS policies
    selectPolicy: pgPolicy("installer_profiles_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("installer_profiles_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("installer_profiles_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("installer_profiles_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// INSTALLER CERTIFICATIONS TABLE
// ============================================================================

export const installerCertifications = pgTable(
  "installer_certifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    installerId: uuid("installer_id")
      .notNull()
      .references(() => installerProfiles.id, { onDelete: "cascade" }),

    // Certification details
    certificationType: certificationTypeEnum("certification_type").notNull(),
    licenseNumber: varchar("license_number", { length: 255 }),
    issuingAuthority: varchar("issuing_authority", { length: 255 }),

    // Dates
    issueDate: date("issue_date"),
    expiryDate: date("expiry_date"),

    // Verification
    isVerified: boolean("is_verified").default(false),
    verifiedBy: uuid("verified_by").references(() => users.id),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),

    // Document
    documentUrl: text("document_url"),

    // Standard columns
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    installerIdx: index("idx_installer_certifications_installer").on(table.installerId),
    orgInstallerIdx: index("idx_installer_certifications_org_installer").on(
      table.organizationId,
      table.installerId
    ),
    typeIdx: index("idx_installer_certifications_type").on(table.certificationType),
    expiryIdx: index("idx_installer_certifications_expiry").on(table.expiryDate),
  })
);

// ============================================================================
// INSTALLER SKILLS TABLE
// ============================================================================

export const installerSkills = pgTable(
  "installer_skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    installerId: uuid("installer_id")
      .notNull()
      .references(() => installerProfiles.id, { onDelete: "cascade" }),

    // Skill details
    skill: installerSkillEnum("skill").notNull(),
    proficiencyLevel: integer("proficiency_level").notNull().default(3), // 1-5

    // Experience
    yearsExperience: integer("years_experience").default(0),
    projectsCompleted: integer("projects_completed").default(0),

    // Verification
    isVerified: boolean("is_verified").default(false),

    // Standard columns
    ...timestampColumns,
  },
  (table) => ({
    installerSkillIdx: uniqueIndex("idx_installer_skills_installer_skill").on(
      table.installerId,
      table.skill
    ),
    orgInstallerIdx: index("idx_installer_skills_org_installer").on(
      table.organizationId,
      table.installerId
    ),
  })
);

// ============================================================================
// INSTALLER TERRITORIES TABLE
// ============================================================================

export const installerTerritories = pgTable(
  "installer_territories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    installerId: uuid("installer_id")
      .notNull()
      .references(() => installerProfiles.id, { onDelete: "cascade" }),

    // Territory definition
    postcode: varchar("postcode", { length: 20 }).notNull(),
    suburb: varchar("suburb", { length: 255 }),
    state: varchar("state", { length: 50 }),

    // Priority (higher = preferred)
    priority: integer("priority").default(1),

    // Standard columns
    ...timestampColumns,
  },
  (table) => ({
    installerPostcodeIdx: uniqueIndex("idx_installer_territories_installer_postcode").on(
      table.installerId,
      table.postcode
    ),
    postcodeIdx: index("idx_installer_territories_postcode").on(table.postcode),
    orgPostcodeIdx: index("idx_installer_territories_org_postcode").on(
      table.organizationId,
      table.postcode
    ),
  })
);

// ============================================================================
// INSTALLER BLOCKOUT DATES TABLE
// ============================================================================

export const installerBlockouts = pgTable(
  "installer_blockouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    installerId: uuid("installer_id")
      .notNull()
      .references(() => installerProfiles.id, { onDelete: "cascade" }),

    // Blockout period
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),

    // Reason
    reason: varchar("reason", { length: 255 }),
    blockoutType: varchar("blockout_type", { length: 50 }), // vacation, sick, training, other

    // Standard columns
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    installerDateIdx: index("idx_installer_blockouts_installer_date").on(
      table.installerId,
      table.startDate
    ),
    orgInstallerIdx: index("idx_installer_blockouts_org_installer").on(
      table.organizationId,
      table.installerId
    ),
  })
);

// ============================================================================
// INSTALLER PERFORMANCE VIEW
// ============================================================================

// This would be a database view, but we define the type here
export interface InstallerPerformance {
  installerId: string;
  userId: string;
  name: string;
  
  // Job metrics
  totalJobsCompleted: number;
  jobsThisMonth: number;
  jobsThisWeek: number;
  
  // Time metrics
  avgJobDuration: number; // hours
  totalHoursWorked: number;
  
  // Quality metrics
  onTimeCompletionRate: number; // percentage
  customerRating: number; // 1-5 average
  reworkRate: number; // percentage
  
  // Current workload
  activeProjects: number;
  upcomingVisits: number;
  capacityUsed: number; // percentage
}

// ============================================================================
// RELATIONS
// ============================================================================

export const installerProfilesRelations = relations(installerProfiles, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [installerProfiles.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [installerProfiles.userId],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [installerProfiles.createdBy],
    references: [users.id],
  }),
  // One-to-many relations
  certifications: many(installerCertifications),
  skills: many(installerSkills),
  territories: many(installerTerritories),
  blockouts: many(installerBlockouts),
  // siteVisits: many(siteVisits), // Will be added when site_visits schema has installer link
}));

export const installerCertificationsRelations = relations(installerCertifications, ({ one }) => ({
  installer: one(installerProfiles, {
    fields: [installerCertifications.installerId],
    references: [installerProfiles.id],
  }),
  verifiedByUser: one(users, {
    fields: [installerCertifications.verifiedBy],
    references: [users.id],
  }),
}));

export const installerSkillsRelations = relations(installerSkills, ({ one }) => ({
  installer: one(installerProfiles, {
    fields: [installerSkills.installerId],
    references: [installerProfiles.id],
  }),
}));

export const installerTerritoriesRelations = relations(installerTerritories, ({ one }) => ({
  installer: one(installerProfiles, {
    fields: [installerTerritories.installerId],
    references: [installerProfiles.id],
  }),
}));

export const installerBlockoutsRelations = relations(installerBlockouts, ({ one }) => ({
  installer: one(installerProfiles, {
    fields: [installerBlockouts.installerId],
    references: [installerProfiles.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type InstallerProfile = typeof installerProfiles.$inferSelect;
export type NewInstallerProfile = typeof installerProfiles.$inferInsert;
export type InstallerStatus = (typeof installerStatusEnum.enumValues)[number];

export type InstallerCertification = typeof installerCertifications.$inferSelect;
export type NewInstallerCertification = typeof installerCertifications.$inferInsert;
export type CertificationType = (typeof certificationTypeEnum.enumValues)[number];

export type InstallerSkill = typeof installerSkills.$inferSelect;
export type NewInstallerSkill = typeof installerSkills.$inferInsert;
export type InstallerSkillType = (typeof installerSkillEnum.enumValues)[number];

export type InstallerTerritory = typeof installerTerritories.$inferSelect;
export type NewInstallerTerritory = typeof installerTerritories.$inferInsert;

export type InstallerBlockout = typeof installerBlockouts.$inferSelect;
export type NewInstallerBlockout = typeof installerBlockouts.$inferInsert;

export type VehicleType = (typeof vehicleTypeEnum.enumValues)[number];

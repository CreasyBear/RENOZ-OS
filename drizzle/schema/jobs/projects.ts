/**
 * Projects Schema v2
 * 
 * Incorporates learnings from project-dashboard reference:
 * - Project overview with scope, outcomes, key features
 * - Workstreams (task groups) for organizing work
 * - Rich notes with audio transcripts
 * - Project files linking
 * 
 * @see _Initiation/_prd/sprints/sprint-03-ui-spec-projects.md
 */

import {
  pgTable,
  uuid,
  text,
  varchar,
  date,
  decimal,
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
import { customers } from "../customers/customers";
import { orders } from "../orders/orders";
import { users } from "../users/users";
// import { files } from "../files/files"; // Files schema not yet implemented
import { projectBom } from "./project-bom";

// ============================================================================
// ENUMS
// ============================================================================

export const projectStatusEnum = pgEnum("project_status", [
  "quoting",
  "approved",
  "in_progress",
  "completed",
  "cancelled",
  "on_hold",
]);

export const projectTypeEnum = pgEnum("project_type", [
  "solar",
  "battery",
  "solar_battery",
  "service",
  "warranty",
  "inspection",
  "commissioning",
]);

export const projectPriorityEnum = pgEnum("project_priority", [
  "urgent",
  "high",
  "medium",
  "low",
]);

// ============================================================================
// INTERFACES
// ============================================================================

export interface SiteAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface ProjectScope {
  inScope: string[];
  outOfScope: string[];
}

export interface ProjectKeyFeatures {
  p0: string[]; // Must have
  p1: string[]; // Should have
  p2: string[]; // Nice to have
}

export interface ProjectMetadata {
  salesRepId?: string;
  quoteNumber?: string;
  contractSignedDate?: string;
  estimatedSavings?: {
    annualKwh: number;
    annualCostSavings: number;
    paybackPeriodYears: number;
  };
  systemSpecs?: {
    panelCount?: number;
    panelCapacityW?: number;
    batteryCapacityKwh?: number;
    inverterCapacityKw?: number;
  };
  [key: string]: unknown;
}

// ============================================================================
// PROJECTS TABLE
// ============================================================================

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Project identification
    projectNumber: varchar("project_number", { length: 50 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),

    // Classification
    projectType: projectTypeEnum("project_type").notNull().default("solar_battery"),
    status: projectStatusEnum("status").notNull().default("quoting"),
    priority: projectPriorityEnum("priority").notNull().default("medium"),

    // Relationships
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),

    // Site address
    siteAddress: jsonb("site_address").$type<SiteAddress>().notNull(),

    // Overview content (reference pattern: scope, outcomes, features)
    scope: jsonb("scope").$type<ProjectScope>().default({ inScope: [], outOfScope: [] }),
    outcomes: jsonb("outcomes").$type<string[]>().default([]),
    keyFeatures: jsonb("key_features").$type<ProjectKeyFeatures>().default({ p0: [], p1: [], p2: [] }),

    // Timeline
    startDate: date("start_date"),
    targetCompletionDate: date("target_completion_date"),
    actualCompletionDate: date("actual_completion_date"),

    // Progress tracking
    progressPercent: integer("progress_percent").notNull().default(0),

    // Financial
    estimatedTotalValue: decimal("estimated_total_value", { precision: 12, scale: 2 }),
    actualTotalCost: decimal("actual_total_cost", { precision: 12, scale: 2 }),

    // Metadata
    metadata: jsonb("metadata").$type<ProjectMetadata>().default({}),

    // Completion tracking
    customerSatisfactionRating: integer("customer_satisfaction_rating"), // 1-5 stars
    customerFeedback: text("customer_feedback"),
    handoverPackUrl: text("handover_pack_url"), // URL to generated handover document

    // Versioning
    version: integer("version").notNull().default(1),

    // Standard columns
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    orgStatusIdx: index("idx_projects_org_status").on(
      table.organizationId,
      table.status
    ),
    orgCustomerIdx: index("idx_projects_org_customer").on(
      table.organizationId,
      table.customerId
    ),
    orgTypeIdx: index("idx_projects_org_type").on(
      table.organizationId,
      table.projectType
    ),
    orgPriorityIdx: index("idx_projects_org_priority").on(
      table.organizationId,
      table.priority
    ),
    projectNumberIdx: uniqueIndex("idx_projects_org_number").on(
      table.organizationId,
      table.projectNumber
    ),
    orgCreatedIdx: index("idx_projects_org_created").on(
      table.organizationId,
      table.createdAt.desc()
    ),

    // RLS policies
    selectPolicy: pgPolicy("projects_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("projects_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("projects_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("projects_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// PROJECT MEMBERS TABLE
// ============================================================================

export const projectMembers = pgTable(
  "project_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 50 }).notNull().default("member"), // owner, manager, member
    ...timestampColumns,
  },
  (table) => ({
    projectUserIdx: uniqueIndex("idx_project_members_project_user").on(
      table.projectId,
      table.userId
    ),
    orgProjectIdx: index("idx_project_members_org_project").on(
      table.organizationId,
      table.projectId
    ),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  customer: one(customers, {
    fields: [projects.customerId],
    references: [customers.id],
  }),
  order: one(orders, {
    fields: [projects.orderId],
    references: [orders.id],
  }),
  createdByUser: one(users, {
    fields: [projects.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [projects.updatedBy],
    references: [users.id],
  }),
  // One-to-many relations
  members: many(projectMembers),
  // These relations will be uncommented when schemas are added:
  // siteVisits: many(siteVisits),
  // workstreams: many(projectWorkstreams),
  // notes: many(projectNotes),
  // files: many(projectFiles),
  bom: many(projectBom),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectStatus = (typeof projectStatusEnum.enumValues)[number];
export type ProjectType = (typeof projectTypeEnum.enumValues)[number];
export type ProjectPriority = (typeof projectPriorityEnum.enumValues)[number];
export type ProjectMember = typeof projectMembers.$inferSelect;
export type NewProjectMember = typeof projectMembers.$inferInsert;

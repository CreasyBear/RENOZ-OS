/**
 * Issues Schema
 *
 * Support tickets for battery systems, inverters, and installation issues.
 * Linked to unified SLA tracking via sla_tracking_id FK.
 *
 * @see _Initiation/_prd/2-domains/support/support.prd.json
 * @see _Initiation/_prd/_meta/remediation-sla-engine.md
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  timestampColumns,
  auditColumns,
  softDeleteColumn,
  standardRlsPolicies,
} from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { users } from "../users";
import { customers } from "../customers";
import { issuePriorityEnum, issueStatusEnum, issueTypeEnum } from "../_shared/enums";
import { slaTracking } from "./sla-tracking";

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Flexible metadata for issues (JSONB column)
 */
export interface IssueMetadata {
  // Battery-specific data
  serialNumber?: string;
  batteryModel?: string;
  installedDate?: string;
  sohReading?: number; // State of Health percentage
  inverterErrorCode?: string;
  inverterModel?: string;

  // Additional optional fields for extensibility
  // Note: Use Zod schema with .passthrough() for runtime validation of extra fields
  customField1?: string;
  customField2?: string;
  customField3?: string;
  notes?: string;
}

// ============================================================================
// ISSUES TABLE
// ============================================================================

export const issues = pgTable(
  "issues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Issue identifier (auto-generated)
    issueNumber: text("issue_number")
      .notNull()
      .default(sql`'ISS-' || substr(gen_random_uuid()::text, 1, 8)`),

    // Basic info
    title: text("title").notNull(),
    description: text("description"),

    // Classification
    type: issueTypeEnum("type").notNull().default("other"),
    priority: issuePriorityEnum("priority").notNull().default("medium"),
    status: issueStatusEnum("status").notNull().default("open"),

    // Associations
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    assignedToUserId: uuid("assigned_to_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    // SLA tracking via unified engine (replaces inline SLA columns)
    slaTrackingId: uuid("sla_tracking_id").references(() => slaTracking.id, {
      onDelete: "set null",
    }),

    // For pause reasons (when on_hold status)
    holdReason: text("hold_reason"),

    // Escalation tracking
    escalatedAt: timestamp("escalated_at", { withTimezone: true }),
    escalatedBy: uuid("escalated_by"),
    escalationReason: text("escalation_reason"),

    // Resolution
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionNotes: text("resolution_notes"),

    // Battery/inverter specific metadata
    metadata: jsonb("metadata").$type<IssueMetadata>(),

    // Tags for filtering
    tags: text("tags").array(),

    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumn,
  },
  (table) => ({
    // Lookup by customer
    customerIdx: index("idx_issues_customer").on(table.customerId),
    // Lookup by assignee
    assigneeIdx: index("idx_issues_assignee").on(table.assignedToUserId),
    // Filter by status
    statusIdx: index("idx_issues_status").on(table.organizationId, table.status),
    // Filter by priority
    priorityIdx: index("idx_issues_priority").on(table.organizationId, table.priority),
    // SLA tracking lookup
    slaTrackingIdx: index("idx_issues_sla_tracking").on(table.slaTrackingId),
    // Escalated issues
    escalatedIdx: index("idx_issues_escalated").on(table.organizationId, table.escalatedAt),
    // Org + createdAt for listing
    orgCreatedIdx: index("idx_issues_org_created").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),

    // Standard CRUD RLS policies for org isolation
    ...standardRlsPolicies("issues"),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const issuesRelations = relations(issues, ({ one }) => ({
  organization: one(organizations, {
    fields: [issues.organizationId],
    references: [organizations.id],
  }),
  customer: one(customers, {
    fields: [issues.customerId],
    references: [customers.id],
  }),
  assignedTo: one(users, {
    fields: [issues.assignedToUserId],
    references: [users.id],
    relationName: "assignedTo",
  }),
  escalatedByUser: one(users, {
    fields: [issues.escalatedBy],
    references: [users.id],
    relationName: "escalatedBy",
  }),
  slaTracking: one(slaTracking, {
    fields: [issues.slaTrackingId],
    references: [slaTracking.id],
  }),
}));

// ============================================================================
// TYPES
// ============================================================================

export type Issue = typeof issues.$inferSelect;
export type NewIssue = typeof issues.$inferInsert;

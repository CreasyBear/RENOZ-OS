/**
 * Email Suppression Schema
 *
 * Stores suppressed email addresses for bounce, complaint, unsubscribe, and manual
 * suppression. Uses soft delete for audit trail and potential re-subscribe capability.
 *
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/3-integrations/resend/resend.prd.json
 */

import {
  pgTable,
  uuid,
  text,
  jsonb,
  index,
  uniqueIndex,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { suppressionReasonEnum, bounceTypeEnum } from "../_shared/enums";
import { organizations } from "../settings/organizations";
import { users } from "../users/users";
import { standardRlsPolicies } from "../_shared/patterns";

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Additional metadata stored with suppression records.
 */
export interface SuppressionMetadata {
  /** Original email subject that caused suppression */
  emailSubject?: string;
  /** Campaign ID if from campaign send */
  campaignId?: string;
  /** IP address hash of the suppression request (for compliance) */
  ipHash?: string;
  /** User agent of the suppression request */
  userAgent?: string;
  /** Additional notes (for manual suppression) */
  notes?: string;
  /** The bounce message from the email provider */
  bounceMessage?: string;
}

// ============================================================================
// EMAIL SUPPRESSION TABLE
// ============================================================================

export const emailSuppression = pgTable(
  "email_suppression",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Multi-tenant isolation
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Suppressed email (normalized to lowercase)
    email: text("email").notNull(),

    // Suppression reason
    reason: suppressionReasonEnum("reason").notNull(),

    // Bounce type (only for bounce reason)
    bounceType: bounceTypeEnum("bounce_type"),

    // Soft bounce counter (for "3 strikes" rule)
    // Incremented on each soft bounce, auto-suppress at 3
    bounceCount: integer("bounce_count").notNull().default(0),

    // Source of suppression
    source: text("source"), // 'webhook', 'manual', 'import', 'api'

    // Resend event correlation
    resendEventId: text("resend_event_id"),

    // Additional context
    metadata: jsonb("metadata").$type<SuppressionMetadata>().default({}),

    // Creation timestamp
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // Soft delete for audit trail
    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    // Who removed from suppression (for audit)
    deletedBy: uuid("deleted_by").references(() => users.id, {
      onDelete: "set null",
    }),

    // Reason for removal (for audit)
    deletedReason: text("deleted_reason"),
  },
  (table) => ({
    // Unique email per organization (only active suppressions)
    uniqueEmailOrg: uniqueIndex("email_suppression_unique_idx")
      .on(table.organizationId, table.email)
      .where(sql`${table.deletedAt} IS NULL`),

    // Fast email lookup across orgs (for global hard bounce check)
    emailIdx: index("email_suppression_email_idx").on(table.email),

    // Reason-based filtering
    reasonIdx: index("email_suppression_reason_idx").on(table.reason),

    // Organization + reason for filtered list queries
    orgReasonIdx: index("email_suppression_org_reason_idx").on(
      table.organizationId,
      table.reason
    ),

    // Cursor-based pagination (org + createdAt + id)
    orgCreatedIdIdx: index("email_suppression_org_created_id_idx").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),

    // RLS Policies
    ...standardRlsPolicies("email_suppression"),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const emailSuppressionRelations = relations(
  emailSuppression,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [emailSuppression.organizationId],
      references: [organizations.id],
    }),
    deletedByUser: one(users, {
      fields: [emailSuppression.deletedBy],
      references: [users.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type EmailSuppressionRecord = typeof emailSuppression.$inferSelect;
export type NewEmailSuppression = typeof emailSuppression.$inferInsert;

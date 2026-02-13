/**
 * CSAT (Customer Satisfaction) Responses Schema
 *
 * Tracks customer satisfaction ratings for resolved issues.
 * Supports both internal entry and public token-based submission.
 *
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-005a
 */

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  timestampColumns,
  auditColumns,
  standardRlsPolicies,
} from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { issues } from "./issues";
import { users } from "../users";
import { customers } from "../customers";

// ============================================================================
// ENUMS
// ============================================================================

export const csatSourceEnum = pgEnum("csat_source", [
  "email_link",      // Customer clicked link in resolution email
  "internal_entry",  // Staff entered rating from phone/in-person feedback
  "public_form",     // Customer used public feedback form
]);

// ============================================================================
// CSAT RESPONSES TABLE
// ============================================================================

export const csatResponses = pgTable(
  "csat_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Issue relationship
    issueId: uuid("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),

    // Rating data
    rating: integer("rating").notNull(), // 1-5 stars
    comment: text("comment"),

    // Submission context
    source: csatSourceEnum("source").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // Who submitted
    submittedByUserId: uuid("submitted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }), // For internal entry
    submittedByCustomerId: uuid("submitted_by_customer_id").references(
      () => customers.id,
      { onDelete: "set null" }
    ), // For public form
    submittedByEmail: text("submitted_by_email"), // Email from public form if no customer match

    // Token-based submission
    token: text("token").unique(), // Unique token for email/public form links
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    tokenUsedAt: timestamp("token_used_at", { withTimezone: true }),

    // Standard columns
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    organizationIdx: index("csat_responses_organization_idx").on(table.organizationId),
    issueIdx: index("csat_responses_issue_idx").on(table.issueId),
    ratingIdx: index("csat_responses_rating_idx").on(table.rating),
    sourceIdx: index("csat_responses_source_idx").on(table.source),
    submittedAtIdx: index("csat_responses_submitted_at_idx").on(table.submittedAt),
    tokenIdx: index("csat_responses_token_idx").on(table.token),

    // Standard CRUD RLS policies for org isolation
    ...standardRlsPolicies("csat_responses"),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const csatResponsesRelations = relations(csatResponses, ({ one }) => ({
  organization: one(organizations, {
    fields: [csatResponses.organizationId],
    references: [organizations.id],
  }),
  issue: one(issues, {
    fields: [csatResponses.issueId],
    references: [issues.id],
  }),
  submittedByUser: one(users, {
    fields: [csatResponses.submittedByUserId],
    references: [users.id],
  }),
  submittedByCustomer: one(customers, {
    fields: [csatResponses.submittedByCustomerId],
    references: [customers.id],
  }),
}));

// ============================================================================
// TYPES
// ============================================================================

export type CsatResponse = typeof csatResponses.$inferSelect;
export type NewCsatResponse = typeof csatResponses.$inferInsert;
export type CsatSource = (typeof csatSourceEnum.enumValues)[number];

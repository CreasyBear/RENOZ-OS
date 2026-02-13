/**
 * Email Signatures Schema
 *
 * Personal and company email signatures for outbound emails.
 *
 * @see DOM-COMMS-006
 */

import {
  pgTable,
  uuid,
  text,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  timestampColumns,
  auditColumns,
  standardRlsPolicies,
} from "../_shared/patterns";
import { users } from "../users/users";
import { organizations } from "../settings/organizations";

// ============================================================================
// EMAIL SIGNATURES TABLE
// ============================================================================

export const emailSignatures = pgTable(
  "email_signatures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Owner (null for company-wide signatures)
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),

    // Signature details
    name: text("name").notNull(),
    content: text("content").notNull(), // HTML content

    // Flags
    isDefault: boolean("is_default").notNull().default(false),
    isCompanyWide: boolean("is_company_wide").notNull().default(false),

    // Timestamps and audit
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    // User's signatures
    userIdx: index("idx_email_signatures_user").on(table.userId),

    // Organization signatures (for company-wide)
    orgIdx: index("idx_email_signatures_org").on(table.organizationId),

    // Default signature lookup
    defaultIdx: index("idx_email_signatures_default").on(
      table.organizationId,
      table.userId,
      table.isDefault
    ),

    // RLS Policies
    ...standardRlsPolicies("email_signatures"),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const emailSignaturesRelations = relations(emailSignatures, ({ one }) => ({
  user: one(users, {
    fields: [emailSignatures.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPES
// ============================================================================

export type EmailSignature = typeof emailSignatures.$inferSelect;
export type NewEmailSignature = typeof emailSignatures.$inferInsert;

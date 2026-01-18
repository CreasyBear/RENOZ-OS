/**
 * Scheduled Emails Schema
 *
 * Table for storing emails scheduled to be sent at a future time.
 * Supports timezone-aware scheduling and template-based emails.
 *
 * @see DOM-COMMS-002a
 * @see _Initiation/_prd/1-foundation/patterns/canonical-enums.json for enum values
 */

import {
  pgTable,
  uuid,
  text,
  jsonb,
  index,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { scheduledEmailStatusEnum } from "./enums";
import { organizationColumnBase, timestampColumns } from "./patterns";
import { users } from "./users";
import { customers } from "./customers";

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Template types for scheduled emails
 */
export type ScheduledEmailTemplateType =
  | "welcome"
  | "follow_up"
  | "quote"
  | "order_confirmation"
  | "shipping_notification"
  | "reminder"
  | "custom";

/**
 * Template data structure for variable substitution
 */
export interface ScheduledEmailTemplateData {
  /** Template variable values */
  variables?: Record<string, string | number | boolean>;
  /** Custom subject override (if not using template subject) */
  subjectOverride?: string;
  /** Custom body override (if not using template body) */
  bodyOverride?: string;
  /** Attachments to include */
  attachments?: Array<{
    filename: string;
    url: string;
    size: number;
  }>;
  /** Additional metadata */
  [key: string]: unknown;
}

// ============================================================================
// SCHEDULED EMAILS TABLE
// ============================================================================

export const scheduledEmails = pgTable(
  "scheduled_emails",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...organizationColumnBase,

    // Who scheduled this email
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Recipient information
    recipientEmail: text("recipient_email").notNull(),
    recipientName: text("recipient_name"),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),

    // Email content
    subject: text("subject").notNull(),
    templateType: text("template_type").$type<ScheduledEmailTemplateType>().notNull(),
    templateData: jsonb("template_data").$type<ScheduledEmailTemplateData>().default({}),

    // Scheduling
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    timezone: text("timezone").notNull().default("UTC"),

    // Status tracking
    status: scheduledEmailStatusEnum("status").notNull().default("pending"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),

    // Reference to sent email (created when email is actually sent)
    emailHistoryId: uuid("email_history_id"),

    // Timestamps
    ...timestampColumns,
  },
  (table) => ({
    // Multi-tenant queries
    orgStatusIdx: index("idx_scheduled_emails_org_status").on(
      table.organizationId,
      table.status
    ),

    // Finding emails due to send
    scheduledAtIdx: index("idx_scheduled_emails_scheduled_at").on(
      table.scheduledAt,
      table.status
    ),

    // User's scheduled emails
    userIdx: index("idx_scheduled_emails_user").on(table.userId),

    // Customer's scheduled emails
    customerIdx: index("idx_scheduled_emails_customer").on(table.customerId),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const scheduledEmailsRelations = relations(scheduledEmails, ({ one }) => ({
  user: one(users, {
    fields: [scheduledEmails.userId],
    references: [users.id],
  }),
  customer: one(customers, {
    fields: [scheduledEmails.customerId],
    references: [customers.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ScheduledEmail = typeof scheduledEmails.$inferSelect;
export type NewScheduledEmail = typeof scheduledEmails.$inferInsert;

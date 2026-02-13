/**
 * Email History Schema
 *
 * Append-only email audit trail with campaign tracking.
 * Table category: appendOnly (per column-patterns.json)
 *
 * @see _Initiation/_prd/1-foundation/patterns/canonical-enums.json for enum values
 * @see _Initiation/_prd/1-foundation/patterns/rls-policies.json for RLS patterns
 */

import {
  pgTable,
  uuid,
  text,
  jsonb,
  index,
  timestamp,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { emailStatusEnum, bounceTypeEnum } from "../_shared/enums";
import { organizations } from "../settings/organizations";
import { emailCampaigns } from "./email-campaigns";
import { emailTemplates } from "./email-templates";
import { users } from "../users/users";
import { customers } from "../customers/customers";
import {
  organizationRlsUsing,
  organizationRlsWithCheck,
} from "../_shared/patterns";

// ============================================================================
// INTERFACES
// ============================================================================

export interface EmailMetadata {
  /** Sender name */
  fromName?: string;
  /** Reply-to address */
  replyTo?: string;
  /** CC recipients */
  cc?: string[];
  /** BCC recipients */
  bcc?: string[];
  /** Custom headers */
  headers?: Record<string, string>;
  /** Attachment info (names, sizes) */
  attachments?: Array<{ name: string; size: number; type: string }>;
  /** Mail provider message ID */
  providerMessageId?: string;
  /** Mail provider (sendgrid, ses, etc.) */
  provider?: string;
  /** Source of email: "sent" | "synced" */
  source?: string;
  /** Link tracking map (linkId -> originalUrl) for URL validation */
  linkMap?: Record<string, string>;
  /** Email preview text */
  previewText?: string;
  /** Priority level */
  priority?: "low" | "normal" | "high";
  /** Template ID if sent from template */
  templateId?: string;
  /** Template version used */
  templateVersion?: number;
}

/**
 * Individual link click tracking entry.
 * Stores when each link in an email was clicked.
 */
export interface LinkClick {
  /** Unique identifier for the link */
  linkId: string;
  /** Original URL that was wrapped */
  url: string;
  /** When the link was clicked */
  clickedAt: string; // ISO timestamp
  /** User agent of the clicker (for analytics) */
  userAgent?: string;
  /** IP address (hashed for privacy) */
  ipHash?: string;
}

/**
 * JSONB structure for tracking all link clicks in an email.
 */
export interface LinkClicks {
  /** Array of individual click events */
  clicks: LinkClick[];
  /** Total click count (denormalized for quick access) */
  totalClicks: number;
  /** Unique links clicked count */
  uniqueLinksClicked: number;
}

// ============================================================================
// EMAIL HISTORY TABLE (Append-Only)
// ============================================================================

export const emailHistory = pgTable(
  "email_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Sender info
    senderId: uuid("sender_id").references(() => users.id, {
      onDelete: "set null",
    }),
    fromAddress: text("from_address").notNull(),

    // Recipient info
    toAddress: text("to_address").notNull(),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),

    // Email content
    subject: text("subject").notNull(),
    bodyHtml: text("body_html"),
    bodyText: text("body_text"),

    // Status tracking
    status: emailStatusEnum("status").notNull().default("pending"),

    // Resend integration - message ID for webhook correlation (INT-RES-002)
    resendMessageId: text("resend_message_id"),

    // Campaign tracking (FOUND-SCHEMA-004 enhancement)
    campaignId: uuid("campaign_id").references(() => emailCampaigns.id, {
      onDelete: "set null",
    }), // For bulk sends
    templateId: uuid("template_id").references(() => emailTemplates.id, {
      onDelete: "set null",
    }), // For template tracking

    // Engagement tracking (FOUND-SCHEMA-004 enhancement)
    openedAt: timestamp("opened_at", { withTimezone: true }),
    clickedAt: timestamp("clicked_at", { withTimezone: true }),
    linkClicks: jsonb("link_clicks").$type<LinkClicks>(),

    // Delivery info
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    bouncedAt: timestamp("bounced_at", { withTimezone: true }),
    bounceReason: text("bounce_reason"),
    bounceType: bounceTypeEnum("bounce_type"), // hard or soft bounce (INT-RES-002)
    complainedAt: timestamp("complained_at", { withTimezone: true }), // Spam complaint timestamp

    // Additional metadata
    metadata: jsonb("metadata").$type<EmailMetadata>().default({}),

    // Append-only: only createdAt, no updatedAt
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Campaign queries
    campaignIdx: index("idx_email_history_campaign").on(table.campaignId),

    // Template performance
    templateIdx: index("idx_email_history_template").on(table.templateId),

    // Multi-tenant queries
    orgStatusIdx: index("idx_email_history_org_status").on(
      table.organizationId,
      table.status
    ),
    // Cursor pagination index (org + createdAt + id)
    orgCreatedIdIdx: index("idx_email_history_org_created_id").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),

    // Customer email history
    customerIdx: index("idx_email_history_customer").on(table.customerId),

    // Sender history
    senderIdx: index("idx_email_history_sender").on(table.senderId),

    // Resend webhook correlation (INT-RES-002)
    resendMessageIdx: index("idx_email_history_resend_message").on(
      table.resendMessageId
    ),

    // RLS Policies (append-only: select + insert only)
    selectPolicy: pgPolicy("email_history_select_policy", {
      for: "select",
      to: "authenticated",
      using: organizationRlsUsing(),
    }),
    insertPolicy: pgPolicy("email_history_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: organizationRlsWithCheck(),
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const emailHistoryRelations = relations(emailHistory, ({ one }) => ({
  sender: one(users, {
    fields: [emailHistory.senderId],
    references: [users.id],
  }),
  customer: one(customers, {
    fields: [emailHistory.customerId],
    references: [customers.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type EmailHistory = typeof emailHistory.$inferSelect;
export type NewEmailHistory = typeof emailHistory.$inferInsert;

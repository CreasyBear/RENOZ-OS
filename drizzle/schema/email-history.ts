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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { emailStatusEnum } from "./enums";
import { organizationColumnBase } from "./patterns";
import { users } from "./users";
import { customers } from "./customers";

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
  /** Link tracking map (linkId -> originalUrl) for URL validation */
  linkMap?: Record<string, string>;
  [key: string]: unknown;
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
    ...organizationColumnBase,

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

    // Campaign tracking (FOUND-SCHEMA-004 enhancement)
    campaignId: uuid("campaign_id"), // For bulk sends
    templateId: text("template_id"), // For template tracking

    // Engagement tracking (FOUND-SCHEMA-004 enhancement)
    openedAt: timestamp("opened_at", { withTimezone: true }),
    clickedAt: timestamp("clicked_at", { withTimezone: true }),
    linkClicks: jsonb("link_clicks").$type<LinkClicks>(),

    // Delivery info
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    bouncedAt: timestamp("bounced_at", { withTimezone: true }),
    bounceReason: text("bounce_reason"),

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
      table.createdAt,
      table.id
    ),

    // Customer email history
    customerIdx: index("idx_email_history_customer").on(table.customerId),

    // Sender history
    senderIdx: index("idx_email_history_sender").on(table.senderId),
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

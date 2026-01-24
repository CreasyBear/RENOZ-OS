/**
 * Email Campaigns Schema
 *
 * Tables for managing email marketing campaigns with bulk recipient management.
 * Supports batch sending, tracking, and analytics.
 *
 * @see DOM-COMMS-003a
 * @see _Initiation/_prd/1-foundation/patterns/canonical-enums.json for enum values
 */

import {
  pgTable,
  uuid,
  text,
  jsonb,
  index,
  timestamp,
  integer,
  uniqueIndex,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { campaignStatusEnum, campaignRecipientStatusEnum } from "../_shared/enums";
import { timestampColumns } from "../_shared/patterns";
import { users } from "../users/users";
import { contacts } from "../customers/customers";
import { organizations } from "../settings/organizations";

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Template types for campaigns (same as scheduled emails)
 */
export type CampaignTemplateType =
  | "welcome"
  | "follow_up"
  | "quote"
  | "order_confirmation"
  | "shipping_notification"
  | "reminder"
  | "newsletter"
  | "promotion"
  | "announcement"
  | "custom";

/**
 * Campaign template data for variable substitution
 */
export interface CampaignTemplateData {
  /** Template variable values (merged with per-recipient data) */
  variables?: Record<string, string | number | boolean>;
  /** Custom subject (if not using template subject) */
  subjectOverride?: string;
  /** Custom body (if not using template body) */
  bodyOverride?: string;
  /** Attachments to include */
  attachments?: Array<{
    filename: string;
    url: string;
    size: number;
  }>;
  /** Email preview text (shown in inbox before opening) */
  previewText?: string;
  /** Custom from name override */
  fromNameOverride?: string;
  /** Custom reply-to email */
  replyToOverride?: string;
  /** UTM tracking parameters */
  trackingParams?: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
  };
}

/**
 * Recipient selection criteria for campaigns
 */
export interface CampaignRecipientCriteria {
  /** Filter by customer tags */
  tags?: string[];
  /** Filter by customer status */
  statuses?: string[];
  /** Filter by customer type (individual, business, etc.) */
  customerTypes?: string[];
  /** Filter by specific contact IDs */
  contactIds?: string[];
  /** Filter by customer IDs */
  customerIds?: string[];
  /** Exclude specific contact IDs */
  excludeContactIds?: string[];
  /** Additional SQL-like filters */
  customFilters?: Record<string, unknown>;
}

// ============================================================================
// EMAIL CAMPAIGNS TABLE
// ============================================================================

export const emailCampaigns = pgTable(
  "email_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Campaign metadata
    name: text("name").notNull(),
    description: text("description"),

    // Email content
    templateType: text("template_type").$type<CampaignTemplateType>().notNull(),
    templateData: jsonb("template_data").$type<CampaignTemplateData>().default({}),

    // Recipient selection
    recipientCriteria: jsonb("recipient_criteria").$type<CampaignRecipientCriteria>().default({}),

    // Scheduling
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    // Status tracking
    status: campaignStatusEnum("status").notNull().default("draft"),

    // Stats (denormalized for quick access)
    recipientCount: integer("recipient_count").notNull().default(0),
    sentCount: integer("sent_count").notNull().default(0),
    deliveredCount: integer("delivered_count").notNull().default(0),
    openCount: integer("open_count").notNull().default(0),
    clickCount: integer("click_count").notNull().default(0),
    bounceCount: integer("bounce_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    unsubscribeCount: integer("unsubscribe_count").notNull().default(0),

    // Who created this campaign
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Timestamps
    ...timestampColumns,
  },
  (table) => ({
    // Multi-tenant queries
    orgStatusIdx: index("idx_email_campaigns_org_status").on(
      table.organizationId,
      table.status
    ),

    // Scheduled campaigns
    scheduledAtIdx: index("idx_email_campaigns_scheduled_at").on(
      table.scheduledAt,
      table.status
    ),

    // Creator queries
    creatorIdx: index("idx_email_campaigns_creator").on(table.createdById),

    // RLS Policies
    selectPolicy: pgPolicy("email_campaigns_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
    insertPolicy: pgPolicy("email_campaigns_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
    updatePolicy: pgPolicy("email_campaigns_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
      withCheck: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
    deletePolicy: pgPolicy("email_campaigns_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
  })
);

// ============================================================================
// CAMPAIGN RECIPIENTS TABLE
// ============================================================================

export const campaignRecipients = pgTable(
  "campaign_recipients",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Campaign reference
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => emailCampaigns.id, { onDelete: "cascade" }),

    // Recipient information
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    email: text("email").notNull(),
    name: text("name"),

    // Per-recipient template variables (merged with campaign template data)
    recipientData: jsonb("recipient_data").$type<Record<string, unknown>>().default({}),

    // Delivery status
    status: campaignRecipientStatusEnum("status").notNull().default("pending"),

    // Tracking timestamps
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    clickedAt: timestamp("clicked_at", { withTimezone: true }),
    bouncedAt: timestamp("bounced_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),

    // Error tracking
    errorMessage: text("error_message"),

    // Reference to sent email in email_history
    emailHistoryId: uuid("email_history_id"),

    // Timestamps
    ...timestampColumns,
  },
  (table) => ({
    // Campaign recipients lookup
    campaignIdx: index("idx_campaign_recipients_campaign").on(table.campaignId),

    // Status queries within campaign
    campaignStatusIdx: index("idx_campaign_recipients_campaign_status").on(
      table.campaignId,
      table.status
    ),

    // Contact lookup
    contactIdx: index("idx_campaign_recipients_contact").on(table.contactId),

    // Email uniqueness within campaign (prevent duplicates)
    campaignEmailUnique: uniqueIndex(
      "idx_campaign_recipients_campaign_email_unique"
    ).on(table.campaignId, table.email),
    campaignEmailIdx: index("idx_campaign_recipients_campaign_email").on(
      table.campaignId,
      table.email
    ),

    // Org lookup
    orgIdx: index("idx_campaign_recipients_org").on(table.organizationId),

    // RLS Policies
    selectPolicy: pgPolicy("campaign_recipients_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
    insertPolicy: pgPolicy("campaign_recipients_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
    updatePolicy: pgPolicy("campaign_recipients_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
      withCheck: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
    deletePolicy: pgPolicy("campaign_recipients_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const emailCampaignsRelations = relations(emailCampaigns, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [emailCampaigns.createdById],
    references: [users.id],
  }),
  recipients: many(campaignRecipients),
}));

export const campaignRecipientsRelations = relations(campaignRecipients, ({ one }) => ({
  campaign: one(emailCampaigns, {
    fields: [campaignRecipients.campaignId],
    references: [emailCampaigns.id],
  }),
  contact: one(contacts, {
    fields: [campaignRecipients.contactId],
    references: [contacts.id],
  }),
}));

/**
 * Pipeline Schema
 *
 * Sales pipeline for opportunities, activities, quote versions, and win/loss tracking.
 * Table category: business (per column-patterns.json)
 *
 * Australian B2B context:
 * - All monetary values in AUD dollars (numeric(12,2))
 * - 10% GST applied to quotes
 * - Pipeline stages: New (10%) → Qualified (30%) → Quoted (60%) → Pending (80%) → Won (100%) / Lost (0%)
 * - Quote validity: 30-day default with 7-day warning period
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json for full specification
 * @see _Initiation/_prd/1-foundation/patterns/canonical-enums.json for enum values
 */

import {
  pgTable,
  uuid,
  text,
  varchar,
  date,
  timestamp,
  jsonb,
  integer,
  boolean,
  index,
  uniqueIndex,
  pgPolicy,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  opportunityStageEnum,
  opportunityActivityTypeEnum,
  winLossReasonTypeEnum,
} from "../_shared/enums";
import {
  timestampColumns,
  auditColumns,
  softDeleteColumn,
  currencyColumn,
  currencyColumnNullable,
  percentageColumn,
  standardRlsPolicies,
  organizationRlsUsing,
  organizationRlsWithCheck,
  positiveCheck,
  nonNegativeCheck,
  rangeCheck,
} from "../_shared/patterns";
import { customers, contacts } from "../customers/customers";
import { users } from "../users/users";
import { organizations } from "../settings/organizations";

// ============================================================================
// INTERFACES
// ============================================================================

export interface OpportunityMetadata {
  source?: "referral" | "website" | "cold_call" | "trade_show" | "other";
  notes?: string;
  /** Referrer name if source is referral */
  referrerName?: string;
  /** Campaign ID if from marketing campaign */
  campaignId?: string;
  /** Initial budget estimate from customer */
  budgetEstimate?: number;
  /** Decision makers involved */
  decisionMakers?: string[];
  /** Competitor mentions */
  competitors?: string[];
  /** Custom tags for categorization */
  tags?: string[];
}

export interface QuoteLineItem {
  productId?: string;
  sku?: string;
  description: string;
  quantity: number;
  unitPrice: number; // Price in dollars
  discountPercent?: number;
  total: number; // Line total in dollars
}

// ============================================================================
// WIN/LOSS REASONS TABLE
// ============================================================================

export const winLossReasons = pgTable(
  "win_loss_reasons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Reason definition
    name: varchar("name", { length: 100 }).notNull(),
    type: winLossReasonTypeEnum("type").notNull(),
    description: text("description"),

    // Status and ordering
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),

    // Versioning
    version: integer("version").notNull().default(1),

    // Tracking
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    // Unique name per organization and type
    nameOrgTypeUnique: uniqueIndex("idx_win_loss_reasons_name_org_type_unique").on(
      table.organizationId,
      table.type,
      table.name
    ),

    // Multi-tenant queries
    orgTypeIdx: index("idx_win_loss_reasons_org_type").on(
      table.organizationId,
      table.type
    ),
    orgActiveIdx: index("idx_win_loss_reasons_org_active").on(
      table.organizationId,
      table.isActive
    ),
    sortOrderIdx: index("idx_win_loss_reasons_sort_order").on(
      table.organizationId,
      table.sortOrder
    ),

    // RLS Policies
    ...standardRlsPolicies("win_loss_reasons"),
  })
);

// ============================================================================
// OPPORTUNITIES TABLE (Sales Pipeline)
// ============================================================================

export const opportunities = pgTable(
  "opportunities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Identification
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),

    // Customer and contact references
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),

    // Assignment
    assignedTo: uuid("assigned_to").references(() => users.id, {
      onDelete: "set null",
    }),

    // Pipeline stage and probability
    // Probability defaults: new=10, qualified=30, proposal=60, negotiation=80, won=100, lost=0
    stage: opportunityStageEnum("stage").notNull().default("new"),
    probability: percentageColumn("probability").default(10),

    // Value (stored in cents to avoid floating point issues)
    value: currencyColumn("value"),
    weightedValue: currencyColumnNullable("weighted_value"), // value * probability / 100

    // Dates
    expectedCloseDate: date("expected_close_date"),
    actualCloseDate: date("actual_close_date"),
    followUpDate: date("follow_up_date"),

    // Quote information
    quoteExpiresAt: timestamp("quote_expires_at", { withTimezone: true }),
    quotePdfUrl: text("quote_pdf_url"),

    // Win/Loss tracking
    winLossReasonId: uuid("win_loss_reason_id").references(
      () => winLossReasons.id,
      { onDelete: "set null" }
    ),
    lostReason: text("lost_reason"), // Legacy text field for backward compatibility
    lostNotes: text("lost_notes"),
    competitorName: varchar("competitor_name", { length: 100 }),

    // Tracking
    daysInStage: integer("days_in_stage").notNull().default(0),

    // Versioning for optimistic locking
    version: integer("version").notNull().default(1),

    // Metadata
    metadata: jsonb("metadata").$type<OpportunityMetadata>().default({}),
    tags: jsonb("tags").$type<string[]>().default([]),

    // Standard tracking columns
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumn,
  },
  (table) => ({
    // Multi-tenant queries
    orgStageIdx: index("idx_opportunities_org_stage").on(
      table.organizationId,
      table.stage
    ),
    orgCustomerIdx: index("idx_opportunities_org_customer").on(
      table.organizationId,
      table.customerId
    ),
    orgAssignedIdx: index("idx_opportunities_org_assigned").on(
      table.organizationId,
      table.assignedTo
    ),
    orgExpectedCloseIdx: index("idx_opportunities_org_expected_close").on(
      table.organizationId,
      table.expectedCloseDate
    ),
    orgFollowUpIdx: index("idx_opportunities_org_follow_up").on(
      table.organizationId,
      table.followUpDate
    ),
    orgProbabilityIdx: index("idx_opportunities_org_probability").on(
      table.organizationId,
      table.probability
    ),
    orgCreatedIdx: index("idx_opportunities_org_created").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),

    // Common queries
    customerIdx: index("idx_opportunities_customer").on(table.customerId),
    contactIdx: index("idx_opportunities_contact").on(table.contactId),
    winLossReasonIdx: index("idx_opportunities_win_loss_reason").on(
      table.winLossReasonId
    ),

    // Quote expiration tracking
    quoteExpiresIdx: index("idx_opportunities_quote_expires").on(
      table.quoteExpiresAt
    ),

    // Constraint: actualCloseDate required when stage is won or lost
    actualCloseDateCheck: check(
      "actual_close_date_required",
      sql`${table.stage} NOT IN ('won', 'lost') OR ${table.actualCloseDate} IS NOT NULL`
    ),

    // Probability range check
    probabilityCheck: rangeCheck("probability_range", table.probability, 0, 100),

    // RLS Policies
    ...standardRlsPolicies("opportunities"),
  })
);

// ============================================================================
// OPPORTUNITY ACTIVITIES TABLE
// ============================================================================

export const opportunityActivities = pgTable(
  "opportunity_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Link to opportunity
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),

    // Activity details
    type: opportunityActivityTypeEnum("type").notNull(),
    description: text("description").notNull(),
    outcome: text("outcome"),

    // Scheduling
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    // Tracking (activities are immutable once created)
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Multi-tenant queries
    orgOpportunityIdx: index("idx_opportunity_activities_org_opportunity").on(
      table.organizationId,
      table.opportunityId
    ),
    orgTypeIdx: index("idx_opportunity_activities_org_type").on(
      table.organizationId,
      table.type
    ),
    orgCreatedIdx: index("idx_opportunity_activities_org_created").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),

    // Opportunity queries
    opportunityIdx: index("idx_opportunity_activities_opportunity").on(
      table.opportunityId
    ),

    // Scheduling queries
    scheduledIdx: index("idx_opportunity_activities_scheduled").on(
      table.scheduledAt
    ),
    completedIdx: index("idx_opportunity_activities_completed").on(
      table.completedAt
    ),

    // Timeline query (opportunity + created desc)
    opportunityTimelineIdx: index("idx_opportunity_activities_timeline").on(
      table.opportunityId,
      table.createdAt.desc()
    ),

    // RLS Policies (append-only: select + insert + delete only, no update)
    selectPolicy: pgPolicy("opportunity_activities_select_policy", {
      for: "select",
      to: "authenticated",
      using: organizationRlsUsing(),
    }),
    insertPolicy: pgPolicy("opportunity_activities_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: organizationRlsWithCheck(),
    }),
    // Activities are immutable - no update policy
    deletePolicy: pgPolicy("opportunity_activities_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: organizationRlsUsing(),
    }),
  })
);

// ============================================================================
// QUOTE VERSIONS TABLE
// ============================================================================

export const quoteVersions = pgTable(
  "quote_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Link to opportunity
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),

    // Version tracking
    versionNumber: integer("version_number").notNull(),

    // Line items (JSONB array)
    items: jsonb("items").$type<QuoteLineItem[]>().notNull().default([]),

    // Pricing (stored in cents)
    subtotal: currencyColumn("subtotal"),
    taxAmount: currencyColumn("tax_amount"), // 10% GST
    total: currencyColumn("total"),

    // Notes
    notes: text("notes"),

    // Versioning for optimistic locking
    version: integer("version").notNull().default(1),

    // Tracking
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    // Unique version number per opportunity
    versionNumberOpportunityUnique: uniqueIndex(
      "idx_quote_versions_opportunity_version_unique"
    ).on(table.opportunityId, table.versionNumber),

    // Multi-tenant queries
    orgOpportunityIdx: index("idx_quote_versions_org_opportunity").on(
      table.organizationId,
      table.opportunityId
    ),
    orgCreatedIdx: index("idx_quote_versions_org_created").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),

    // Opportunity queries
    opportunityIdx: index("idx_quote_versions_opportunity").on(
      table.opportunityId
    ),

    // Constraints
    versionNumberPositive: positiveCheck("version_number_positive", table.versionNumber),
    subtotalNonNegative: nonNegativeCheck("subtotal_non_negative", table.subtotal),
    taxAmountNonNegative: nonNegativeCheck("tax_amount_non_negative", table.taxAmount),
    totalNonNegative: nonNegativeCheck("total_non_negative", table.total),

    // RLS Policies
    ...standardRlsPolicies("quote_versions"),
    portalSelectPolicy: pgPolicy("quote_versions_portal_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`(
        ${table.organizationId} = (SELECT current_setting('app.organization_id', true)::uuid)
        OR EXISTS (
          SELECT 1 FROM portal_identities pi
          JOIN opportunities o ON o.id = ${table.opportunityId}
          WHERE pi.auth_user_id = auth.uid()
            AND pi.status = 'active'
            AND pi.organization_id = ${table.organizationId}
            AND pi.scope = 'customer'
            AND pi.customer_id = o.customer_id
        )
      )`,
    }),
  })
);

// ============================================================================
// QUOTES TABLE (Existing - kept for backward compatibility)
// This represents the "current" quote, while quoteVersions tracks history
// ============================================================================

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Identification
    quoteNumber: text("quote_number").notNull(),

    // Links
    opportunityId: uuid("opportunity_id").references(() => opportunities.id, {
      onDelete: "set null",
    }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),

    // Status
    status: text("status").notNull().default("draft"), // draft, sent, accepted, rejected, expired

    // Dates
    quoteDate: date("quote_date").notNull().defaultNow(),
    validUntil: date("valid_until"),
    acceptedAt: date("accepted_at"),

    // Line items (JSONB array for simplicity)
    lineItems: jsonb("line_items").$type<QuoteLineItem[]>().default([]),

    // Pricing
    subtotal: currencyColumn("subtotal"),
    discountAmount: currencyColumn("discount_amount"),
    taxAmount: currencyColumn("tax_amount"),
    total: currencyColumn("total"),

    // Notes
    terms: text("terms"),
    notes: text("notes"),

    // Tracking
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumn,
  },
  (table) => ({
    // Unique quote number per organization (scoped to active records)
    quoteNumberOrgUnique: uniqueIndex("idx_quotes_number_org_unique")
      .on(table.organizationId, table.quoteNumber)
      .where(sql`deleted_at IS NULL`),

    // Multi-tenant queries
    orgStatusIdx: index("idx_quotes_org_status").on(
      table.organizationId,
      table.status
    ),
    orgCustomerIdx: index("idx_quotes_org_customer").on(
      table.organizationId,
      table.customerId
    ),
    orgOpportunityIdx: index("idx_quotes_org_opportunity").on(
      table.organizationId,
      table.opportunityId
    ),

    // RLS Policies
    ...standardRlsPolicies("quotes"),
    portalSelectPolicy: pgPolicy("quotes_portal_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`(
        ${table.organizationId} = (SELECT current_setting('app.organization_id', true)::uuid)
        OR EXISTS (
          SELECT 1 FROM portal_identities pi
          WHERE pi.auth_user_id = auth.uid()
            AND pi.status = 'active'
            AND pi.organization_id = ${table.organizationId}
            AND pi.scope = 'customer'
            AND pi.customer_id = ${table.customerId}
        )
      )`,
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const winLossReasonsRelations = relations(winLossReasons, ({ many }) => ({
  opportunities: many(opportunities),
}));

export const opportunitiesRelations = relations(
  opportunities,
  ({ one, many }) => ({
    customer: one(customers, {
      fields: [opportunities.customerId],
      references: [customers.id],
    }),
    contact: one(contacts, {
      fields: [opportunities.contactId],
      references: [contacts.id],
    }),
    assignedUser: one(users, {
      fields: [opportunities.assignedTo],
      references: [users.id],
    }),
    winLossReason: one(winLossReasons, {
      fields: [opportunities.winLossReasonId],
      references: [winLossReasons.id],
    }),
    activities: many(opportunityActivities),
    quoteVersions: many(quoteVersions),
    quotes: many(quotes),
  })
);

export const opportunityActivitiesRelations = relations(
  opportunityActivities,
  ({ one }) => ({
    opportunity: one(opportunities, {
      fields: [opportunityActivities.opportunityId],
      references: [opportunities.id],
    }),
    createdByUser: one(users, {
      fields: [opportunityActivities.createdBy],
      references: [users.id],
    }),
  })
);

export const quoteVersionsRelations = relations(quoteVersions, ({ one }) => ({
  opportunity: one(opportunities, {
    fields: [quoteVersions.opportunityId],
    references: [opportunities.id],
  }),
}));

export const quotesRelations = relations(quotes, ({ one }) => ({
  opportunity: one(opportunities, {
    fields: [quotes.opportunityId],
    references: [opportunities.id],
  }),
  customer: one(customers, {
    fields: [quotes.customerId],
    references: [customers.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type WinLossReason = typeof winLossReasons.$inferSelect;
export type NewWinLossReason = typeof winLossReasons.$inferInsert;

export type Opportunity = typeof opportunities.$inferSelect;
export type NewOpportunity = typeof opportunities.$inferInsert;

export type OpportunityActivity = typeof opportunityActivities.$inferSelect;
export type NewOpportunityActivity = typeof opportunityActivities.$inferInsert;

export type QuoteVersion = typeof quoteVersions.$inferSelect;
export type NewQuoteVersion = typeof quoteVersions.$inferInsert;

export type Quote = typeof quotes.$inferSelect;
export type NewQuote = typeof quotes.$inferInsert;

// Convenience type for stage with probability defaults
export const STAGE_PROBABILITY_DEFAULTS = {
  new: 10,
  qualified: 30,
  proposal: 60,
  negotiation: 80,
  won: 100,
  lost: 0,
} as const;

export type OpportunityStage = keyof typeof STAGE_PROBABILITY_DEFAULTS;

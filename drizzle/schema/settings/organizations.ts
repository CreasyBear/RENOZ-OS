/**
 * Organizations Schema
 *
 * Multi-tenant organization entity. All business tables reference organizationId.
 * Table category: system (per column-patterns.json)
 *
 * @see _Initiation/_prd/1-foundation/patterns/canonical-enums.json for enum values
 */

import {
  pgTable,
  pgPolicy,
  uuid,
  text,
  boolean,
  jsonb,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { timestampColumns, softDeleteColumn } from "../_shared/patterns";

// ============================================================================
// INTERFACES
// ============================================================================

export interface OrganizationSettings {
  timezone?: string;
  locale?: string;
  currency?: string;
  dateFormat?: string;
  fiscalYearStart?: number; // Month (1-12)
  defaultPaymentTerms?: number; // Days
  /** Time format (12h or 24h) */
  timeFormat?: "12h" | "24h";
  /** Week start day (0=Sunday, 1=Monday, etc.) */
  weekStartDay?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Default tax rate percentage */
  defaultTaxRate?: number;
  /** Number format (comma/period for thousands/decimal) */
  numberFormat?: "1,234.56" | "1.234,56" | "1 234,56";
  /** Portal-specific branding overrides */
  portalBranding?: OrganizationBranding;
  /** Whether the onboarding checklist has been dismissed */
  onboardingChecklistDismissed?: boolean;
  /** When the onboarding checklist was dismissed (ISO string) */
  onboardingChecklistDismissedAt?: string;
  /** User ID who dismissed the onboarding checklist */
  onboardingChecklistDismissedBy?: string;
  /** Xero integration: sales account code (default 200) */
  xeroSalesAccount?: string;
  /** Xero integration: tax type for GST (default OUTPUT) */
  xeroTaxType?: string;
}

export interface OrganizationBranding {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  websiteUrl?: string;
}

export interface OrganizationAddress {
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

// ============================================================================
// ORGANIZATIONS TABLE
// ============================================================================

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Identification
    name: text("name").notNull(),
    slug: text("slug").notNull(), // URL-friendly identifier
    domain: text("domain"), // Optional custom domain
    abn: text("abn"), // Australian Business Number

    // Contact
    email: text("email"),
    phone: text("phone"),
    website: text("website"),

    // Address
    address: jsonb("address").$type<OrganizationAddress>().default({}),

    // ============================================================================
    // TIER 1 SETTINGS - Core Identity (first-class columns)
    // ============================================================================
    timezone: text("timezone").notNull().default("Australia/Sydney"),
    locale: text("locale").notNull().default("en-AU"),
    currency: text("currency").notNull().default("AUD"),
    dateFormat: text("date_format").notNull().default("DD/MM/YYYY"),
    timeFormat: text("time_format").notNull().default("12h"),
    numberFormat: text("number_format").notNull().default("1,234.56"),
    fiscalYearStart: integer("fiscal_year_start").notNull().default(7), // Month (1-12), default July for AU
    weekStartDay: integer("week_start_day").notNull().default(1), // 0=Sunday, 1=Monday
    defaultTaxRate: integer("default_tax_rate").notNull().default(10), // Percentage (e.g., 10 for GST)
    defaultPaymentTerms: integer("default_payment_terms").notNull().default(30), // Days

    // Settings (extended JSONB - for non-Tier 1 settings only)
    // NOTE: Deprecating timezone, locale, currency, dateFormat from this blob
    settings: jsonb("settings").$type<OrganizationSettings>().default({
      portalBranding: {},
    }),

    // Branding
    branding: jsonb("branding").$type<OrganizationBranding>().default({}),

    // Status
    isActive: boolean("is_active").notNull().default(true),

    // Subscription/Billing (placeholder for future)
    plan: text("plan").notNull().default("free"), // free, starter, pro, enterprise
    stripeCustomerId: text("stripe_customer_id"),

    // Tracking
    ...timestampColumns,
    ...softDeleteColumn,
  },
  (table) => ({
    // Unique slug
    slugUnique: uniqueIndex("idx_organizations_slug_unique").on(table.slug),
    // Unique domain (if provided)
    domainUnique: uniqueIndex("idx_organizations_domain_unique")
      .on(table.domain)
      .where(sql`${table.domain} IS NOT NULL`),

    // Unique ABN (if provided)
    abnUnique: uniqueIndex("idx_organizations_abn_unique")
      .on(table.abn)
      .where(sql`${table.abn} IS NOT NULL`),

    // Active organizations
    activeIdx: index("idx_organizations_active").on(table.isActive),
    // RLS Policies - organizations table uses `id` instead of `organization_id`
    selectPolicy: pgPolicy("organizations_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("organizations_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("organizations_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("organizations_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

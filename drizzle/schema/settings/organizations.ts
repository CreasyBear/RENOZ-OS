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
  uuid,
  text,
  boolean,
  jsonb,
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

    // Settings (first-class columns + JSONB)
    timezone: text("timezone").notNull().default("Australia/Sydney"),
    locale: text("locale").notNull().default("en-AU"),
    currency: text("currency").notNull().default("AUD"),

    // Settings (extended JSONB)
    settings: jsonb("settings").$type<OrganizationSettings>().default({
      timezone: "Australia/Sydney",
      locale: "en-AU",
      currency: "AUD",
      dateFormat: "DD/MM/YYYY",
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
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

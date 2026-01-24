/**
 * System Settings Schema
 *
 * Global system defaults and configuration for organization.
 * Stores key-value settings organized by category.
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/2-domains/settings/settings.prd.json for requirements
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  jsonb,
  integer,
  index,
  uniqueIndex,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { timestampColumns } from "../_shared/patterns";
import { organizations } from "./organizations";
import { users } from "../users/users";

// ============================================================================
// ENUMS (inline for this domain)
// ============================================================================

import { pgEnum } from "drizzle-orm/pg-core";

export const settingTypeEnum = pgEnum("setting_type", [
  "string",
  "number",
  "boolean",
  "json",
]);

// ============================================================================
// INTERFACES
// ============================================================================

export interface SettingMetadata {
  /** Description of what this setting controls */
  description?: string;
  /** Validation rules */
  validation?: {
    type?: "string" | "number" | "boolean" | "array" | "object";
    min?: number;
    max?: number;
    pattern?: string;
    enum?: Array<string | number>;
  };
  /** Default value if not set */
  defaultValue?: string | number | boolean | null;
  /** Whether changes require restart/reload */
  requiresRestart?: boolean;
  /** Group for UI organization */
  group?: string;
  /** Display order within group */
  sortOrder?: number;
  /** Help text for users */
  helpText?: string;
  /** Label for display */
  label?: string;
  /** Whether this is an advanced setting */
  advanced?: boolean;
  /** Visibility conditions (e.g., only show if another setting is true) */
  visibleWhen?: {
    settingKey: string;
    value: string | number | boolean;
  };
}

// ============================================================================
// SYSTEM SETTINGS TABLE
// ============================================================================

export const systemSettings = pgTable(
  "system_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Organization scoping
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Category/Key pattern for flexible settings
    category: varchar("category", { length: 50 }).notNull(), // e.g., "orders", "quotes", "financial", "formatting"
    key: varchar("key", { length: 100 }).notNull(), // e.g., "defaultPaymentTerms", "taxRate"

    // Value (stored as JSONB for type flexibility)
    value: jsonb("value").notNull(),

    // Value type for validation and UI hints
    type: settingTypeEnum("type").notNull().default("string"),

    // Description for UI display
    description: text("description"),

    // Visibility
    isPublic: boolean("is_public").notNull().default(false), // Public settings visible to unauthenticated

    // Audit tracking
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),

    // Optimistic locking
    version: integer("version").notNull().default(1),

    // Metadata for extended info
    metadata: jsonb("metadata").$type<SettingMetadata>().default({}),

    // Tracking
    ...timestampColumns,
  },
  (table) => ({
    // Unique constraint: one setting per org/category/key combo
    uniqueSetting: uniqueIndex("idx_system_settings_unique").on(
      table.organizationId,
      table.category,
      table.key
    ),

    // Organization queries
    orgIdx: index("idx_system_settings_org").on(table.organizationId),

    // Category-based queries
    orgCategoryIdx: index("idx_system_settings_org_category").on(
      table.organizationId,
      table.category
    ),

    // Public settings lookup
    publicIdx: index("idx_system_settings_public")
      .on(table.organizationId, table.isPublic)
      .where(sql`${table.isPublic} = true`),

    // RLS Policies
    selectPolicy: pgPolicy("system_settings_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
    insertPolicy: pgPolicy("system_settings_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
    updatePolicy: pgPolicy("system_settings_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
      withCheck: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
    deletePolicy: pgPolicy("system_settings_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const systemSettingsRelations = relations(systemSettings, ({ one }) => ({
  organization: one(organizations, {
    fields: [systemSettings.organizationId],
    references: [organizations.id],
  }),
  createdByUser: one(users, {
    fields: [systemSettings.createdBy],
    references: [users.id],
    relationName: "createdByUser",
  }),
  updatedByUser: one(users, {
    fields: [systemSettings.updatedBy],
    references: [users.id],
    relationName: "updatedByUser",
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type SystemSetting = typeof systemSettings.$inferSelect;
export type NewSystemSetting = typeof systemSettings.$inferInsert;

// ============================================================================
// SETTING CATEGORIES (for type safety)
// ============================================================================

export const SETTING_CATEGORIES = {
  ORDERS: "orders",
  QUOTES: "quotes",
  FINANCIAL: "financial",
  FORMATTING: "formatting",
  NOTIFICATIONS: "notifications",
  INTEGRATIONS: "integrations",
  SECURITY: "security",
  GENERAL: "general",
} as const;

export type SettingCategory =
  (typeof SETTING_CATEGORIES)[keyof typeof SETTING_CATEGORIES];

// ============================================================================
// DEFAULT SETTINGS KEYS
// ============================================================================

/**
 * Standard system setting keys for common configuration.
 * Use these constants for consistency across the application.
 */
export const SETTING_KEYS = {
  // Orders
  ORDER_DEFAULT_STATUS: "defaultStatus",
  ORDER_PAYMENT_TERMS: "paymentTerms",
  ORDER_SHIPPING_METHOD: "defaultShippingMethod",
  ORDER_TAX_RATE: "defaultTaxRate",

  // Quotes
  QUOTE_VALIDITY_DAYS: "validityDays",
  QUOTE_DEFAULT_TERMS: "defaultTerms",
  QUOTE_PRICING_STRATEGY: "pricingStrategy",

  // Financial
  FINANCIAL_CURRENCY: "currency",
  FINANCIAL_TAX_RATE: "taxRate",
  FINANCIAL_PAYMENT_METHODS: "paymentMethods",
  FINANCIAL_FISCAL_YEAR_START: "fiscalYearStart",

  // Formatting
  FORMAT_DATE: "dateFormat",
  FORMAT_TIME: "timeFormat",
  FORMAT_NUMBER: "numberFormat",
  FORMAT_CURRENCY: "currencyFormat",

  // Notifications
  NOTIFY_EMAIL_ENABLED: "emailEnabled",
  NOTIFY_SMS_ENABLED: "smsEnabled",
  NOTIFY_PUSH_ENABLED: "pushEnabled",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

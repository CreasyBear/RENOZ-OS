/**
 * Warranty Policies Schema
 *
 * Configurable warranty policies for batteries, inverters, and installations.
 * SLA terms reference the unified SLA engine (sla_configurations table).
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-001a
 * @see _Initiation/_prd/_meta/remediation-sla-engine.md for SLA integration
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  timestampColumns,
  auditColumns,
  standardRlsPolicies,
} from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { slaConfigurations } from "../support/sla-configurations";
import { users } from "../users/users";

// ============================================================================
// WARRANTY POLICY TYPE ENUM
// ============================================================================

export const warrantyPolicyTypeEnum = pgEnum("warranty_policy_type", [
  "battery_performance", // 10 years / 10,000 cycles
  "inverter_manufacturer", // 5 years
  "installation_workmanship", // 2 years
]);

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Terms stored as JSONB for flexibility.
 * Can include coverage exclusions, claim requirements, etc.
 */
export interface WarrantyPolicyTerms {
  coverage?: string[];
  exclusions?: string[];
  claimRequirements?: string[];
  transferable?: boolean;
  proratedAfterMonths?: number;
  [key: string]: string | string[] | number | boolean | null | undefined;
}

// ============================================================================
// WARRANTY POLICIES TABLE
// ============================================================================

export const warrantyPolicies = pgTable(
  "warranty_policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Policy identification
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),

    // Policy type: determines which products can use this policy
    type: warrantyPolicyTypeEnum("type").notNull(),

    // Duration in months (e.g., 120 for 10 years, 60 for 5 years, 24 for 2 years)
    durationMonths: integer("duration_months").notNull(),

    // Cycle limit for battery warranties (NULL for inverter/installation)
    cycleLimit: integer("cycle_limit"),

    // Terms as flexible JSONB
    terms: jsonb("terms").$type<WarrantyPolicyTerms>().default({}),

    // Reference to unified SLA configuration (domain='warranty')
    // SLA defines response and resolution targets
    slaConfigurationId: uuid("sla_configuration_id"),

    // Is this the default policy for its type in this org?
    isDefault: boolean("is_default").notNull().default(false),

    // Active flag
    isActive: boolean("is_active").notNull().default(true),

    ...auditColumns,
    ...timestampColumns,
  },
  (table) => ({
    // Unique policy name per org
    nameOrgUnique: uniqueIndex("idx_warranty_policies_name_org").on(
      table.organizationId,
      table.name
    ),

    // Quick lookup by org
    orgIdx: index("idx_warranty_policies_org").on(table.organizationId),

    // Quick lookup by type
    typeIdx: index("idx_warranty_policies_type").on(table.organizationId, table.type),

    // Default policy lookup
    defaultIdx: index("idx_warranty_policies_default").on(
      table.organizationId,
      table.type,
      table.isDefault
    ),

    // SLA configuration lookup
    slaIdx: index("idx_warranty_policies_sla").on(table.slaConfigurationId),

    // Standard CRUD RLS policies for org isolation
    ...standardRlsPolicies("warranty_policies"),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const warrantyPoliciesRelations = relations(
  warrantyPolicies,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [warrantyPolicies.organizationId],
      references: [organizations.id],
    }),
    slaConfiguration: one(slaConfigurations, {
      fields: [warrantyPolicies.slaConfigurationId],
      references: [slaConfigurations.id],
    }),
    createdByUser: one(users, {
      fields: [warrantyPolicies.createdBy],
      references: [users.id],
      relationName: "warrantyPolicyCreatedBy",
    }),
    updatedByUser: one(users, {
      fields: [warrantyPolicies.updatedBy],
      references: [users.id],
      relationName: "warrantyPolicyUpdatedBy",
    }),
  })
);

// ============================================================================
// TYPES
// ============================================================================

export type WarrantyPolicy = typeof warrantyPolicies.$inferSelect;
export type NewWarrantyPolicy = typeof warrantyPolicies.$inferInsert;
export type WarrantyPolicyType =
  (typeof warrantyPolicyTypeEnum.enumValues)[number];

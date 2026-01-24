/**
 * SLA Configurations Schema
 *
 * Unified SLA configuration table for all domains (support, warranty, jobs).
 * Replaces domain-specific sla_policies tables.
 *
 * @see _Initiation/_prd/_meta/remediation-sla-engine.md
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { timestampColumns } from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { users } from "../users";
import { slaDomainEnum, slaTargetUnitEnum } from "../_shared/enums";
import { businessHoursConfig } from "../settings/business-hours-config";

// ============================================================================
// SLA CONFIGURATIONS TABLE
// ============================================================================

export const slaConfigurations = pgTable(
  "sla_configurations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // What domain this SLA config applies to
    domain: slaDomainEnum("domain").notNull(),

    // Human-readable name (e.g., "Priority Support", "Battery Warranty", "Residential Install")
    name: text("name").notNull(),

    // Description
    description: text("description"),

    // Response time target (NULL if no response SLA)
    responseTargetValue: integer("response_target_value"),
    responseTargetUnit: slaTargetUnitEnum("response_target_unit"),

    // Resolution time target (NULL if no resolution SLA)
    resolutionTargetValue: integer("resolution_target_value"),
    resolutionTargetUnit: slaTargetUnitEnum("resolution_target_unit"),

    // At-risk warning threshold (percentage remaining, e.g., 25 means warn at 25% time left)
    atRiskThresholdPercent: integer("at_risk_threshold_percent")
      .notNull()
      .default(25),

    // Auto-escalate on breach?
    escalateOnBreach: boolean("escalate_on_breach").notNull().default(false),
    escalateToUserId: uuid("escalate_to_user_id"),

    // Link to business hours config (NULL = use org default or wall-clock time)
    businessHoursConfigId: uuid("business_hours_config_id"),

    // Is this the default for the domain in this org?
    isDefault: boolean("is_default").notNull().default(false),

    // Priority order (lower = higher priority, for selecting which SLA applies)
    priorityOrder: integer("priority_order").notNull().default(100),

    // Active?
    isActive: boolean("is_active").notNull().default(true),

    ...timestampColumns,
  },
  (table) => [
    // Unique name per org + domain
    uniqueIndex("idx_sla_config_org_domain_name").on(
      table.organizationId,
      table.domain,
      table.name
    ),
    // Quick lookup by org + domain
    index("idx_sla_config_org_domain").on(table.organizationId, table.domain),
    // Default lookup
    index("idx_sla_config_default").on(
      table.organizationId,
      table.domain,
      table.isDefault
    ),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const slaConfigurationsRelations = relations(
  slaConfigurations,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [slaConfigurations.organizationId],
      references: [organizations.id],
    }),
    escalateToUser: one(users, {
      fields: [slaConfigurations.escalateToUserId],
      references: [users.id],
    }),
    businessHours: one(businessHoursConfig, {
      fields: [slaConfigurations.businessHoursConfigId],
      references: [businessHoursConfig.id],
    }),
  })
);

// ============================================================================
// TYPES
// ============================================================================

export type SlaConfiguration = typeof slaConfigurations.$inferSelect;
export type NewSlaConfiguration = typeof slaConfigurations.$inferInsert;

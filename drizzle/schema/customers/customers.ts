/**
 * Customers Schema
 *
 * Complete Customer Relationship Management (CRM) database schema.
 * Includes customers, contacts, addresses, activities, tags, health metrics, and priorities.
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/2-domains/customers/customers.prd.json for full specification
 * @see _Initiation/_prd/1-foundation/patterns/canonical-enums.json for enum values
 */

import {
  pgTable,
  uuid,
  text,
  jsonb,
  boolean,
  integer,
  date,
  check,
  index,
  uniqueIndex,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  customerStatusEnum,
  customerTypeEnum,
  customerSizeEnum,
  addressTypeEnum,
  customerActivityTypeEnum,
  activityDirectionEnum,
  customerPriorityLevelEnum,
  serviceLevelEnum,
} from "../_shared/enums";
import {
  timestampColumns,
  auditColumns,
  softDeleteColumn,
  fullTextSearchSql,
  currencyColumnNullable,
  numericCasted,
} from "../_shared/patterns";
import { organizations } from "../settings/organizations";

// ============================================================================
// INTERFACES
// ============================================================================

export interface CustomerCustomFields {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Flexible metadata for customer activities (JSONB column)
 */
export interface CustomerActivityMetadata {
  [key: string]: string | number | boolean | null | undefined;
}

// ============================================================================
// CUSTOMERS TABLE (Enhanced)
// ============================================================================

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Customer code (auto-generated using nanoid pattern, unique per org)
    customerCode: text("customer_code")
      .notNull()
      .default(sql`'CUST-' || substr(gen_random_uuid()::text, 1, 8)`),

    // Basic info
    name: text("name").notNull(),
    legalName: text("legal_name"),
    email: text("email"),
    phone: text("phone"),
    website: text("website"),

    // Classification
    status: customerStatusEnum("status").notNull().default("prospect"),
    type: customerTypeEnum("type").notNull().default("business"),
    size: customerSizeEnum("size"),
    industry: text("industry"),

    // Business identifiers
    taxId: text("tax_id"), // ABN for Australian businesses
    registrationNumber: text("registration_number"),

    // Parent/child hierarchy
    parentId: uuid("parent_id").references((): any => customers.id, {
      onDelete: "set null",
    }),

    // Credit management
    creditLimit: currencyColumnNullable("credit_limit"),
    creditHold: boolean("credit_hold").notNull().default(false),
    creditHoldReason: text("credit_hold_reason"),

    // Health scoring (0-100)
    healthScore: integer("health_score"),
    healthScoreUpdatedAt: text("health_score_updated_at"), // ISO timestamp

    // Lifetime metrics
    lifetimeValue: currencyColumnNullable("lifetime_value"),
    firstOrderDate: date("first_order_date"),
    lastOrderDate: date("last_order_date"),
    totalOrders: integer("total_orders").notNull().default(0),
    totalOrderValue: currencyColumnNullable("total_order_value"),
    averageOrderValue: currencyColumnNullable("average_order_value"),

    // Flexible data
    tags: jsonb("tags").$type<string[]>().default([]),
    customFields: jsonb("custom_fields").$type<CustomerCustomFields>().default({}),

    // Warranty preferences (DOM-WAR-003d)
    // Opt-out of warranty expiry alert notifications for all warranties owned by this customer
    warrantyExpiryAlertOptOut: boolean("warranty_expiry_alert_opt_out").notNull().default(false),

    // Tracking
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumn,
  },
  (table) => ({
    // Unique customer code per organization
    customerCodeOrgUnique: uniqueIndex("idx_customers_code_org_unique")
      .on(table.organizationId, table.customerCode)
      .where(sql`${table.deletedAt} IS NULL`),

    // Unique email per organization (when set)
    emailOrgUnique: uniqueIndex("idx_customers_email_org_unique")
      .on(table.organizationId, table.email)
      .where(sql`${table.email} IS NOT NULL AND ${table.deletedAt} IS NULL`),

    // Multi-tenant queries
    orgStatusIdx: index("idx_customers_org_status").on(
      table.organizationId,
      table.status
    ),

    orgTypeIdx: index("idx_customers_org_type").on(
      table.organizationId,
      table.type
    ),

    // Health score queries
    orgHealthScoreIdx: index("idx_customers_org_health_score").on(
      table.organizationId,
      table.healthScore
    ),

    // Last order date for recency queries
    orgLastOrderIdx: index("idx_customers_org_last_order").on(
      table.organizationId,
      table.lastOrderDate
    ),

    // Parent hierarchy queries
    parentIdx: index("idx_customers_parent").on(table.parentId),

    // Cursor pagination index (org + createdAt DESC + id for deterministic ordering)
    orgCreatedIdIdx: index("idx_customers_org_created_id").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),

    // Full-text search on name
    nameSearchIdx: index("idx_customers_name_search").using(
      "gin",
      fullTextSearchSql(table.name)
    ),

    // GIN index for tags array queries
    tagsGinIdx: index("idx_customers_tags_gin").using("gin", table.tags),

    // Health score constraint
    healthScoreCheck: check(
      "health_score_range",
      sql`${table.healthScore} IS NULL OR (${table.healthScore} >= 0 AND ${table.healthScore} <= 100)`
    ),

    // Parent cannot be self
    parentNotSelfCheck: check(
      "parent_not_self",
      sql`${table.parentId} IS NULL OR ${table.parentId} != ${table.id}`
    ),

    // RLS Policies
    selectPolicy: pgPolicy("customers_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("customers_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("customers_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("customers_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// CONTACTS TABLE (Enhanced)
// ============================================================================

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Link to customer
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),

    // Contact info
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    title: text("title"), // Job title
    email: text("email"),
    phone: text("phone"),
    mobile: text("mobile"),
    department: text("department"),

    // Role flags
    isPrimary: boolean("is_primary").notNull().default(false),
    decisionMaker: boolean("decision_maker").notNull().default(false),
    influencer: boolean("influencer").notNull().default(false),

    // Communication preferences
    emailOptIn: boolean("email_opt_in").notNull().default(true),
    smsOptIn: boolean("sms_opt_in").notNull().default(false),
    emailOptInAt: text("email_opt_in_at"), // ISO timestamp when opted in/out
    smsOptInAt: text("sms_opt_in_at"), // ISO timestamp when opted in/out

    // Engagement tracking
    lastContactedAt: text("last_contacted_at"), // ISO timestamp

    // Notes
    notes: text("notes"),

    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    customerIdx: index("idx_contacts_customer").on(table.customerId),
    orgCustomerIdx: index("idx_contacts_org_customer").on(
      table.organizationId,
      table.customerId
    ),
    emailIdx: index("idx_contacts_email").on(table.email),
    isPrimaryIdx: index("idx_contacts_primary").on(
      table.customerId,
      table.isPrimary
    ),

    // RLS Policies
    selectPolicy: pgPolicy("contacts_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("contacts_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("contacts_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("contacts_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// ADDRESSES TABLE (Separate table for normalized addresses)
// ============================================================================

export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Link to customer
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),

    // Address type and flags
    type: addressTypeEnum("type").notNull().default("billing"),
    isPrimary: boolean("is_primary").notNull().default(false),

    // Address fields
    street1: text("street1").notNull(),
    street2: text("street2"),
    city: text("city").notNull(),
    state: text("state"),
    postcode: text("postcode").notNull(),
    country: text("country").notNull().default("AU"),

    // Geocoding
    latitude: numericCasted("latitude", { precision: 10, scale: 8 }),
    longitude: numericCasted("longitude", { precision: 11, scale: 8 }),

    // Notes
    notes: text("notes"),

    ...timestampColumns,
  },
  (table) => ({
    customerIdx: index("idx_addresses_customer").on(table.customerId),
    orgCustomerIdx: index("idx_addresses_org_customer").on(
      table.organizationId,
      table.customerId
    ),
    typeIdx: index("idx_addresses_type").on(table.customerId, table.type),
    postcodeIdx: index("idx_addresses_postcode").on(table.postcode),
    isPrimaryIdx: index("idx_addresses_primary").on(
      table.customerId,
      table.isPrimary
    ),

    // RLS Policies
    selectPolicy: pgPolicy("addresses_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("addresses_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("addresses_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("addresses_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// CUSTOMER ACTIVITIES TABLE
// ============================================================================

export const customerActivities = pgTable(
  "customer_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Links
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),

    // Activity details
    activityType: customerActivityTypeEnum("activity_type").notNull(),
    direction: activityDirectionEnum("direction"),
    subject: text("subject"),
    description: text("description").notNull(),
    outcome: text("outcome"),
    duration: integer("duration"), // in minutes

    // Scheduling
    scheduledAt: text("scheduled_at"), // ISO timestamp
    completedAt: text("completed_at"), // ISO timestamp

    // Assignment
    assignedTo: uuid("assigned_to"), // User ID

    // Flexible metadata
    metadata: jsonb("metadata").$type<CustomerActivityMetadata>().default({}),

    // Tracking (only createdAt, createdBy - activities are immutable)
    createdAt: text("created_at").notNull().default(sql`now()`),
    createdBy: uuid("created_by").notNull(),
  },
  (table) => ({
    customerIdx: index("idx_customer_activities_customer").on(table.customerId),
    orgCustomerIdx: index("idx_customer_activities_org_customer").on(
      table.organizationId,
      table.customerId
    ),
    contactIdx: index("idx_customer_activities_contact").on(table.contactId),
    typeIdx: index("idx_customer_activities_type").on(table.activityType),
    scheduledIdx: index("idx_customer_activities_scheduled").on(
      table.scheduledAt
    ),
    completedIdx: index("idx_customer_activities_completed").on(
      table.completedAt
    ),
    assignedIdx: index("idx_customer_activities_assigned").on(table.assignedTo),
    // Composite for timeline queries
    orgCustomerCreatedIdx: index("idx_customer_activities_org_customer_created").on(
      table.organizationId,
      table.customerId,
      table.createdAt
    ),
  })
);

// ============================================================================
// CUSTOMER TAGS TABLE (Tag definitions)
// ============================================================================

export const customerTags = pgTable(
  "customer_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Tag definition
    name: text("name").notNull(),
    description: text("description"),
    color: text("color").notNull().default("#6B7280"), // Tailwind gray-500
    category: text("category"),

    // Status
    isActive: boolean("is_active").notNull().default(true),

    // Usage tracking (denormalized for performance)
    usageCount: integer("usage_count").notNull().default(0),

    ...timestampColumns,
    createdBy: uuid("created_by").notNull(),
  },
  (table) => ({
    // Unique tag name per organization
    nameOrgUnique: uniqueIndex("idx_customer_tags_name_org_unique").on(
      table.organizationId,
      table.name
    ),
    orgCategoryIdx: index("idx_customer_tags_org_category").on(
      table.organizationId,
      table.category
    ),
    isActiveIdx: index("idx_customer_tags_active").on(
      table.organizationId,
      table.isActive
    ),
    usageCountIdx: index("idx_customer_tags_usage").on(table.usageCount),
  })
);

// ============================================================================
// CUSTOMER TAG ASSIGNMENTS TABLE (Many-to-many)
// ============================================================================

export const customerTagAssignments = pgTable(
  "customer_tag_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Links
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => customerTags.id, { onDelete: "cascade" }),

    // Tracking
    assignedBy: uuid("assigned_by").notNull(),
    assignedAt: text("assigned_at").notNull().default(sql`now()`),
    notes: text("notes"),
  },
  (table) => ({
    // Unique assignment per customer-tag pair
    customerTagUnique: uniqueIndex("idx_customer_tag_assignments_unique").on(
      table.customerId,
      table.tagId
    ),
    customerIdx: index("idx_customer_tag_assignments_customer").on(
      table.customerId
    ),
    tagIdx: index("idx_customer_tag_assignments_tag").on(table.tagId),
    // RLS Policies
    selectPolicy: pgPolicy("customer_tag_assignments_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("customer_tag_assignments_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("customer_tag_assignments_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("customer_tag_assignments_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// CUSTOMER HEALTH METRICS TABLE (Historical tracking)
// ============================================================================

export const customerHealthMetrics = pgTable(
  "customer_health_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Link to customer
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),

    // Metric date (one record per customer per day)
    metricDate: date("metric_date").notNull(),

    // RFM scores (0-100 scale)
    recencyScore: numericCasted("recency_score", { precision: 5, scale: 2 }),
    frequencyScore: numericCasted("frequency_score", { precision: 5, scale: 2 }),
    monetaryScore: numericCasted("monetary_score", { precision: 5, scale: 2 }),
    engagementScore: numericCasted("engagement_score", { precision: 5, scale: 2 }),

    // Calculated overall score
    overallScore: numericCasted("overall_score", { precision: 5, scale: 2 }),

    // Tracking
    createdAt: text("created_at").notNull().default(sql`now()`),
  },
  (table) => ({
    // Unique metric per customer per date
    customerDateUnique: uniqueIndex("idx_customer_health_metrics_unique").on(
      table.customerId,
      table.metricDate
    ),
    customerIdx: index("idx_customer_health_metrics_customer").on(
      table.customerId
    ),
    orgCustomerIdx: index("idx_customer_health_metrics_org_customer").on(
      table.organizationId,
      table.customerId
    ),
    metricDateIdx: index("idx_customer_health_metrics_date").on(
      table.metricDate
    ),
    overallScoreIdx: index("idx_customer_health_metrics_overall").on(
      table.overallScore
    ),

    // Score range checks
    recencyScoreCheck: check(
      "recency_score_range",
      sql`${table.recencyScore} IS NULL OR (${table.recencyScore} >= 0 AND ${table.recencyScore} <= 100)`
    ),
    frequencyScoreCheck: check(
      "frequency_score_range",
      sql`${table.frequencyScore} IS NULL OR (${table.frequencyScore} >= 0 AND ${table.frequencyScore} <= 100)`
    ),
    monetaryScoreCheck: check(
      "monetary_score_range",
      sql`${table.monetaryScore} IS NULL OR (${table.monetaryScore} >= 0 AND ${table.monetaryScore} <= 100)`
    ),
    engagementScoreCheck: check(
      "engagement_score_range",
      sql`${table.engagementScore} IS NULL OR (${table.engagementScore} >= 0 AND ${table.engagementScore} <= 100)`
    ),
    overallScoreCheck: check(
      "overall_score_range",
      sql`${table.overallScore} IS NULL OR (${table.overallScore} >= 0 AND ${table.overallScore} <= 100)`
    ),
  })
);

// ============================================================================
// CUSTOMER PRIORITIES TABLE (Account management settings)
// ============================================================================

export const customerPriorities = pgTable(
  "customer_priorities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Link to customer (one-to-one)
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),

    // Priority settings
    priorityLevel: customerPriorityLevelEnum("priority_level")
      .notNull()
      .default("medium"),
    accountManager: uuid("account_manager"), // User ID
    serviceLevel: serviceLevelEnum("service_level").notNull().default("standard"),

    // Contract info
    contractValue: currencyColumnNullable("contract_value"),
    contractStartDate: date("contract_start_date"),
    contractEndDate: date("contract_end_date"),
    specialTerms: text("special_terms"),

    ...timestampColumns,
  },
  (table) => ({
    // One priority record per customer
    customerUnique: uniqueIndex("idx_customer_priorities_customer_unique").on(
      table.customerId
    ),
    orgCustomerIdx: index("idx_customer_priorities_org_customer").on(
      table.organizationId,
      table.customerId
    ),
    priorityLevelIdx: index("idx_customer_priorities_level").on(
      table.priorityLevel
    ),
    accountManagerIdx: index("idx_customer_priorities_manager").on(
      table.accountManager
    ),

    // Contract date validation
    contractDatesCheck: check(
      "contract_dates_valid",
      sql`${table.contractEndDate} IS NULL OR ${table.contractStartDate} IS NULL OR ${table.contractEndDate} > ${table.contractStartDate}`
    ),
  })
);

// ============================================================================
// CUSTOMER MERGE AUDIT TABLE (Tracks merge and dismissal history)
// ============================================================================

export const customerMergeAudit = pgTable(
  "customer_merge_audit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // The primary (surviving) customer
    primaryCustomerId: uuid("primary_customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "set null" }),

    // The merged (archived) customer - may be null if customer was deleted
    mergedCustomerId: uuid("merged_customer_id")
      .references(() => customers.id, { onDelete: "set null" }),

    // Action taken
    action: text("action").notNull(), // 'merged', 'dismissed', 'undone'

    // Reason for the action
    reason: text("reason"),

    // Who performed the action
    performedBy: uuid("performed_by").notNull(),
    performedAt: text("performed_at").notNull().default(sql`now()`),

    // Snapshot of merged data (for undo capability)
    mergedData: jsonb("merged_data").$type<Record<string, unknown>>().default({}),

    // Additional metadata
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  },
  (table) => ({
    orgIdx: index("idx_customer_merge_audit_org").on(table.organizationId),
    primaryCustomerIdx: index("idx_customer_merge_audit_primary").on(
      table.primaryCustomerId
    ),
    mergedCustomerIdx: index("idx_customer_merge_audit_merged").on(
      table.mergedCustomerId
    ),
    actionIdx: index("idx_customer_merge_audit_action").on(table.action),
    performedAtIdx: index("idx_customer_merge_audit_performed_at").on(
      table.performedAt
    ),
    // Composite for history queries
    orgPerformedAtIdx: index("idx_customer_merge_audit_org_performed").on(
      table.organizationId,
      table.performedAt
    ),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const customersRelations = relations(customers, ({ one, many }) => ({
  parent: one(customers, {
    fields: [customers.parentId],
    references: [customers.id],
    relationName: "customerHierarchy",
  }),
  children: many(customers, {
    relationName: "customerHierarchy",
  }),
  contacts: many(contacts),
  addresses: many(addresses),
  activities: many(customerActivities),
  tagAssignments: many(customerTagAssignments),
  healthMetrics: many(customerHealthMetrics),
  priority: one(customerPriorities, {
    fields: [customers.id],
    references: [customerPriorities.customerId],
  }),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  customer: one(customers, {
    fields: [contacts.customerId],
    references: [customers.id],
  }),
  activities: many(customerActivities),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  customer: one(customers, {
    fields: [addresses.customerId],
    references: [customers.id],
  }),
}));

export const customerActivitiesRelations = relations(
  customerActivities,
  ({ one }) => ({
    customer: one(customers, {
      fields: [customerActivities.customerId],
      references: [customers.id],
    }),
    contact: one(contacts, {
      fields: [customerActivities.contactId],
      references: [contacts.id],
    }),
  })
);

export const customerTagsRelations = relations(customerTags, ({ many }) => ({
  assignments: many(customerTagAssignments),
}));

export const customerTagAssignmentsRelations = relations(
  customerTagAssignments,
  ({ one }) => ({
    customer: one(customers, {
      fields: [customerTagAssignments.customerId],
      references: [customers.id],
    }),
    tag: one(customerTags, {
      fields: [customerTagAssignments.tagId],
      references: [customerTags.id],
    }),
  })
);

export const customerHealthMetricsRelations = relations(
  customerHealthMetrics,
  ({ one }) => ({
    customer: one(customers, {
      fields: [customerHealthMetrics.customerId],
      references: [customers.id],
    }),
  })
);

export const customerPrioritiesRelations = relations(
  customerPriorities,
  ({ one }) => ({
    customer: one(customers, {
      fields: [customerPriorities.customerId],
      references: [customers.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type Address = typeof addresses.$inferSelect;
export type NewAddress = typeof addresses.$inferInsert;
export type CustomerActivity = typeof customerActivities.$inferSelect;
export type NewCustomerActivity = typeof customerActivities.$inferInsert;
export type CustomerTag = typeof customerTags.$inferSelect;
export type NewCustomerTag = typeof customerTags.$inferInsert;
export type CustomerTagAssignment = typeof customerTagAssignments.$inferSelect;
export type NewCustomerTagAssignment = typeof customerTagAssignments.$inferInsert;
export type CustomerHealthMetric = typeof customerHealthMetrics.$inferSelect;
export type NewCustomerHealthMetric = typeof customerHealthMetrics.$inferInsert;
export type CustomerPriority = typeof customerPriorities.$inferSelect;
export type NewCustomerPriority = typeof customerPriorities.$inferInsert;
export type CustomerMergeAudit = typeof customerMergeAudit.$inferSelect;
export type NewCustomerMergeAudit = typeof customerMergeAudit.$inferInsert;

/**
 * Issues Schema
 *
 * Support tickets for battery systems, inverters, and installation issues.
 * Linked to unified SLA tracking via sla_tracking_id FK.
 *
 * @see _Initiation/_prd/2-domains/support/support.prd.json
 * @see _Initiation/_prd/_meta/remediation-sla-engine.md
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  timestampColumns,
  auditColumns,
  softDeleteColumn,
  standardRlsPolicies,
} from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { users } from "../users";
import { customers } from "../customers";
import {
  issueNextActionTypeEnum,
  issuePriorityEnum,
  issueResolutionCategoryEnum,
  issueStatusEnum,
  issueTypeEnum,
} from "../_shared/enums";
import { slaTracking } from "./sla-tracking";
import { serializedItems } from "../inventory/serialized-lineage";
import { serviceSystems } from "../service/service-systems";
import { warranties } from "../warranty/warranties";
import { warrantyEntitlements } from "../warranty/warranty-entitlements";
import { orders } from "../orders/orders";
import { orderShipments } from "../orders/order-shipments";
import { products } from "../products/products";

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Flexible metadata for issues (JSONB column)
 */
export interface IssueMetadata {
  // Compatibility anchors - kept in metadata during phase 2A dual-write.
  warrantyId?: string;
  warrantyEntitlementId?: string;
  orderId?: string;
  shipmentId?: string;
  productId?: string;
  serializedItemId?: string;
  serviceSystemId?: string;

  // Battery-specific data
  serialNumber?: string;
  batteryModel?: string;
  installedDate?: string;
  sohReading?: number; // State of Health percentage
  inverterErrorCode?: string;
  inverterModel?: string;

  // Additional optional fields for extensibility
  // Note: Use Zod schema with .passthrough() for runtime validation of extra fields
  customField1?: string;
  customField2?: string;
  customField3?: string;
  notes?: string;
}

// ============================================================================
// ISSUES TABLE
// ============================================================================

export const issues = pgTable(
  "issues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Issue identifier (auto-generated)
    issueNumber: text("issue_number")
      .notNull()
      .default(sql`'ISS-' || substr(gen_random_uuid()::text, 1, 8)`),

    // Basic info
    title: text("title").notNull(),
    description: text("description"),

    // Classification
    type: issueTypeEnum("type").notNull().default("other"),
    priority: issuePriorityEnum("priority").notNull().default("medium"),
    status: issueStatusEnum("status").notNull().default("open"),

    // Associations
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    warrantyId: uuid("warranty_id").references(() => warranties.id, {
      onDelete: "set null",
    }),
    warrantyEntitlementId: uuid("warranty_entitlement_id").references(
      () => warrantyEntitlements.id,
      {
        onDelete: "set null",
      }
    ),
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    shipmentId: uuid("shipment_id").references(() => orderShipments.id, {
      onDelete: "set null",
    }),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    serializedItemId: uuid("serialized_item_id").references(() => serializedItems.id, {
      onDelete: "set null",
    }),
    serviceSystemId: uuid("service_system_id").references(() => serviceSystems.id, {
      onDelete: "set null",
    }),
    serialNumber: text("serial_number"),
    assignedToUserId: uuid("assigned_to_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    // SLA tracking via unified engine (replaces inline SLA columns)
    slaTrackingId: uuid("sla_tracking_id").references(() => slaTracking.id, {
      onDelete: "set null",
    }),

    // For pause reasons (when on_hold status)
    holdReason: text("hold_reason"),

    // Escalation tracking
    escalatedAt: timestamp("escalated_at", { withTimezone: true }),
    escalatedBy: uuid("escalated_by"),
    escalationReason: text("escalation_reason"),

    // Resolution
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedByUserId: uuid("resolved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    resolutionCategory: issueResolutionCategoryEnum("resolution_category"),
    resolutionNotes: text("resolution_notes"),
    diagnosisNotes: text("diagnosis_notes"),
    nextActionType: issueNextActionTypeEnum("next_action_type"),

    // Battery/inverter specific metadata
    metadata: jsonb("metadata").$type<IssueMetadata>(),

    // Tags for filtering
    tags: text("tags").array(),

    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumn,
  },
  (table) => ({
    // Lookup by customer
    customerIdx: index("idx_issues_customer").on(table.customerId),
    warrantyIdx: index("idx_issues_warranty").on(table.warrantyId),
    warrantyEntitlementIdx: index("idx_issues_warranty_entitlement").on(
      table.warrantyEntitlementId
    ),
    orderIdx: index("idx_issues_order").on(table.orderId),
    shipmentIdx: index("idx_issues_shipment").on(table.shipmentId),
    productIdx: index("idx_issues_product").on(table.productId),
    serializedItemIdx: index("idx_issues_serialized_item").on(table.serializedItemId),
    serviceSystemIdx: index("idx_issues_service_system").on(table.serviceSystemId),
    serialIdx: index("idx_issues_serial_number").on(table.serialNumber),
    resolutionCategoryIdx: index("idx_issues_resolution_category").on(
      table.organizationId,
      table.resolutionCategory
    ),
    nextActionTypeIdx: index("idx_issues_next_action_type").on(
      table.organizationId,
      table.nextActionType
    ),
    // Lookup by assignee
    assigneeIdx: index("idx_issues_assignee").on(table.assignedToUserId),
    // Filter by status
    statusIdx: index("idx_issues_status").on(table.organizationId, table.status),
    // Filter by priority
    priorityIdx: index("idx_issues_priority").on(table.organizationId, table.priority),
    // SLA tracking lookup
    slaTrackingIdx: index("idx_issues_sla_tracking").on(table.slaTrackingId),
    // Escalated issues
    escalatedIdx: index("idx_issues_escalated").on(table.organizationId, table.escalatedAt),
    // Org + createdAt for listing
    orgCreatedIdx: index("idx_issues_org_created").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),

    // Standard CRUD RLS policies for org isolation
    ...standardRlsPolicies("issues"),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const issuesRelations = relations(issues, ({ one }) => ({
  organization: one(organizations, {
    fields: [issues.organizationId],
    references: [organizations.id],
  }),
  customer: one(customers, {
    fields: [issues.customerId],
    references: [customers.id],
  }),
  warranty: one(warranties, {
    fields: [issues.warrantyId],
    references: [warranties.id],
  }),
  warrantyEntitlement: one(warrantyEntitlements, {
    fields: [issues.warrantyEntitlementId],
    references: [warrantyEntitlements.id],
  }),
  order: one(orders, {
    fields: [issues.orderId],
    references: [orders.id],
  }),
  shipment: one(orderShipments, {
    fields: [issues.shipmentId],
    references: [orderShipments.id],
  }),
  product: one(products, {
    fields: [issues.productId],
    references: [products.id],
  }),
  serializedItem: one(serializedItems, {
    fields: [issues.serializedItemId],
    references: [serializedItems.id],
  }),
  serviceSystem: one(serviceSystems, {
    fields: [issues.serviceSystemId],
    references: [serviceSystems.id],
  }),
  assignedTo: one(users, {
    fields: [issues.assignedToUserId],
    references: [users.id],
    relationName: "assignedTo",
  }),
  escalatedByUser: one(users, {
    fields: [issues.escalatedBy],
    references: [users.id],
    relationName: "escalatedBy",
  }),
  resolvedByUser: one(users, {
    fields: [issues.resolvedByUserId],
    references: [users.id],
    relationName: "resolvedBy",
  }),
  slaTracking: one(slaTracking, {
    fields: [issues.slaTrackingId],
    references: [slaTracking.id],
  }),
}));

// ============================================================================
// TYPES
// ============================================================================

export type Issue = typeof issues.$inferSelect;
export type NewIssue = typeof issues.$inferInsert;

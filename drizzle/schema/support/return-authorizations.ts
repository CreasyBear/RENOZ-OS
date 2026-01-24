/**
 * Return Authorization (RMA) Schema
 *
 * Manages return merchandise authorizations for defective battery/inverter returns.
 * Links issues to order line items for formal return processing.
 *
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-003a
 */

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  jsonb,
  index,
  uniqueIndex,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  timestampColumns,
  auditColumns,
} from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { users } from "../users";
import { issues } from "./issues";
import { customers } from "../customers/customers";
import { orders, orderLineItems } from "../orders";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * RMA workflow statuses
 * - requested: Initial state, customer/support has requested return
 * - approved: Manager/system approved the return
 * - received: Item physically received at warehouse
 * - processed: Return fully processed (refund/replacement issued)
 * - rejected: Return request was rejected
 */
export const rmaStatusEnum = pgEnum("rma_status", [
  "requested",
  "approved",
  "received",
  "processed",
  "rejected",
]);

/**
 * RMA return reason categories
 */
export const rmaReasonEnum = pgEnum("rma_reason", [
  "defective",
  "damaged_in_shipping",
  "wrong_item",
  "not_as_described",
  "performance_issue",
  "installation_failure",
  "other",
]);

/**
 * RMA resolution types
 */
export const rmaResolutionEnum = pgEnum("rma_resolution", [
  "refund",
  "replacement",
  "repair",
  "credit",
  "no_action",
]);

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Inspection notes recorded when item is received
 */
export interface RmaInspectionNotes {
  inspectedAt?: string; // ISO timestamp
  inspectedBy?: string; // User ID
  condition?: "good" | "damaged" | "defective" | "missing_parts";
  notes?: string;
  photos?: string[]; // Attachment IDs
}

/**
 * Resolution details when RMA is processed
 */
export interface RmaResolutionDetails {
  resolvedAt?: string; // ISO timestamp
  resolvedBy?: string; // User ID
  refundAmount?: number;
  replacementOrderId?: string;
  creditNoteId?: string;
  notes?: string;
}

// ============================================================================
// RETURN AUTHORIZATIONS TABLE
// ============================================================================

export const returnAuthorizations = pgTable(
  "return_authorizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // RMA identification (RMA-000001 format)
    rmaNumber: text("rma_number").notNull(),

    // Link to originating issue (optional - RMA can exist without issue)
    issueId: uuid("issue_id").references(() => issues.id, { onDelete: "set null" }),

    // Link to customer (required for standalone RMAs)
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),

    // Link to original order (required)
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),

    // Workflow status
    status: rmaStatusEnum("status").notNull().default("requested"),

    // Return details
    reason: rmaReasonEnum("reason").notNull(),
    reasonDetails: text("reason_details"), // Additional context for return reason

    // Resolution
    resolution: rmaResolutionEnum("resolution"),
    resolutionDetails: jsonb("resolution_details").$type<RmaResolutionDetails>(),

    // Inspection
    inspectionNotes: jsonb("inspection_notes").$type<RmaInspectionNotes>(),

    // Notes
    internalNotes: text("internal_notes"), // Staff-only notes
    customerNotes: text("customer_notes"), // Customer-provided notes

    // Workflow tracking
    approvedAt: text("approved_at"), // ISO timestamp
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
    receivedAt: text("received_at"), // ISO timestamp
    receivedBy: uuid("received_by").references(() => users.id, { onDelete: "set null" }),
    processedAt: text("processed_at"), // ISO timestamp
    processedBy: uuid("processed_by").references(() => users.id, { onDelete: "set null" }),
    rejectedAt: text("rejected_at"), // ISO timestamp
    rejectedBy: uuid("rejected_by").references(() => users.id, { onDelete: "set null" }),
    rejectionReason: text("rejection_reason"),

    // Sequence number for RMA generation (per organization)
    sequenceNumber: integer("sequence_number").notNull(),

    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    // Unique RMA number per organization
    uniqueIndex("idx_rma_number_org_unique").on(
      table.organizationId,
      table.rmaNumber
    ),

    // Find RMAs by issue
    index("idx_rma_issue").on(table.issueId),

    // Find RMAs by customer
    index("idx_rma_customer").on(table.customerId),

    // Find RMAs by order
    index("idx_rma_order").on(table.orderId),

    // Find RMAs by status
    index("idx_rma_org_status").on(table.organizationId, table.status),

    // Find recent RMAs
    index("idx_rma_org_created").on(table.organizationId, table.createdAt),
  ]
);

// ============================================================================
// RMA LINE ITEMS TABLE
// ============================================================================

/**
 * Line items included in an RMA
 * Links RMA to specific order line items being returned
 */
export const rmaLineItems = pgTable(
  "rma_line_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Parent RMA
    rmaId: uuid("rma_id")
      .notNull()
      .references(() => returnAuthorizations.id, { onDelete: "cascade" }),

    // Original order line item
    orderLineItemId: uuid("order_line_item_id")
      .notNull()
      .references(() => orderLineItems.id, { onDelete: "restrict" }),

    // Quantity being returned (may be less than ordered)
    quantityReturned: integer("quantity_returned").notNull().default(1),

    // Item-specific reason if different from RMA reason
    itemReason: text("item_reason"),

    // Item-specific inspection notes
    itemCondition: text("item_condition"),

    // Serial number if applicable
    serialNumber: text("serial_number"),

    ...timestampColumns,
  },
  (table) => ({
    // Find line items for RMA
    rmaIdx: index("idx_rma_line_items_rma").on(table.rmaId),

    // Find RMAs containing specific order line item
    orderLineIdx: index("idx_rma_line_items_order_line").on(table.orderLineItemId),

    // RLS Policies - inherit from return_authorizations org
    selectPolicy: pgPolicy("rma_line_items_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`EXISTS (
        SELECT 1 FROM return_authorizations ra
        WHERE ra.id = rma_id
        AND ra.organization_id = current_setting('app.organization_id', true)::uuid
      )`,
    }),
    insertPolicy: pgPolicy("rma_line_items_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`EXISTS (
        SELECT 1 FROM return_authorizations ra
        WHERE ra.id = rma_id
        AND ra.organization_id = current_setting('app.organization_id', true)::uuid
      )`,
    }),
    updatePolicy: pgPolicy("rma_line_items_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`EXISTS (
        SELECT 1 FROM return_authorizations ra
        WHERE ra.id = rma_id
        AND ra.organization_id = current_setting('app.organization_id', true)::uuid
      )`,
      withCheck: sql`EXISTS (
        SELECT 1 FROM return_authorizations ra
        WHERE ra.id = rma_id
        AND ra.organization_id = current_setting('app.organization_id', true)::uuid
      )`,
    }),
    deletePolicy: pgPolicy("rma_line_items_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`EXISTS (
        SELECT 1 FROM return_authorizations ra
        WHERE ra.id = rma_id
        AND ra.organization_id = current_setting('app.organization_id', true)::uuid
      )`,
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const returnAuthorizationsRelations = relations(
  returnAuthorizations,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [returnAuthorizations.organizationId],
      references: [organizations.id],
    }),
    issue: one(issues, {
      fields: [returnAuthorizations.issueId],
      references: [issues.id],
    }),
    approvedByUser: one(users, {
      fields: [returnAuthorizations.approvedBy],
      references: [users.id],
      relationName: "rma_approved_by",
    }),
    receivedByUser: one(users, {
      fields: [returnAuthorizations.receivedBy],
      references: [users.id],
      relationName: "rma_received_by",
    }),
    processedByUser: one(users, {
      fields: [returnAuthorizations.processedBy],
      references: [users.id],
      relationName: "rma_processed_by",
    }),
    rejectedByUser: one(users, {
      fields: [returnAuthorizations.rejectedBy],
      references: [users.id],
      relationName: "rma_rejected_by",
    }),
    lineItems: many(rmaLineItems),
  })
);

export const rmaLineItemsRelations = relations(rmaLineItems, ({ one }) => ({
  rma: one(returnAuthorizations, {
    fields: [rmaLineItems.rmaId],
    references: [returnAuthorizations.id],
  }),
  orderLineItem: one(orderLineItems, {
    fields: [rmaLineItems.orderLineItemId],
    references: [orderLineItems.id],
  }),
}));

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate RMA number from sequence
 * Format: RMA-000001
 */
export function generateRmaNumber(sequenceNumber: number): string {
  return `RMA-${String(sequenceNumber).padStart(6, "0")}`;
}

/**
 * Valid status transitions for RMA workflow
 */
export const RMA_STATUS_TRANSITIONS: Record<string, string[]> = {
  requested: ["approved", "rejected"],
  approved: ["received", "rejected"],
  received: ["processed"],
  processed: [], // Terminal state
  rejected: [], // Terminal state
};

/**
 * Check if a status transition is valid
 */
export function isValidRmaTransition(
  currentStatus: string,
  newStatus: string
): boolean {
  const validTransitions = RMA_STATUS_TRANSITIONS[currentStatus] ?? [];
  return validTransitions.includes(newStatus);
}

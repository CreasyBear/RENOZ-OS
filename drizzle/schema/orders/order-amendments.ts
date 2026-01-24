/**
 * Order Amendments Schema
 *
 * Change tracking and approval workflow for order modifications.
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-AMENDMENTS-SCHEMA)
 */

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  timestampColumns,
  auditColumns,
  softDeleteColumn,
} from "../_shared/patterns";
import { amendmentStatusEnum } from "../_shared/enums";
import { orders } from "./orders";
import { users } from "../users/users";
import { organizations } from "../settings/organizations";

// Re-export for backwards compatibility
export { amendmentStatusEnum };

export const amendmentTypeEnum = pgEnum("amendment_type", [
  "quantity_change",    // Changing item quantities
  "item_add",           // Adding new items
  "item_remove",        // Removing items
  "price_change",       // Modifying prices
  "discount_change",    // Adjusting discounts
  "shipping_change",    // Modifying shipping details
  "address_change",     // Changing delivery address
  "date_change",        // Changing promised dates
  "cancel_order",       // Full order cancellation
  "other",              // Other changes
]);

// ============================================================================
// TYPES
// ============================================================================

export interface AmendmentChanges {
  // Generic structure for any change
  type: string;
  description: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  // Specific item changes
  itemChanges?: Array<{
    orderLineItemId?: string;
    productId?: string;
    action: "add" | "modify" | "remove";
    before?: {
      quantity?: number;
      unitPrice?: number;
      description?: string;
      discountPercent?: number;
      discountAmount?: number;
    };
    after?: {
      quantity?: number;
      unitPrice?: number;
      description?: string;
      discountPercent?: number;
      discountAmount?: number;
    };
  }>;
  // Financial impact
  financialImpact?: {
    subtotalBefore: number;
    subtotalAfter: number;
    taxBefore: number;
    taxAfter: number;
    totalBefore: number;
    totalAfter: number;
    difference: number;
  };
}

export interface AmendmentApprovalNotes {
  note?: string;
  conditions?: string[];
  internalOnly?: boolean;
}

// ============================================================================
// ORDER AMENDMENTS TABLE
// ============================================================================

export const orderAmendments = pgTable(
  "order_amendments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Order reference
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),

    // Amendment type and details
    amendmentType: amendmentTypeEnum("amendment_type").notNull(),
    reason: text("reason").notNull(), // Why the change is requested
    changes: jsonb("changes").notNull().$type<AmendmentChanges>(),

    // Workflow status
    status: amendmentStatusEnum("status").notNull().default("requested"),

    // Request info
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),

    // Approval info
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    approvalNotes: jsonb("approval_notes").$type<AmendmentApprovalNotes>(),

    // Application info
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    appliedBy: uuid("applied_by").references(() => users.id, {
      onDelete: "set null",
    }),

    // Version tracking (for optimistic locking)
    orderVersionBefore: integer("order_version_before"),
    orderVersionAfter: integer("order_version_after"),

    // Timestamps and audit
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumn,
  },
  (table) => [
    // Performance indexes
    index("order_amendments_org_idx").on(table.organizationId),
    index("order_amendments_order_idx").on(table.orderId),
    index("order_amendments_status_idx").on(table.organizationId, table.status),
    index("order_amendments_requested_idx").on(
      table.organizationId,
      table.requestedAt.desc()
    ),
    index("order_amendments_org_created_idx").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const orderAmendmentsRelations = relations(
  orderAmendments,
  ({ one }) => ({
    order: one(orders, {
      fields: [orderAmendments.orderId],
      references: [orders.id],
    }),
    requestedByUser: one(users, {
      fields: [orderAmendments.requestedBy],
      references: [users.id],
      relationName: "amendmentRequester",
    }),
    reviewedByUser: one(users, {
      fields: [orderAmendments.reviewedBy],
      references: [users.id],
      relationName: "amendmentReviewer",
    }),
    appliedByUser: one(users, {
      fields: [orderAmendments.appliedBy],
      references: [users.id],
      relationName: "amendmentApplier",
    }),
  })
);

// ============================================================================
// TYPES
// ============================================================================

export type OrderAmendment = typeof orderAmendments.$inferSelect;
export type NewOrderAmendment = typeof orderAmendments.$inferInsert;
export type AmendmentStatus = (typeof amendmentStatusEnum.enumValues)[number];
export type AmendmentType = (typeof amendmentTypeEnum.enumValues)[number];

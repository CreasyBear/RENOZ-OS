/**
 * Warranty Entitlements Schema
 *
 * Commercial warranty coverage truth created from delivered order items.
 * One row represents one activatable covered unit.
 */

import {
  pgEnum,
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  auditColumns,
  standardRlsPolicies,
  timestampColumns,
} from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { orders, orderLineItems } from "../orders/orders";
import { orderShipments, shipmentItems } from "../orders/order-shipments";
import { customers } from "../customers/customers";
import { products } from "../products/products";
import { warrantyPolicies } from "./warranty-policies";
import { serializedItems } from "../inventory/serialized-lineage";
import { users } from "../users/users";

export const warrantyEntitlementEvidenceTypeEnum = pgEnum(
  "warranty_entitlement_evidence_type",
  ["serialized", "unitized"]
);

export const warrantyEntitlementStatusEnum = pgEnum("warranty_entitlement_status", [
  "pending_activation",
  "needs_review",
  "activated",
  "voided",
]);

export const warrantyEntitlementProvisioningIssueCodeEnum = pgEnum(
  "warranty_entitlement_issue_code",
  ["missing_serial_capture", "policy_unresolved"]
);

export const warrantyEntitlements = pgTable(
  "warranty_entitlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => orderShipments.id, { onDelete: "cascade" }),
    shipmentItemId: uuid("shipment_item_id")
      .notNull()
      .references(() => shipmentItems.id, { onDelete: "cascade" }),
    orderLineItemId: uuid("order_line_item_id")
      .notNull()
      .references(() => orderLineItems.id, { onDelete: "cascade" }),
    commercialCustomerId: uuid("commercial_customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    warrantyPolicyId: uuid("warranty_policy_id").references(() => warrantyPolicies.id, {
      onDelete: "set null",
    }),
    serializedItemId: uuid("serialized_item_id").references(() => serializedItems.id, {
      onDelete: "set null",
    }),
    productSerial: varchar("product_serial", { length: 255 }),
    unitSequence: integer("unit_sequence"),
    evidenceType: warrantyEntitlementEvidenceTypeEnum("evidence_type").notNull(),
    status: warrantyEntitlementStatusEnum("status")
      .notNull()
      .default("pending_activation"),
    provisioningIssueCode:
      warrantyEntitlementProvisioningIssueCodeEnum("provisioning_issue_code"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }).notNull(),
    ...auditColumns,
    ...timestampColumns,
  },
  (table) => ({
    serializedUnique: uniqueIndex("idx_warranty_entitlements_serialized_unique")
      .on(table.organizationId, table.shipmentItemId, table.serializedItemId)
      .where(sql`${table.serializedItemId} IS NOT NULL`),
    serialTextUnique: uniqueIndex("idx_warranty_entitlements_serial_text_unique")
      .on(table.organizationId, table.shipmentItemId, table.productSerial)
      .where(sql`${table.productSerial} IS NOT NULL`),
    unitizedUnique: uniqueIndex("idx_warranty_entitlements_unitized_unique")
      .on(table.organizationId, table.shipmentItemId, table.unitSequence)
      .where(sql`${table.unitSequence} IS NOT NULL`),
    orgStatusIdx: index("idx_warranty_entitlements_org_status").on(
      table.organizationId,
      table.status
    ),
    orgDeliveredIdx: index("idx_warranty_entitlements_org_delivered").on(
      table.organizationId,
      table.deliveredAt
    ),
    orderIdx: index("idx_warranty_entitlements_order").on(table.orderId),
    shipmentIdx: index("idx_warranty_entitlements_shipment").on(table.shipmentId),
    customerIdx: index("idx_warranty_entitlements_customer").on(table.commercialCustomerId),
    productIdx: index("idx_warranty_entitlements_product").on(table.productId),
    policyIdx: index("idx_warranty_entitlements_policy").on(table.warrantyPolicyId),
    ...standardRlsPolicies("warranty_entitlements"),
  })
);

export const warrantyEntitlementsRelations = relations(
  warrantyEntitlements,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [warrantyEntitlements.organizationId],
      references: [organizations.id],
    }),
    order: one(orders, {
      fields: [warrantyEntitlements.orderId],
      references: [orders.id],
    }),
    shipment: one(orderShipments, {
      fields: [warrantyEntitlements.shipmentId],
      references: [orderShipments.id],
    }),
    shipmentItem: one(shipmentItems, {
      fields: [warrantyEntitlements.shipmentItemId],
      references: [shipmentItems.id],
    }),
    orderLineItem: one(orderLineItems, {
      fields: [warrantyEntitlements.orderLineItemId],
      references: [orderLineItems.id],
    }),
    commercialCustomer: one(customers, {
      fields: [warrantyEntitlements.commercialCustomerId],
      references: [customers.id],
    }),
    product: one(products, {
      fields: [warrantyEntitlements.productId],
      references: [products.id],
    }),
    warrantyPolicy: one(warrantyPolicies, {
      fields: [warrantyEntitlements.warrantyPolicyId],
      references: [warrantyPolicies.id],
    }),
    serializedItem: one(serializedItems, {
      fields: [warrantyEntitlements.serializedItemId],
      references: [serializedItems.id],
    }),
    createdByUser: one(users, {
      fields: [warrantyEntitlements.createdBy],
      references: [users.id],
      relationName: "warrantyEntitlementCreatedBy",
    }),
    updatedByUser: one(users, {
      fields: [warrantyEntitlements.updatedBy],
      references: [users.id],
      relationName: "warrantyEntitlementUpdatedBy",
    }),
  })
);

export type WarrantyEntitlement = typeof warrantyEntitlements.$inferSelect;
export type NewWarrantyEntitlement = typeof warrantyEntitlements.$inferInsert;

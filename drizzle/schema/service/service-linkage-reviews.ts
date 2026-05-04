/**
 * Service Linkage Reviews Schema
 *
 * Review queue for ambiguous owner/system linkage decisions.
 */

import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  auditColumns,
  standardRlsPolicies,
  timestampColumns,
} from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { users } from "../users/users";
import { customers } from "../customers/customers";
import { orders } from "../orders/orders";
import { projects } from "../jobs/projects";
import { warranties } from "../warranty/warranties";
import { warrantyEntitlements } from "../warranty/warranty-entitlements";
import { serviceSystems } from "./service-systems";

export const serviceLinkageReviewStatusEnum = pgEnum("service_linkage_review_status", [
  "pending",
  "resolved",
  "dismissed",
]);

export const serviceLinkageReviewReasonEnum = pgEnum("service_linkage_review_reason", [
  "multiple_system_matches",
  "conflicting_owner_match",
  "backfill_manual_review",
]);

export interface ServiceLinkageReviewSnapshot {
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  normalizedSiteAddressKey?: string | null;
  siteAddress?: {
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  } | null;
  notes?: string;
}

export const serviceLinkageReviews = pgTable(
  "service_linkage_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    status: serviceLinkageReviewStatusEnum("status").notNull().default("pending"),
    reasonCode: serviceLinkageReviewReasonEnum("reason_code").notNull(),
    sourceWarrantyId: uuid("source_warranty_id").references(() => warranties.id, {
      onDelete: "set null",
    }),
    sourceEntitlementId: uuid("source_entitlement_id").references(
      () => warrantyEntitlements.id,
      { onDelete: "set null" }
    ),
    sourceOrderId: uuid("source_order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    commercialCustomerId: uuid("commercial_customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    candidateSystemIds: jsonb("candidate_system_ids").$type<string[]>().notNull().default([]),
    snapshot: jsonb("snapshot").$type<ServiceLinkageReviewSnapshot>().notNull().default({}),
    resolutionNotes: text("resolution_notes"),
    resolvedServiceSystemId: uuid("resolved_service_system_id").references(
      () => serviceSystems.id,
      { onDelete: "set null" }
    ),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: uuid("resolved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    ...auditColumns,
    ...timestampColumns,
  },
  (table) => ({
    orgStatusIdx: index("idx_service_linkage_reviews_org_status").on(
      table.organizationId,
      table.status
    ),
    orgReasonIdx: index("idx_service_linkage_reviews_org_reason").on(
      table.organizationId,
      table.reasonCode
    ),
    sourceWarrantyIdx: index("idx_service_linkage_reviews_source_warranty").on(
      table.sourceWarrantyId
    ),
    sourceEntitlementIdx: index("idx_service_linkage_reviews_source_entitlement").on(
      table.sourceEntitlementId
    ),
    ...standardRlsPolicies("service_linkage_reviews"),
  })
);

export const serviceLinkageReviewsRelations = relations(
  serviceLinkageReviews,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [serviceLinkageReviews.organizationId],
      references: [organizations.id],
    }),
    sourceWarranty: one(warranties, {
      fields: [serviceLinkageReviews.sourceWarrantyId],
      references: [warranties.id],
    }),
    sourceEntitlement: one(warrantyEntitlements, {
      fields: [serviceLinkageReviews.sourceEntitlementId],
      references: [warrantyEntitlements.id],
    }),
    commercialCustomer: one(customers, {
      fields: [serviceLinkageReviews.commercialCustomerId],
      references: [customers.id],
    }),
    sourceOrder: one(orders, {
      fields: [serviceLinkageReviews.sourceOrderId],
      references: [orders.id],
    }),
    project: one(projects, {
      fields: [serviceLinkageReviews.projectId],
      references: [projects.id],
    }),
    resolvedServiceSystem: one(serviceSystems, {
      fields: [serviceLinkageReviews.resolvedServiceSystemId],
      references: [serviceSystems.id],
    }),
    resolvedByUser: one(users, {
      fields: [serviceLinkageReviews.resolvedBy],
      references: [users.id],
      relationName: "serviceLinkageReviewResolvedBy",
    }),
  })
);

export type ServiceLinkageReview = typeof serviceLinkageReviews.$inferSelect;
export type NewServiceLinkageReview = typeof serviceLinkageReviews.$inferInsert;

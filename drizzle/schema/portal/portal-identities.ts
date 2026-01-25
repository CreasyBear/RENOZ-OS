/**
 * Portal Identities Schema
 *
 * Maps Supabase Auth users to portal scope (customer or subcontractor).
 * Drives RLS scoping for portal access.
 */

import {
  pgTable,
  uuid,
  timestamp,
  index,
  uniqueIndex,
  pgPolicy,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { organizations } from "../settings/organizations";
import { customers, contacts } from "../customers/customers";
import { jobAssignments } from "../jobs/job-assignments";
import { timestampColumns } from "../_shared/patterns";
import { portalIdentityStatusEnum, portalScopeEnum } from "../_shared/enums";

export const portalIdentities = pgTable(
  "portal_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    authUserId: uuid("auth_user_id").notNull(), // Supabase auth.users.id

    scope: portalScopeEnum("scope").notNull(),
    status: portalIdentityStatusEnum("status").notNull().default("active"),

    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    jobAssignmentId: uuid("job_assignment_id").references(() => jobAssignments.id, {
      onDelete: "set null",
    }),

    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),

    ...timestampColumns,
  },
  (table) => ({
    orgAuthUnique: uniqueIndex("idx_portal_identities_org_auth_unique").on(
      table.organizationId,
      table.authUserId
    ),
    orgScopeCustomerIdx: index("idx_portal_identities_org_scope_customer").on(
      table.organizationId,
      table.scope,
      table.customerId
    ),
    orgScopeJobIdx: index("idx_portal_identities_org_scope_job").on(
      table.organizationId,
      table.scope,
      table.jobAssignmentId
    ),
    customerScopeCheck: check(
      "portal_identities_customer_scope_check",
      sql`${table.scope} != 'customer' OR (${table.customerId} IS NOT NULL AND ${table.jobAssignmentId} IS NULL)`
    ),
    subcontractorScopeCheck: check(
      "portal_identities_subcontractor_scope_check",
      sql`${table.scope} != 'subcontractor' OR ${table.jobAssignmentId} IS NOT NULL`
    ),
    selectPolicy: pgPolicy("portal_identities_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid) OR auth_user_id = auth.uid()`,
    }),
    insertPolicy: pgPolicy("portal_identities_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("portal_identities_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("portal_identities_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

export const portalIdentitiesRelations = relations(portalIdentities, ({ one }) => ({
  organization: one(organizations, {
    fields: [portalIdentities.organizationId],
    references: [organizations.id],
  }),
  customer: one(customers, {
    fields: [portalIdentities.customerId],
    references: [customers.id],
  }),
  contact: one(contacts, {
    fields: [portalIdentities.contactId],
    references: [contacts.id],
  }),
  jobAssignment: one(jobAssignments, {
    fields: [portalIdentities.jobAssignmentId],
    references: [jobAssignments.id],
  }),
}));

export type PortalIdentity = typeof portalIdentities.$inferSelect;
export type NewPortalIdentity = typeof portalIdentities.$inferInsert;

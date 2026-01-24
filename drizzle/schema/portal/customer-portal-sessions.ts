/**
 * Customer Portal Sessions Schema
 *
 * Magic-link access sessions for customer/subcontractor portals.
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  uniqueIndex,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { timestampColumns } from "../_shared/patterns";
import { customers } from "../customers/customers";
import { contacts } from "../customers/customers";
import { jobAssignments } from "../jobs/job-assignments";
import { organizations } from "../settings/organizations";

export const customerPortalSessions = pgTable(
  "customer_portal_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    scope: text("scope").notNull().default("customer"), // customer | subcontractor
    tokenHash: text("token_hash").notNull(),

    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    jobAssignmentId: uuid("job_assignment_id").references(() => jobAssignments.id, {
      onDelete: "set null",
    }),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    lastIp: text("last_ip"),

    ...timestampColumns,
  },
  (table) => ({
    tokenUnique: uniqueIndex("idx_portal_sessions_token").on(table.tokenHash),
    orgScopeIdx: index("idx_portal_sessions_org_scope").on(
      table.organizationId,
      table.scope
    ),
    orgCustomerIdx: index("idx_portal_sessions_org_customer").on(
      table.organizationId,
      table.customerId
    ),
    orgJobIdx: index("idx_portal_sessions_org_job").on(
      table.organizationId,
      table.jobAssignmentId
    ),
    selectPolicy: pgPolicy("portal_sessions_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
    insertPolicy: pgPolicy("portal_sessions_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
    updatePolicy: pgPolicy("portal_sessions_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
      withCheck: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
    deletePolicy: pgPolicy("portal_sessions_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
  })
);

export const customerPortalSessionsRelations = relations(
  customerPortalSessions,
  ({ one }) => ({
    customer: one(customers, {
      fields: [customerPortalSessions.customerId],
      references: [customers.id],
    }),
    contact: one(contacts, {
      fields: [customerPortalSessions.contactId],
      references: [contacts.id],
    }),
    jobAssignment: one(jobAssignments, {
      fields: [customerPortalSessions.jobAssignmentId],
      references: [jobAssignments.id],
    }),
  })
);

export type CustomerPortalSession = typeof customerPortalSessions.$inferSelect;
export type NewCustomerPortalSession = typeof customerPortalSessions.$inferInsert;

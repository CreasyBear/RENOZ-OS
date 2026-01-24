/**
 * Search Index Outbox Schema
 *
 * Durable queue for async search indexing.
 */

import {
  pgTable,
  uuid,
  text,
  jsonb,
  integer,
  timestamp,
  index,
  uniqueIndex,
  check,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { timestampColumns } from "../_shared/patterns";
import { organizations } from "../settings/organizations";

export interface SearchIndexOutboxPayload {
  title?: string;
  subtitle?: string;
  description?: string;
  url?: string;
  searchText?: string;
}

const SEARCH_ENTITY_TYPES = [
  "customer",
  "contact",
  "order",
  "opportunity",
  "product",
  "inventory",
  "supplier",
  "warranty",
  "issue",
  "user",
  "email",
  "call",
  "job",
  "job_assignment",
  "warranty_claim",
  "quote",
  "shipment",
];

export const searchIndexOutbox = pgTable(
  "search_index_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    action: text("action").notNull(),

    payload: jsonb("payload").$type<SearchIndexOutboxPayload>().default({}),

    status: text("status").notNull().default("pending"),
    retryCount: integer("retry_count").notNull().default(0),
    lastError: text("last_error"),
    processedAt: timestamp("processed_at", { withTimezone: true }),

    ...timestampColumns,
  },
  (table) => ({
    orgStatusIdx: index("idx_search_outbox_org_status").on(
      table.organizationId,
      table.status,
      table.createdAt
    ),
    orgEntityIdx: index("idx_search_outbox_org_entity").on(
      table.organizationId,
      table.entityType,
      table.entityId
    ),
    orgEntityActionUnique: uniqueIndex("idx_search_outbox_org_entity_action").on(
      table.organizationId,
      table.entityType,
      table.entityId,
      table.action
    ),
    actionCheck: check(
      "search_outbox_action_check",
      sql`${table.action} IN ('upsert','delete')`
    ),
    entityTypeCheck: check(
      "search_outbox_entity_type_check",
      sql`${table.entityType} IN (${sql.raw(
        SEARCH_ENTITY_TYPES.map((type) => `'${type}'`).join(", ")
      )})`
    ),
    statusCheck: check(
      "search_outbox_status_check",
      sql`${table.status} IN ('pending','processing','failed','completed')`
    ),
    selectPolicy: pgPolicy("search_outbox_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
    insertPolicy: pgPolicy("search_outbox_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
    updatePolicy: pgPolicy("search_outbox_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
      withCheck: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
    deletePolicy: pgPolicy("search_outbox_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
  })
);

export const searchIndexOutboxRelations = relations(searchIndexOutbox, () => ({}));

export type SearchIndexOutbox = typeof searchIndexOutbox.$inferSelect;
export type NewSearchIndexOutbox = typeof searchIndexOutbox.$inferInsert;

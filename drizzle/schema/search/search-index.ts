/**
 * Search Index Schema
 *
 * Unified, org-scoped search index for global search.
 */

import {
  pgTable,
  uuid,
  text,
  jsonb,
  integer,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  timestampColumns,
  tsvectorColumn,
  standardRlsPolicies,
} from "../_shared/patterns";
import { organizations } from "../settings/organizations";

export interface SearchIndexMetadata {
  status?: string;
  ownerId?: string;
  source?: string;
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
  "invoice",
  "installer",
  "purchase_order",
  "rma",
];

export const searchIndex = pgTable(
  "search_index",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),

    title: text("title").notNull(),
    subtitle: text("subtitle"),
    description: text("description"),
    url: text("url"),
    searchText: text("search_text").notNull(),
    searchVector: tsvectorColumn("search_vector").generatedAlwaysAs(
      sql`to_tsvector('english', search_text)`
    ),

    rankBoost: integer("rank_boost").notNull().default(0),
    metadata: jsonb("metadata").$type<SearchIndexMetadata>().default({}),

    ...timestampColumns,
  },
  (table) => ({
    orgEntityUnique: uniqueIndex("idx_search_index_org_entity").on(
      table.organizationId,
      table.entityType,
      table.entityId
    ),
    orgTypeIdx: index("idx_search_index_org_type").on(
      table.organizationId,
      table.entityType
    ),
    orgUpdatedIdx: index("idx_search_index_org_updated").on(
      table.organizationId,
      table.updatedAt
    ),
    searchVectorIdx: index("idx_search_index_search_vector").using(
      "gin",
      table.searchVector
    ),
    entityTypeCheck: check(
      "search_index_entity_type_check",
      sql`${table.entityType} IN (${sql.raw(
        SEARCH_ENTITY_TYPES.map((type) => `'${type}'`).join(", ")
      )})`
    ),
    ...standardRlsPolicies("search_index"),
  })
);

export const searchIndexRelations = relations(searchIndex, () => ({}));

export type SearchIndex = typeof searchIndex.$inferSelect;
export type NewSearchIndex = typeof searchIndex.$inferInsert;

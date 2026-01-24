/**
 * Knowledge Base Schema
 *
 * Articles and categories for battery/inverter troubleshooting guides,
 * error code documentation, and installation guides.
 *
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-007a
 */

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  timestampColumns,
  auditColumns,
  softDeleteColumn,
} from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { users } from "../users";

// ============================================================================
// ENUMS
// ============================================================================

export const kbArticleStatusEnum = pgEnum("kb_article_status", [
  "draft",
  "published",
  "archived",
]);

// ============================================================================
// KB CATEGORIES TABLE
// ============================================================================

export const kbCategories = pgTable(
  "kb_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    parentId: uuid("parent_id").references((): any => kbCategories.id, {
      onDelete: "set null",
    }),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),

    // Standard columns
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumn,
  },
  (table) => [
    index("kb_categories_organization_idx").on(table.organizationId),
    index("kb_categories_parent_idx").on(table.parentId),
    index("kb_categories_slug_idx").on(table.organizationId, table.slug),
  ]
);

// ============================================================================
// KB ARTICLES TABLE
// ============================================================================

export const kbArticles = pgTable(
  "kb_articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Content
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    summary: text("summary"), // Brief description for listings
    content: text("content").notNull(), // Full article content (markdown/HTML)

    // Organization
    categoryId: uuid("category_id").references(() => kbCategories.id, {
      onDelete: "set null",
    }),
    tags: jsonb("tags").$type<string[]>().default([]),

    // Status and visibility
    status: kbArticleStatusEnum("status").notNull().default("draft"),
    publishedAt: text("published_at"), // Timestamp stored as ISO string for nullable

    // Metrics
    viewCount: integer("view_count").notNull().default(0),
    helpfulCount: integer("helpful_count").notNull().default(0),
    notHelpfulCount: integer("not_helpful_count").notNull().default(0),

    // SEO/metadata
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),

    // Standard columns
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumn,
  },
  (table) => [
    index("kb_articles_organization_idx").on(table.organizationId),
    index("kb_articles_category_idx").on(table.categoryId),
    index("kb_articles_status_idx").on(table.status),
    index("kb_articles_slug_idx").on(table.organizationId, table.slug),
    index("kb_articles_search_idx").on(table.title, table.content),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const kbCategoriesRelations = relations(kbCategories, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [kbCategories.organizationId],
    references: [organizations.id],
  }),
  parent: one(kbCategories, {
    fields: [kbCategories.parentId],
    references: [kbCategories.id],
    relationName: "parentChild",
  }),
  children: many(kbCategories, {
    relationName: "parentChild",
  }),
  articles: many(kbArticles),
  createdByUser: one(users, {
    fields: [kbCategories.createdBy],
    references: [users.id],
  }),
}));

export const kbArticlesRelations = relations(kbArticles, ({ one }) => ({
  organization: one(organizations, {
    fields: [kbArticles.organizationId],
    references: [organizations.id],
  }),
  category: one(kbCategories, {
    fields: [kbArticles.categoryId],
    references: [kbCategories.id],
  }),
  createdByUser: one(users, {
    fields: [kbArticles.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [kbArticles.updatedBy],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPES
// ============================================================================

export type KbCategory = typeof kbCategories.$inferSelect;
export type NewKbCategory = typeof kbCategories.$inferInsert;
export type KbArticle = typeof kbArticles.$inferSelect;
export type NewKbArticle = typeof kbArticles.$inferInsert;
export type KbArticleStatus = (typeof kbArticleStatusEnum.enumValues)[number];

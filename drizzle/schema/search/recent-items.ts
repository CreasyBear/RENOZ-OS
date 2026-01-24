/**
 * Recent Items Schema
 *
 * Per-user recent items for quick access and UI recency lists.
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  uniqueIndex,
  pgPolicy,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { timestampColumns } from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { users } from "../users/users";

export const recentItems = pgTable(
  "recent_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),

    title: text("title").notNull(),
    subtitle: text("subtitle"),
    url: text("url"),

    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    ...timestampColumns,
  },
  (table) => ({
    userEntityUnique: uniqueIndex("idx_recent_items_user_entity").on(
      table.organizationId,
      table.userId,
      table.entityType,
      table.entityId
    ),
    orgUserIdx: index("idx_recent_items_org_user").on(
      table.organizationId,
      table.userId
    ),
    orgLastAccessedIdx: index("idx_recent_items_org_accessed").on(
      table.organizationId,
      table.lastAccessedAt
    ),
    entityTypeCheck: check(
      "recent_items_entity_type_check",
      sql`${table.entityType} IN (${sql.raw(
        [
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
        ]
          .map((type) => `'${type}'`)
          .join(", ")
      )})`
    ),
    selectPolicy: pgPolicy("recent_items_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`
        organization_id = (
          SELECT organization_id FROM users WHERE auth_id = auth.uid()
        )
        AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      `,
    }),
    insertPolicy: pgPolicy("recent_items_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`
        organization_id = (
          SELECT organization_id FROM users WHERE auth_id = auth.uid()
        )
        AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      `,
    }),
    updatePolicy: pgPolicy("recent_items_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`
        organization_id = (
          SELECT organization_id FROM users WHERE auth_id = auth.uid()
        )
        AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      `,
      withCheck: sql`
        organization_id = (
          SELECT organization_id FROM users WHERE auth_id = auth.uid()
        )
        AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      `,
    }),
    deletePolicy: pgPolicy("recent_items_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`
        organization_id = (
          SELECT organization_id FROM users WHERE auth_id = auth.uid()
        )
        AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      `,
    }),
  })
);

export const recentItemsRelations = relations(recentItems, ({ one }) => ({
  user: one(users, {
    fields: [recentItems.userId],
    references: [users.id],
  }),
}));

export type RecentItem = typeof recentItems.$inferSelect;
export type NewRecentItem = typeof recentItems.$inferInsert;

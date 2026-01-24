/**
 * Notifications Schema
 *
 * User notifications with delivery status lifecycle tracking.
 * Table category: userScoped (per column-patterns.json)
 *
 * @see _Initiation/_prd/1-foundation/patterns/canonical-enums.json for enum values
 * @see _Initiation/_prd/1-foundation/patterns/rls-policies.json for RLS patterns
 */

import {
  pgTable,
  uuid,
  text,
  jsonb,
  index,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { notificationStatusEnum, notificationTypeEnum } from "./enums";
import { timestampColumns } from "./patterns";
import { organizations } from "../settings/organizations";
import { users } from "../users/users";

// ============================================================================
// INTERFACES
// ============================================================================

export interface NotificationData {
  /** Entity ID the notification relates to */
  entityId?: string;
  /** Entity type for linking */
  entityType?: string;
  /** Action URL for click handling */
  actionUrl?: string;
  /** Icon name to display */
  icon?: string;
  /** Preview text for the notification */
  previewText?: string;
  /** Deep link parameters */
  deepLinkParams?: Record<string, string>;
  /** Related entity name (for display) */
  entityName?: string;
  /** Allow additional properties for domain-specific data */
  [key: string]: unknown;
}

// ============================================================================
// NOTIFICATIONS TABLE
// ============================================================================

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Target user
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Notification content
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),

    // Delivery status lifecycle
    status: notificationStatusEnum("status").notNull().default("pending"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
    failureReason: text("failure_reason"),

    // Related data (JSONB for flexibility)
    data: jsonb("data").$type<NotificationData>().default({}),

    // Timestamps
    ...timestampColumns,
  },
  (table) => ({
    // User's notifications (most common query)
    userStatusIdx: index("idx_notifications_user_status").on(
      table.userId,
      table.status
    ),

    // Multi-tenant query
    orgUserIdx: index("idx_notifications_org_user").on(
      table.organizationId,
      table.userId
    ),

    // Recent notifications for user with cursor pagination support
    userCreatedIdx: index("idx_notifications_user_created").on(
      table.userId,
      table.createdAt,
      table.id
    ),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

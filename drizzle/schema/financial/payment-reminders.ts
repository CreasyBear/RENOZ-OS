/**
 * Payment Reminders Schema
 *
 * Reminder templates and history for overdue battery equipment invoices.
 * Table category: financial (per Financial Domain PRD)
 *
 * Default templates trigger at:
 * - 7 days overdue (friendly reminder)
 * - 14 days overdue (second notice)
 * - 30 days overdue (urgent notice)
 *
 * All overdue calculations are based on 30-day standard payment terms.
 *
 * Template variables available:
 * - {{customerName}} - Customer business name
 * - {{invoiceNumber}} - Invoice reference
 * - {{invoiceAmount}} - Amount in AUD
 * - {{invoiceDate}} - Invoice date
 * - {{dueDate}} - Payment due date
 * - {{daysOverdue}} - Number of days past due
 * - {{orderDescription}} - Battery equipment order description
 * - {{paymentTerms}} - Payment terms (default: 30 days)
 *
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json for story DOM-FIN-006a
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  timestampColumns,
  auditColumns,
} from "../_shared/patterns";
import { orders } from "../orders/orders";
import { organizations } from "../settings/organizations";

// ============================================================================
// REMINDER TEMPLATES TABLE
// ============================================================================

/**
 * Email templates for payment reminders.
 *
 * Organizations can customize templates for different overdue stages.
 * Subject and body support template variables (see file header).
 */
export const reminderTemplates = pgTable(
  "reminder_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Template identification
    name: text("name").notNull(), // e.g., "7 Day Reminder", "Final Notice"

    // Trigger condition (days past due date)
    daysOverdue: integer("days_overdue").notNull(),

    // Email content with template variables
    subject: text("subject").notNull(),
    body: text("body").notNull(),

    // Whether template is active (can be disabled without deletion)
    isActive: boolean("is_active").notNull().default(true),

    // Priority for ordering in UI
    sortOrder: integer("sort_order").notNull().default(0),

    // Tracking
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    // Multi-tenant queries
    orgActiveIdx: index("idx_reminder_templates_org_active").on(
      table.organizationId,
      table.isActive
    ),
    orgDaysIdx: index("idx_reminder_templates_org_days").on(
      table.organizationId,
      table.daysOverdue
    ),

    // Standard CRUD RLS policies for org isolation
    selectPolicy: pgPolicy("reminder_templates_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("reminder_templates_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("reminder_templates_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("reminder_templates_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// REMINDER HISTORY TABLE
// ============================================================================

/**
 * History of sent payment reminders.
 *
 * Tracks which reminders were sent for which invoices.
 * Used to prevent duplicate reminders and audit trail.
 */
export const reminderHistory = pgTable(
  "reminder_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Related order/invoice
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),

    // Template used (nullable - template may be deleted)
    templateId: uuid("template_id").references(() => reminderTemplates.id, {
      onDelete: "set null",
    }),

    // Snapshot of template values at time of send (in case template changes)
    templateName: text("template_name"),
    daysOverdue: integer("days_overdue"),
    subjectSent: text("subject_sent"),
    bodySent: text("body_sent"),

    // Delivery details
    recipientEmail: text("recipient_email").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),

    // Delivery status
    deliveryStatus: text("delivery_status").default("sent"), // sent, delivered, bounced, failed
    deliveryError: text("delivery_error"),

    // Manual send flag (vs automated job)
    isManualSend: boolean("is_manual_send").notNull().default(false),

    // Notes
    notes: text("notes"),

    // Tracking
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    // Multi-tenant queries
    orgOrderIdx: index("idx_reminder_history_org_order").on(
      table.organizationId,
      table.orderId
    ),
    orgDateIdx: index("idx_reminder_history_org_date").on(
      table.organizationId,
      table.sentAt
    ),

    // Common queries
    orderIdx: index("idx_reminder_history_order").on(table.orderId),
    templateIdx: index("idx_reminder_history_template").on(table.templateId),

    // Standard CRUD RLS policies for org isolation
    selectPolicy: pgPolicy("reminder_history_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("reminder_history_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("reminder_history_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("reminder_history_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const reminderTemplatesRelations = relations(
  reminderTemplates,
  ({ many }) => ({
    reminderHistory: many(reminderHistory),
  })
);

export const reminderHistoryRelations = relations(
  reminderHistory,
  ({ one }) => ({
    order: one(orders, {
      fields: [reminderHistory.orderId],
      references: [orders.id],
    }),
    template: one(reminderTemplates, {
      fields: [reminderHistory.templateId],
      references: [reminderTemplates.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ReminderTemplate = typeof reminderTemplates.$inferSelect;
export type NewReminderTemplate = typeof reminderTemplates.$inferInsert;

export type ReminderHistoryRecord = typeof reminderHistory.$inferSelect;
export type NewReminderHistoryRecord = typeof reminderHistory.$inferInsert;

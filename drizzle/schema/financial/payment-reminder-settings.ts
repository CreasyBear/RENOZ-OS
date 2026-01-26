/**
 * Payment Reminder Settings Schema
 *
 * Organization-level settings for payment reminder automation.
 */

import {
  pgTable,
  uuid,
  boolean,
  index,
  uniqueIndex,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { timestampColumns, auditColumns } from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { reminderTemplates } from "./payment-reminders";

export const paymentReminderSettings = pgTable(
  "payment_reminder_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    isEnabled: boolean("is_enabled").notNull().default(true),

    defaultTemplateId: uuid("default_template_id").references(() => reminderTemplates.id, {
      onDelete: "set null",
    }),

    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    orgUnique: uniqueIndex("idx_payment_reminder_settings_org").on(table.organizationId),
    orgEnabledIdx: index("idx_payment_reminder_settings_org_enabled").on(
      table.organizationId,
      table.isEnabled
    ),

    // Standard CRUD RLS policies for org isolation
    selectPolicy: pgPolicy("payment_reminder_settings_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("payment_reminder_settings_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("payment_reminder_settings_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("payment_reminder_settings_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

export const paymentReminderSettingsRelations = relations(
  paymentReminderSettings,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [paymentReminderSettings.organizationId],
      references: [organizations.id],
    }),
    defaultTemplate: one(reminderTemplates, {
      fields: [paymentReminderSettings.defaultTemplateId],
      references: [reminderTemplates.id],
    }),
  })
);

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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  timestampColumns,
  auditColumns,
  softDeleteColumn,
  standardRlsPolicies,
} from "../_shared/patterns";
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
    ...softDeleteColumn,
  },
  (table) => ({
    orgUnique: uniqueIndex("idx_payment_reminder_settings_org").on(table.organizationId),
    orgEnabledIdx: index("idx_payment_reminder_settings_org_enabled").on(
      table.organizationId,
      table.isEnabled
    ),

    // Standard CRUD RLS policies for org isolation
    ...standardRlsPolicies("payment_reminder_settings"),
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

/**
 * AI Approval Entities Schema
 *
 * Junction table tracking which entities were affected by which AI approvals.
 * Enables audit trails and bidirectional lookups for compliance.
 * Table category: userScoped (per column-patterns.json)
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { aiApprovals } from "./ai-approvals";

// ============================================================================
// AI APPROVAL ENTITIES TABLE
// ============================================================================

export const aiApprovalEntities = pgTable(
  "ai_approval_entities",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Reference to the approval that affected this entity
    approvalId: uuid("approval_id")
      .notNull()
      .references(() => aiApprovals.id, { onDelete: "cascade" }),

    // Entity identification (polymorphic reference)
    entityType: text("entity_type").notNull(), // 'customer', 'order', 'quote', etc.
    entityId: uuid("entity_id").notNull(),

    // Action performed on the entity
    action: text("action").notNull(), // 'created', 'updated', 'deleted'

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Index for finding entities affected by an approval
    approvalIdx: index("ai_approval_entities_approval_idx").on(table.approvalId),

    // Composite index for finding approvals that affected an entity
    entityIdx: index("ai_approval_entities_entity_idx").on(
      table.entityType,
      table.entityId
    ),

    // RLS Policies - inherit from approval's organization scope
    // We join through aiApprovals to check organization access
    selectPolicy: pgPolicy("ai_approval_entities_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`approval_id IN (
        SELECT id FROM ai_approvals
        WHERE organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
      )`,
    }),
    insertPolicy: pgPolicy("ai_approval_entities_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`approval_id IN (
        SELECT id FROM ai_approvals
        WHERE organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
      )`,
    }),
    deletePolicy: pgPolicy("ai_approval_entities_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`approval_id IN (
        SELECT id FROM ai_approvals
        WHERE organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
      )`,
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const aiApprovalEntitiesRelations = relations(
  aiApprovalEntities,
  ({ one }) => ({
    approval: one(aiApprovals, {
      fields: [aiApprovalEntities.approvalId],
      references: [aiApprovals.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type AiApprovalEntity = typeof aiApprovalEntities.$inferSelect;
export type NewAiApprovalEntity = typeof aiApprovalEntities.$inferInsert;

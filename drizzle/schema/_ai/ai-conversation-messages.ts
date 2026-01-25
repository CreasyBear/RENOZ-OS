/**
 * AI Conversation Messages Schema
 *
 * Individual messages in AI conversations for efficient pagination.
 * Normalized from JSONB array for better query performance.
 * Table category: userScoped (per column-patterns.json)
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import {
  pgTable,
  uuid,
  text,
  jsonb,
  integer,
  timestamp,
  index,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { aiMessageRoleEnum } from "./enums";
import { aiConversations } from "./ai-conversations";

// ============================================================================
// INTERFACES
// ============================================================================

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  result: unknown;
  error?: string;
}

// ============================================================================
// AI CONVERSATION MESSAGES TABLE
// ============================================================================

export const aiConversationMessages = pgTable(
  "ai_conversation_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Foreign key to conversation (cascade delete)
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => aiConversations.id, { onDelete: "cascade" }),

    // Message content
    role: aiMessageRoleEnum("role").notNull(),
    content: text("content").notNull(),

    // Tool interactions (nullable)
    toolCalls: jsonb("tool_calls").$type<ToolCall[]>(),
    toolResults: jsonb("tool_results").$type<ToolResult[]>(),

    // Token tracking for cost attribution
    tokensUsed: integer("tokens_used"),

    // Which agent generated this message
    agentName: text("agent_name"),

    // Timestamp (not updatedAt - messages are immutable)
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Primary lookup: messages by conversation (sorted by time)
    conversationCreatedIdx: index("idx_ai_messages_conversation_created").on(
      table.conversationId,
      table.createdAt
    ),

    // Filter by role within conversation
    conversationRoleIdx: index("idx_ai_messages_conversation_role").on(
      table.conversationId,
      table.role
    ),

    // Filter by agent
    agentNameIdx: index("idx_ai_messages_agent_name").on(table.agentName),

    // RLS: Only accessible via conversation's org scope
    // Messages inherit access from parent conversation
    selectPolicy: pgPolicy("ai_conversation_messages_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`EXISTS (
        SELECT 1 FROM ai_conversations c
        WHERE c.id = conversation_id
        AND c.organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
      )`,
    }),
    insertPolicy: pgPolicy("ai_conversation_messages_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`EXISTS (
        SELECT 1 FROM ai_conversations c
        WHERE c.id = conversation_id
        AND c.organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
      )`,
    }),
    // Messages are immutable - no update policy
    deletePolicy: pgPolicy("ai_conversation_messages_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`EXISTS (
        SELECT 1 FROM ai_conversations c
        WHERE c.id = conversation_id
        AND c.organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
      )`,
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

// Relations defined in index.ts to avoid circular imports

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type AiConversationMessage = typeof aiConversationMessages.$inferSelect;
export type NewAiConversationMessage = typeof aiConversationMessages.$inferInsert;

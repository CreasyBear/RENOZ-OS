/**
 * AI Conversations Schema
 *
 * Chat conversation history and agent handoff tracking.
 * Table category: userScoped (per column-patterns.json)
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import {
  pgTable,
  uuid,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  timestampColumns,
  standardRlsPolicies,
} from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { users } from "../users";
import { aiAgentNameEnum } from "./enums";
import { aiConversationMessages } from "./ai-conversation-messages";

// ============================================================================
// INTERFACES
// ============================================================================

export interface ConversationMetadata {
  /** Current page/route when conversation started */
  initialPage?: string;
  /** Entity IDs relevant to conversation */
  entityContext?: {
    customerId?: string;
    orderId?: string;
    quoteId?: string;
    jobId?: string;
  };
  /** Custom key-value pairs */
  [key: string]: string | object | undefined;
}

export interface AgentHandoff {
  from: string;
  to: string;
  reason: string;
  timestamp: string;
}

// ============================================================================
// AI CONVERSATIONS TABLE
// ============================================================================

export const aiConversations = pgTable(
  "ai_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Multi-tenant scope
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Conversation metadata
    metadata: jsonb("metadata").$type<ConversationMetadata>().default({}),

    // Agent state
    activeAgent: aiAgentNameEnum("active_agent"),
    agentHistory: jsonb("agent_history").$type<AgentHandoff[]>().default([]),

    // Activity tracking
    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .defaultNow(),

    // Timestamps
    ...timestampColumns,
  },
  (table) => ({
    // Multi-tenant queries (most common)
    orgIdx: index("idx_ai_conversations_org").on(table.organizationId),
    userIdx: index("idx_ai_conversations_user").on(table.userId),

    // Recent conversations
    lastMessageIdx: index("idx_ai_conversations_last_message").on(
      table.lastMessageAt
    ),

    // Filter by active agent
    activeAgentIdx: index("idx_ai_conversations_active_agent").on(
      table.activeAgent
    ),

    // RLS Policies - users can only see own org's conversations
    ...standardRlsPolicies("ai_conversations"),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const aiConversationsRelations = relations(
  aiConversations,
  ({ one, many }) => ({
    user: one(users, {
      fields: [aiConversations.userId],
      references: [users.id],
    }),
    organization: one(organizations, {
      fields: [aiConversations.organizationId],
      references: [organizations.id],
    }),
    messages: many(aiConversationMessages),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type AiConversation = typeof aiConversations.$inferSelect;
export type NewAiConversation = typeof aiConversations.$inferInsert;

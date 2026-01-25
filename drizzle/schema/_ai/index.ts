/**
 * AI Domain Schema Barrel Export
 *
 * Exports all AI infrastructure tables:
 * - aiConversations: Chat history and agent handoffs
 * - aiConversationMessages: Individual messages (normalized)
 * - aiApprovals: Human-in-the-loop approval queue
 * - aiAgentTasks: Background task queue
 * - aiCostTracking: Token usage and cost metrics
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import { relations } from "drizzle-orm";
import { aiConversations } from "./ai-conversations";
import { aiConversationMessages } from "./ai-conversation-messages";

// ============================================================================
// EXPORTS
// ============================================================================

// Enums
export * from "./enums";

// Tables and their relations
export * from "./ai-conversations";
export * from "./ai-conversation-messages";
export * from "./ai-approvals";
export * from "./ai-agent-tasks";
export * from "./ai-cost-tracking";

// ============================================================================
// CROSS-FILE RELATIONS (avoiding circular imports)
// ============================================================================

/**
 * Relations for aiConversationMessages to aiConversations.
 * Defined here to avoid circular import issues.
 */
export const aiConversationMessagesRelations = relations(
  aiConversationMessages,
  ({ one }) => ({
    conversation: one(aiConversations, {
      fields: [aiConversationMessages.conversationId],
      references: [aiConversations.id],
    }),
  })
);

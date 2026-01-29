/**
 * AI Memory System (Server-Only)
 *
 * Three-tier memory system with Redis (working) and Postgres (session/long-term).
 * Implements AI-INFRA-012 acceptance criteria.
 */

import { getRedisMemoryProvider, getWorkingMemory } from '@/lib/ai/memory/redis-provider';
import { DrizzleMemoryProvider } from './drizzle-provider';
import type { MemoryContext, ConversationMessage } from '@/lib/ai/memory/types';

// ============================================================================
// MEMORY PROVIDER FACTORY
// ============================================================================

let drizzleProviderInstance: DrizzleMemoryProvider | null = null;

function getDrizzleMemoryProvider(): DrizzleMemoryProvider {
  if (!drizzleProviderInstance) {
    drizzleProviderInstance = new DrizzleMemoryProvider();
  }
  return drizzleProviderInstance;
}

// ============================================================================
// MEMORY CONTEXT INJECTION
// ============================================================================

/**
 * Build memory context from working memory and recent conversation.
 */
export async function buildMemoryContext(
  organizationId: string,
  userId: string,
  conversationId?: string
): Promise<MemoryContext> {
  const workingProvider = getRedisMemoryProvider();
  const sessionProvider = getDrizzleMemoryProvider();

  // Get working memory
  const working = await getWorkingMemory(workingProvider, organizationId, userId);

  // Get recent conversation context if conversationId provided
  let recentConversation: MemoryContext['recentConversation'];
  if (conversationId) {
    const conversation = await sessionProvider.getConversation(conversationId);
    if (conversation) {
      recentConversation = {
        messageCount: conversation.messages.length,
        lastAgent: conversation.activeAgent,
        summary: conversation.messages.length > 0
          ? summarizeRecentMessages(conversation.messages.slice(-5))
          : undefined,
      };
    }
  }

  return {
    workingMemory: working ?? { userId, organizationId },
    recentConversation,
  };
}

/**
 * Summarize recent messages for context.
 */
function summarizeRecentMessages(messages: ConversationMessage[]): string {
  const topics = new Set<string>();

  for (const msg of messages) {
    if (msg.role === 'user') {
      const content = msg.content.toLowerCase();
      if (content.includes('customer')) topics.add('customers');
      if (content.includes('order')) topics.add('orders');
      if (content.includes('quote')) topics.add('quotes');
      if (content.includes('invoice')) topics.add('invoices');
      if (content.includes('report') || content.includes('analytics')) topics.add('analytics');
    }
  }

  if (topics.size === 0) return 'General inquiry';
  return `Discussion about: ${Array.from(topics).join(', ')}`;
}

/**
 * Format memory context for injection into agent system prompt.
 */
export function formatMemoryContext(context: MemoryContext): string {
  const sections: string[] = [];

  const { workingMemory: wm } = context;
  if (wm.currentPage || wm.activeEntityName || wm.recentActions?.length) {
    const wmParts: string[] = [];

    if (wm.currentPage) {
      wmParts.push(`Current page: ${wm.currentPage}`);
    }

    if (wm.activeEntityName) {
      wmParts.push(`Active context: ${wm.activeEntityName}`);
    }

    if (wm.recentActions && wm.recentActions.length > 0) {
      const actions = wm.recentActions
        .slice(0, 3)
        .map((a) => a.action)
        .join(', ');
      wmParts.push(`Recent actions: ${actions}`);
    }

    if (wm.pendingApprovals && wm.pendingApprovals.length > 0) {
      wmParts.push(`Pending approvals: ${wm.pendingApprovals.length}`);
    }

    sections.push(`<working_memory>\n${wmParts.join('\n')}\n</working_memory>`);
  }

  if (context.recentConversation) {
    const { recentConversation: rc } = context;
    const rcParts: string[] = [];

    rcParts.push(`Messages in conversation: ${rc.messageCount}`);

    if (rc.lastAgent) {
      rcParts.push(`Last active agent: ${rc.lastAgent}`);
    }

    if (rc.summary) {
      rcParts.push(`Context: ${rc.summary}`);
    }

    sections.push(`<conversation_context>\n${rcParts.join('\n')}\n</conversation_context>`);
  }

  if (sections.length === 0) {
    return '';
  }

  return `\n<memory_context>\n${sections.join('\n\n')}\n</memory_context>\n`;
}

/**
 * Inject memory context into an agent's system prompt.
 */
export async function injectMemoryContext(
  systemPrompt: string,
  organizationId: string,
  userId: string,
  conversationId?: string
): Promise<string> {
  const context = await buildMemoryContext(organizationId, userId, conversationId);
  const formatted = formatMemoryContext(context);

  if (!formatted) {
    return systemPrompt;
  }

  return `${formatted}\n${systemPrompt}`;
}

// Re-export Drizzle provider
export { DrizzleMemoryProvider, getDrizzleMemoryProvider };

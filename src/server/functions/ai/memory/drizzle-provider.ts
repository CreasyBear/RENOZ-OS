'use server'

/**
 * Drizzle Memory Provider
 *
 * Session and long-term memory storage using PostgreSQL via Drizzle ORM.
 * Implements AI-INFRA-012 acceptance criteria.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import { db } from '@/lib/db';
import { aiConversations, aiConversationMessages, type ConversationMetadata, type AgentHandoff } from 'drizzle/schema/_ai';
import { eq, desc, sql } from 'drizzle-orm';
import type {
  ConversationMemoryProvider,
  ConversationData,
  ConversationMessage,
} from '@/lib/ai/memory/types';

// ============================================================================
// DRIZZLE MEMORY PROVIDER
// ============================================================================

/**
 * Drizzle-based memory provider for session and long-term memory.
 */
export class DrizzleMemoryProvider implements ConversationMemoryProvider {
  readonly name = 'drizzle';

  /**
   * Check if the provider is available.
   * Drizzle/Postgres is always assumed available.
   */
  async isAvailable(): Promise<boolean> {
    try {
      // RAW SQL (Phase 11 Keep): Connection health check. See PHASE11-RAW-SQL-AUDIT.md
      await db.execute(sql`SELECT 1`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generic get - not typically used for Drizzle provider.
   * Use specific methods like getConversation instead.
   */
  async get<T>(key: string): Promise<T | null> {
    // For Drizzle, we interpret key as conversation ID
    const conversation = await this.getConversation(key);
    return conversation as T | null;
  }

  /**
   * Generic set - not typically used for Drizzle provider.
   * Use specific methods like saveMessage instead.
   */
  async set<T>(_key: string, _value: T, _ttlSeconds?: number): Promise<void> {
    // Not implemented for Drizzle - use specific methods
    throw new Error('Use specific methods (saveMessage, createConversation) instead');
  }

  /**
   * Delete a conversation.
   */
  async delete(conversationId: string): Promise<void> {
    await db
      .delete(aiConversations)
      .where(eq(aiConversations.id, conversationId));
  }

  /**
   * Get a conversation by ID with its messages.
   */
  async getConversation(conversationId: string): Promise<ConversationData | null> {
    // Get conversation record
    const [row] = await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.id, conversationId))
      .limit(1);

    if (!row) return null;

    // Get messages separately (limit to avoid unbounded reads; use getMessages for pagination)
    const messages = await db
      .select()
      .from(aiConversationMessages)
      .where(eq(aiConversationMessages.conversationId, conversationId))
      .orderBy(aiConversationMessages.createdAt)
      .limit(500);

    return mapRowToConversation(row, messages);
  }

  /**
   * Save a message to a conversation.
   */
  async saveMessage(conversationId: string, message: ConversationMessage): Promise<void> {
    await db.transaction(async (tx) => {
      // Verify conversation exists
      const [existing] = await tx
        .select({ id: aiConversations.id })
        .from(aiConversations)
        .where(eq(aiConversations.id, conversationId))
        .limit(1);

      if (!existing) {
        throw new Error(`Conversation not found: ${conversationId}`);
      }

      // Transform tool calls from memory format to schema format
      const schemaToolCalls = message.toolCalls?.map((tc) => ({
        id: tc.id,
        name: tc.name,
        arguments: tc.input, // Schema uses 'arguments', type uses 'input'
      })) ?? null;

      // Transform tool results from memory format to schema format
      const schemaToolResults = message.toolResults?.map((tr) => ({
        toolCallId: tr.toolCallId,
        result: tr.output, // Schema uses 'result', type uses 'output'
        error: tr.error ? String(tr.error) : undefined,
      })) ?? null;

      // Insert message into messages table
      await tx
        .insert(aiConversationMessages)
        .values({
          conversationId,
          role: message.role,
          content: message.content,
          toolCalls: schemaToolCalls,
          toolResults: schemaToolResults,
          tokensUsed: message.tokensUsed ?? null,
          agentName: message.agent ?? null,
        });

      // Update conversation's lastMessageAt and activeAgent
      const updates: Record<string, unknown> = {
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      };

      if (message.agent) {
        updates.activeAgent = message.agent;
      }

      await tx
        .update(aiConversations)
        .set(updates)
        .where(eq(aiConversations.id, conversationId));
    });
  }

  /**
   * Get recent conversations for a user.
   */
  async getRecentConversations(userId: string, limit: number = 10): Promise<ConversationData[]> {
    const rows = await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.userId, userId))
      .orderBy(desc(aiConversations.lastMessageAt))
      .limit(limit);

    // For list view, we don't load all messages - just return empty arrays
    return rows.map((row) => mapRowToConversation(row, []));
  }

  /**
   * Create a new conversation.
   */
  async createConversation(
    userId: string,
    organizationId: string,
    metadata?: Record<string, unknown>
  ): Promise<ConversationData> {
    const [row] = await db
      .insert(aiConversations)
      .values({
        userId,
        organizationId,
        metadata: (metadata ?? {}) as ConversationMetadata,
        agentHistory: [] as AgentHandoff[],
      })
      .returning();

    return mapRowToConversation(row, []);
  }

  /**
   * Update conversation metadata or active agent.
   */
  async updateConversation(
    conversationId: string,
    updates: Partial<Pick<ConversationData, 'activeAgent' | 'metadata'>>
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (updates.activeAgent !== undefined) {
      updateData.activeAgent = updates.activeAgent;

      // Also update agent history
      const [existing] = await db
        .select({ agentHistory: aiConversations.agentHistory })
        .from(aiConversations)
        .where(eq(aiConversations.id, conversationId))
        .limit(1);

      if (existing) {
        const history = existing.agentHistory ?? [];
        const historyAgents = history.map((h) => h.to);
        if (!historyAgents.includes(updates.activeAgent)) {
          updateData.agentHistory = [
            ...history,
            {
              from: 'triage',
              to: updates.activeAgent,
              reason: 'User request',
              timestamp: new Date().toISOString(),
            },
          ];
        }
      }
    }

    if (updates.metadata !== undefined) {
      updateData.metadata = updates.metadata;
    }

    await db
      .update(aiConversations)
      .set(updateData)
      .where(eq(aiConversations.id, conversationId));
  }

  /**
   * Get or create a conversation for a user.
   * If conversationId is provided, retrieves it. Otherwise creates a new one.
   */
  async getOrCreateConversation(
    userId: string,
    organizationId: string,
    conversationId?: string,
    metadata?: Record<string, unknown>
  ): Promise<ConversationData> {
    if (conversationId) {
      const existing = await this.getConversation(conversationId);
      if (existing) {
        // Verify ownership
        if (existing.userId !== userId || existing.organizationId !== organizationId) {
          throw new Error('Conversation does not belong to user/organization');
        }
        return existing;
      }
    }

    // Create new conversation
    return this.createConversation(userId, organizationId, metadata);
  }

  /**
   * Get conversation messages with pagination.
   */
  async getMessages(
    conversationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ConversationMessage[]> {
    const rows = await db
      .select()
      .from(aiConversationMessages)
      .where(eq(aiConversationMessages.conversationId, conversationId))
      .orderBy(desc(aiConversationMessages.createdAt))
      .limit(limit)
      .offset(offset);

    // Reverse to get chronological order
    return rows.reverse().map(mapMessageRow);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Map a database row to ConversationData.
 */
function mapRowToConversation(
  row: typeof aiConversations.$inferSelect,
  messageRows: Array<typeof aiConversationMessages.$inferSelect>
): ConversationData {
  return {
    id: row.id,
    userId: row.userId,
    organizationId: row.organizationId,
    messages: messageRows.map(mapMessageRow),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    activeAgent: row.activeAgent ?? undefined,
    agentHistory: row.agentHistory?.map((h) => h.to) ?? [],
    lastMessageAt: row.lastMessageAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Map a message row to ConversationMessage.
 */
function mapMessageRow(
  row: typeof aiConversationMessages.$inferSelect
): ConversationMessage {
  return {
    role: row.role as 'user' | 'assistant' | 'system' | 'tool',
    content: row.content,
    toolCalls: row.toolCalls?.map((tc) => ({
      id: tc.id,
      name: tc.name,
      input: tc.arguments,
    })),
    toolResults: row.toolResults?.map((tr) => ({
      toolCallId: tr.toolCallId,
      name: '',
      output: tr.result,
      error: tr.error ? true : undefined,
    })),
    agent: row.agentName ?? undefined,
    tokensUsed: row.tokensUsed ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let drizzleProvider: DrizzleMemoryProvider | null = null;

/**
 * Get the Drizzle memory provider singleton.
 */
export function getDrizzleMemoryProvider(): DrizzleMemoryProvider {
  if (!drizzleProvider) {
    drizzleProvider = new DrizzleMemoryProvider();
  }
  return drizzleProvider;
}

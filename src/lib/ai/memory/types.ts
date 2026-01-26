/**
 * AI Memory Types
 *
 * Type definitions for the three-tier memory system.
 * Implements AI-INFRA-012 acceptance criteria.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

// ============================================================================
// WORKING MEMORY (Redis)
// ============================================================================

/**
 * Working memory stored in Redis.
 * Short-lived context for the current session.
 */
export interface WorkingMemory {
  /** User ID */
  userId: string;
  /** Organization ID */
  organizationId: string;
  /** Current page/route the user is viewing */
  currentPage?: string;
  /** Currently active customer/entity */
  activeCustomerId?: string;
  /** Active entity name for context */
  activeEntityName?: string;
  /** Recent actions in this session */
  recentActions?: RecentAction[];
  /** Pending approval IDs */
  pendingApprovals?: string[];
  /** Any draft data in progress */
  draftInProgress?: DraftData;
  /** Custom context data */
  customContext?: Record<string, unknown>;
}

/**
 * Recent action record for working memory.
 */
export interface RecentAction {
  /** Action type (e.g., 'view_customer', 'create_quote') */
  action: string;
  /** Entity type if applicable */
  entityType?: string;
  /** Entity ID if applicable */
  entityId?: string;
  /** Timestamp of the action */
  timestamp: string;
}

/**
 * Draft data for work in progress.
 */
export interface DraftData {
  /** Draft type (e.g., 'order', 'quote') */
  type: string;
  /** Draft data */
  data: Record<string, unknown>;
  /** When the draft was started */
  startedAt: string;
}

// ============================================================================
// SESSION MEMORY (Postgres - ai_conversations)
// ============================================================================

/**
 * Message in a conversation.
 */
export interface ConversationMessage {
  /** Message role */
  role: 'user' | 'assistant' | 'system' | 'tool';
  /** Message content */
  content: string;
  /** Tool calls if any */
  toolCalls?: ToolCall[];
  /** Tool results if any */
  toolResults?: ToolResult[];
  /** Agent that generated this message */
  agent?: string;
  /** Token usage for this message */
  tokensUsed?: number;
  /** Timestamp */
  createdAt: string;
}

/**
 * Tool call record.
 */
export interface ToolCall {
  /** Tool call ID */
  id: string;
  /** Tool name */
  name: string;
  /** Tool input */
  input: Record<string, unknown>;
}

/**
 * Tool result record.
 */
export interface ToolResult {
  /** Tool call ID this result is for */
  toolCallId: string;
  /** Tool name */
  name: string;
  /** Tool output */
  output: unknown;
  /** Whether the tool errored */
  error?: boolean;
}

/**
 * Session conversation data.
 */
export interface ConversationData {
  /** Conversation ID */
  id: string;
  /** User ID */
  userId: string;
  /** Organization ID */
  organizationId: string;
  /** Conversation messages */
  messages: ConversationMessage[];
  /** Conversation metadata */
  metadata?: Record<string, unknown>;
  /** Currently active agent */
  activeAgent?: string;
  /** History of agents that handled this conversation */
  agentHistory?: string[];
  /** Last message timestamp */
  lastMessageAt?: string;
  /** Creation timestamp */
  createdAt: string;
  /** Update timestamp */
  updatedAt: string;
}

// ============================================================================
// MEMORY PROVIDER INTERFACE
// ============================================================================

/**
 * Memory provider interface.
 * All memory providers must implement this interface.
 */
export interface MemoryProvider {
  /** Provider name for logging */
  name: string;

  /**
   * Get a value from memory.
   * @param key - The key to retrieve
   * @returns The value or null if not found
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a value in memory.
   * @param key - The key to set
   * @param value - The value to store
   * @param ttlSeconds - Optional TTL in seconds
   */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /**
   * Delete a value from memory.
   * @param key - The key to delete
   */
  delete(key: string): Promise<void>;

  /**
   * Check if the provider is available.
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Conversation memory provider interface.
 * Extended interface for session memory operations.
 */
export interface ConversationMemoryProvider extends MemoryProvider {
  /**
   * Get a conversation by ID.
   * @param conversationId - The conversation ID
   * @returns The conversation or null if not found
   */
  getConversation(conversationId: string): Promise<ConversationData | null>;

  /**
   * Save a message to a conversation.
   * @param conversationId - The conversation ID
   * @param message - The message to save
   */
  saveMessage(conversationId: string, message: ConversationMessage): Promise<void>;

  /**
   * Get recent conversations for a user.
   * @param userId - The user ID
   * @param limit - Maximum number of conversations to return
   */
  getRecentConversations(userId: string, limit?: number): Promise<ConversationData[]>;

  /**
   * Create a new conversation.
   * @param userId - The user ID
   * @param organizationId - The organization ID
   * @param metadata - Optional metadata
   */
  createConversation(
    userId: string,
    organizationId: string,
    metadata?: Record<string, unknown>
  ): Promise<ConversationData>;

  /**
   * Update conversation metadata.
   * @param conversationId - The conversation ID
   * @param updates - Updates to apply
   */
  updateConversation(
    conversationId: string,
    updates: Partial<Pick<ConversationData, 'activeAgent' | 'metadata'>>
  ): Promise<void>;
}

// ============================================================================
// MEMORY CONTEXT
// ============================================================================

/**
 * Memory context to inject into agent prompts.
 */
export interface MemoryContext {
  /** Working memory summary */
  workingMemory: Partial<WorkingMemory>;
  /** Recent conversation context */
  recentConversation?: {
    messageCount: number;
    lastAgent?: string;
    summary?: string;
  };
}

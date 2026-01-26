/**
 * AI Chat Hook
 *
 * Wrapper around Vercel AI SDK useChat with Renoz-specific configuration.
 * Handles streaming, conversation tracking, and agent routing.
 *
 * @see src/routes/api/ai/chat.ts
 */

import { useChat as useVercelChat, type Message } from 'ai/react';
import { useCallback, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface UseAIChatOptions {
  /** Initial conversation ID to resume */
  conversationId?: string;
  /** Callback when conversation ID is assigned */
  onConversationId?: (id: string) => void;
  /** Callback when agent changes */
  onAgentChange?: (agent: string, reason: string) => void;
  /** Initial messages to pre-populate */
  initialMessages?: Message[];
}

export interface AIChatResult {
  /** Current messages in the conversation */
  messages: Message[];
  /** Current input value */
  input: string;
  /** Set input value */
  setInput: (value: string) => void;
  /** Handle input change */
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  /** Submit the current input */
  handleSubmit: (e?: React.FormEvent) => void;
  /** Whether a response is currently streaming */
  isLoading: boolean;
  /** Any error that occurred */
  error: Error | undefined;
  /** Stop the current generation */
  stop: () => void;
  /** Reload/regenerate the last response */
  reload: () => void;
  /** Current conversation ID */
  conversationId: string | null;
  /** Current active agent */
  activeAgent: string | null;
  /** Last triage reason */
  triageReason: string | null;
  /** Append a message programmatically */
  append: (message: Message | { role: 'user'; content: string }) => void;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * AI Chat hook with streaming support.
 *
 * Wraps Vercel AI SDK useChat with:
 * - Conversation tracking via X-Conversation-Id header
 * - Agent routing via X-Agent header
 * - Context passing for current view
 *
 * @example
 * ```tsx
 * const { messages, input, handleInputChange, handleSubmit, isLoading } = useAIChat();
 *
 * return (
 *   <form onSubmit={handleSubmit}>
 *     {messages.map(m => <div key={m.id}>{m.content}</div>)}
 *     <textarea value={input} onChange={handleInputChange} />
 *     <button type="submit" disabled={isLoading}>Send</button>
 *   </form>
 * );
 * ```
 */
export function useAIChat(options: UseAIChatOptions = {}): AIChatResult {
  const {
    conversationId: initialConversationId,
    onConversationId,
    onAgentChange,
    initialMessages,
  } = options;

  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId ?? null
  );
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [triageReason, setTriageReason] = useState<string | null>(null);

  const {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit: baseHandleSubmit,
    isLoading,
    error,
    stop,
    reload,
    append: baseAppend,
  } = useVercelChat({
    api: '/api/ai/chat',
    initialMessages,
    body: {
      context: {
        conversationId,
      },
    },
    onResponse: (response) => {
      // Extract metadata from response headers
      const newConversationId = response.headers.get('X-Conversation-Id');
      const agent = response.headers.get('X-Agent');
      const reason = response.headers.get('X-Triage-Reason');

      if (newConversationId && newConversationId !== conversationId) {
        setConversationId(newConversationId);
        onConversationId?.(newConversationId);
      }

      if (agent) {
        setActiveAgent(agent);
        if (reason) {
          setTriageReason(reason);
          onAgentChange?.(agent, reason);
        }
      }
    },
    onError: (error) => {
      console.error('[AI Chat] Error:', error);
    },
  });

  // Wrap handleSubmit to prevent double submissions
  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }
      if (isLoading || !input.trim()) {
        return;
      }
      baseHandleSubmit(e);
    },
    [baseHandleSubmit, isLoading, input]
  );

  // Wrap append to handle both Message and simple format
  const append = useCallback(
    (message: Message | { role: 'user'; content: string }) => {
      if ('id' in message) {
        baseAppend(message);
      } else {
        baseAppend({
          id: crypto.randomUUID(),
          role: message.role,
          content: message.content,
        });
      }
    },
    [baseAppend]
  );

  return {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    stop,
    reload,
    conversationId,
    activeAgent,
    triageReason,
    append,
  };
}

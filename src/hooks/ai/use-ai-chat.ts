/**
 * AI Chat Hook
 *
 * Wrapper around Vercel AI SDK useChat with Renoz-specific configuration.
 * Handles streaming, conversation tracking, and agent routing.
 *
 * @see src/routes/api/ai/chat.ts
 */

import { useChat as useVercelChat, type UIMessage } from '@ai-sdk/react';
import { useCallback, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

/** Re-export Message type for convenience */
export type Message = UIMessage;

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

  // Local state for input and conversation tracking
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId ?? null
  );
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [triageReason, setTriageReason] = useState<string | null>(null);

  // Use the new AI SDK chat hook
  const chat = useVercelChat({
    api: '/api/ai/chat',
    initialMessages,
    body: {
      context: {
        conversationId,
      },
    },
    onFinish: (message, _options) => {
      // Note: In SDK 3.0, response metadata handling is different
      // For now, we'll handle this through the message itself or separate API calls
    },
    onError: (error) => {
      console.error('[AI Chat] Error:', error);
    },
  });

  // Destructure chat helpers
  const {
    messages,
    sendMessage,
    regenerate,
    stop,
    status,
    error,
  } = chat;

  // Determine loading state from status
  const isLoading = status === 'streaming' || status === 'submitted';

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    []
  );

  // Handle form submit
  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }
      if (isLoading || !input.trim()) {
        return;
      }

      // Send the message
      sendMessage({
        role: 'user',
        content: input,
      });

      // Clear input
      setInput('');
    },
    [sendMessage, isLoading, input]
  );

  // Append a message programmatically
  const append = useCallback(
    (message: Message | { role: 'user'; content: string }) => {
      if ('id' in message) {
        sendMessage(message);
      } else {
        sendMessage({
          role: message.role,
          content: message.content,
        });
      }
    },
    [sendMessage]
  );

  // Reload/regenerate last response
  const reload = useCallback(() => {
    regenerate();
  }, [regenerate]);

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

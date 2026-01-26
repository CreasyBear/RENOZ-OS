/**
 * AI Chat Hook
 *
 * Wrapper around AI SDK v6 useChat with Renoz-specific configuration.
 * Handles streaming, conversation tracking, and agent routing.
 *
 * @see src/routes/api/ai/chat.ts
 * @see https://ai-sdk.dev/docs/ai-sdk-ui/chatbot
 */

import { useChat as useAIChat, type UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useCallback, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

/** Re-export UIMessage type for convenience */
export type Message = UIMessage;

/** Extract text content from message parts */
export function getMessageText(message: Message): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

export interface UseAIChatOptions {
  /** Initial conversation ID to resume */
  conversationId?: string;
  /** Callback when conversation ID is assigned */
  onConversationId?: (id: string) => void;
  /** Callback when agent changes */
  onAgentChange?: (agent: string, reason: string) => void;
  /** Initial messages to pre-populate */
  initialMessages?: Message[];
  /** API endpoint (default: /api/ai/chat) */
  api?: string;
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
  /** Chat status: 'submitted' | 'streaming' | 'ready' | 'error' */
  status: 'submitted' | 'streaming' | 'ready' | 'error';
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
  append: (content: string) => void;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * AI Chat hook with streaming support (AI SDK v6).
 *
 * Features:
 * - Conversation tracking via context
 * - Agent routing awareness
 * - Streaming responses with parts
 * - Stop/reload functionality
 *
 * @example
 * ```tsx
 * const { messages, input, setInput, handleSubmit, isLoading } = useChat();
 *
 * return (
 *   <form onSubmit={handleSubmit}>
 *     {messages.map(m => (
 *       <div key={m.id}>
 *         {m.parts.map((part, i) =>
 *           part.type === 'text' ? <span key={i}>{part.text}</span> : null
 *         )}
 *       </div>
 *     ))}
 *     <input value={input} onChange={e => setInput(e.target.value)} />
 *     <button type="submit" disabled={isLoading}>Send</button>
 *   </form>
 * );
 * ```
 */
export function useChat(options: UseAIChatOptions = {}): AIChatResult {
  const {
    conversationId: initialConversationId,
    onConversationId,
    onAgentChange,
    initialMessages,
    api = '/api/ai/chat',
  } = options;

  // Local state for conversation tracking
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId ?? null
  );
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [triageReason, setTriageReason] = useState<string | null>(null);

  // Use AI SDK v6 useChat hook
  const chat = useAIChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api,
      // Pass conversation context in body
      body: {
        context: {
          conversationId,
        },
      },
    }),
    onFinish: (event) => {
      // Extract metadata from the response if available
      const metadata = event.metadata as {
        conversationId?: string;
        agent?: string;
        triageReason?: string;
      } | undefined;

      if (metadata?.conversationId && metadata.conversationId !== conversationId) {
        setConversationId(metadata.conversationId);
        onConversationId?.(metadata.conversationId);
      }

      if (metadata?.agent) {
        setActiveAgent(metadata.agent);
        if (metadata.triageReason) {
          setTriageReason(metadata.triageReason);
          onAgentChange?.(metadata.agent, metadata.triageReason);
        }
      }
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

      // Send message using AI SDK v6 format
      sendMessage({ text: input });
      setInput('');
    },
    [sendMessage, isLoading, input]
  );

  // Append a message programmatically
  const append = useCallback(
    (content: string) => {
      if (content.trim()) {
        sendMessage({ text: content });
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
    status,
    error,
    stop,
    reload,
    conversationId,
    activeAgent,
    triageReason,
    append,
  };
}

// Re-export for backwards compatibility
export { useChat as useAIChat };

/**
 * AI Chat Status Hook
 *
 * Provides a simplified interface for tracking chat status.
 * Wraps AI SDK v6 chat status with additional derived states.
 *
 * @see https://github.com/midday-ai/ai-sdk-tools
 */

import { useMemo } from 'react';
import type { AIChatResult } from './use-ai-chat';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Simplified chat status states.
 */
export type SimplifiedChatStatus = 'idle' | 'thinking' | 'streaming' | 'complete' | 'error';

/**
 * Chat status details including derived states.
 */
export interface ChatStatusInfo {
  /** Raw status from AI SDK */
  rawStatus: AIChatResult['status'];
  /** Simplified status for UI display */
  status: SimplifiedChatStatus;
  /** Whether the chat is currently processing */
  isProcessing: boolean;
  /** Whether the chat is waiting for response */
  isThinking: boolean;
  /** Whether content is actively streaming */
  isStreaming: boolean;
  /** Whether the chat is ready for new input */
  isReady: boolean;
  /** Whether there's an error */
  hasError: boolean;
  /** The error if any */
  error: Error | undefined;
  /** Whether there are any messages */
  hasMessages: boolean;
  /** Number of messages */
  messageCount: number;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Get detailed chat status information from a chat result.
 *
 * @example
 * ```tsx
 * function ChatStatusIndicator() {
 *   const chat = useAIChat();
 *   const { status, isStreaming, isThinking } = useChatStatus(chat);
 *
 *   if (isThinking) return <LoadingSpinner message="Thinking..." />;
 *   if (isStreaming) return <LoadingSpinner message="Responding..." />;
 *   return null;
 * }
 * ```
 */
export function useChatStatus(chat: Pick<AIChatResult, 'status' | 'error' | 'messages'>): ChatStatusInfo {
  const { status: rawStatus, error, messages } = chat;

  return useMemo(() => {
    // Map raw status to simplified status
    let status: SimplifiedChatStatus;
    switch (rawStatus) {
      case 'submitted':
        status = 'thinking';
        break;
      case 'streaming':
        status = 'streaming';
        break;
      case 'error':
        status = 'error';
        break;
      case 'ready':
      default:
        // Check if we have messages to determine if complete or idle
        status = messages.length > 0 ? 'complete' : 'idle';
        break;
    }

    const isProcessing = rawStatus === 'submitted' || rawStatus === 'streaming';
    const isThinking = rawStatus === 'submitted';
    const isStreaming = rawStatus === 'streaming';
    const isReady = rawStatus === 'ready';
    const hasError = rawStatus === 'error' || !!error;
    const hasMessages = messages.length > 0;
    const messageCount = messages.length;

    return {
      rawStatus,
      status,
      isProcessing,
      isThinking,
      isStreaming,
      isReady,
      hasError,
      error,
      hasMessages,
      messageCount,
    };
  }, [rawStatus, error, messages]);
}

/**
 * Get a human-readable status message.
 *
 * @example
 * ```tsx
 * function StatusMessage() {
 *   const chat = useAIChat();
 *   const message = useChatStatusMessage(chat);
 *
 *   return <span className="text-sm text-muted-foreground">{message}</span>;
 * }
 * ```
 */
export function useChatStatusMessage(
  chat: Pick<AIChatResult, 'status' | 'error' | 'messages' | 'activeAgent'>
): string {
  const { status } = useChatStatus(chat);
  const { activeAgent } = chat;

  return useMemo(() => {
    const agentName = activeAgent
      ? activeAgent.charAt(0).toUpperCase() + activeAgent.slice(1)
      : 'AI';

    switch (status) {
      case 'thinking':
        return `${agentName} is thinking...`;
      case 'streaming':
        return `${agentName} is responding...`;
      case 'error':
        return 'An error occurred';
      case 'idle':
        return 'Ready to help';
      case 'complete':
        return `${agentName} completed response`;
      default:
        return '';
    }
  }, [status, activeAgent]);
}

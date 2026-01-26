/**
 * AI Chat Panel Component
 *
 * Main chat interface for AI interactions with streaming support.
 * Handles message display, input, and agent routing indicators.
 *
 * ARCHITECTURE: Container Component - Uses hooks, composes presenters.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json (AI-INFRA-010)
 */

import { memo, useRef, useEffect, useCallback, useState } from 'react';
import type { Message } from 'ai/react';
import {
  Send,
  Loader2,
  Bot,
  User,
  StopCircle,
  RotateCcw,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAIChat, type UseAIChatOptions, type AIChatResult } from '@/hooks/ai';

// ============================================================================
// TYPES
// ============================================================================

export interface AIChatPanelProps extends UseAIChatOptions {
  /** Title for the chat panel */
  title?: string;
  /** Placeholder text for input */
  placeholder?: string;
  /** Whether to show the header */
  showHeader?: boolean;
  /** Whether to auto-focus the input */
  autoFocus?: boolean;
  /** Height constraint (CSS value) */
  height?: string;
  /** Optional className */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const AGENT_COLORS: Record<string, string> = {
  customer: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  order: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  analytics: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  quote: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  triage: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

// ============================================================================
// MESSAGE COMPONENT
// ============================================================================

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  agent?: string | null;
}

const ChatMessage = memo(function ChatMessage({
  message,
  isStreaming = false,
  agent,
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <div
      className={cn(
        'flex gap-3 p-4',
        isUser && 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      <Avatar className={cn('h-8 w-8', isUser && 'bg-primary')}>
        <AvatarFallback className={isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
          {isUser ? (
            <User className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>

      {/* Message content */}
      <div
        className={cn(
          'flex-1 space-y-1 max-w-[80%]',
          isUser && 'text-right'
        )}
      >
        {/* Agent indicator for assistant messages */}
        {isAssistant && agent && (
          <Badge
            variant="secondary"
            className={cn('text-xs', AGENT_COLORS[agent] || AGENT_COLORS.triage)}
          >
            {agent.charAt(0).toUpperCase() + agent.slice(1)} Agent
          </Badge>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            'rounded-lg px-4 py-2 text-sm inline-block',
            isUser
              ? 'bg-primary text-primary-foreground ml-auto'
              : 'bg-muted text-foreground'
          )}
        >
          {message.content}
          {isStreaming && (
            <span className="inline-block ml-1 animate-pulse">|</span>
          )}
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// TYPING INDICATOR
// ============================================================================

const TypingIndicator = memo(function TypingIndicator() {
  return (
    <div className="flex gap-3 p-4">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="bg-muted">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex items-center gap-1 bg-muted rounded-lg px-4 py-3">
        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
      </div>
    </div>
  );
});

// ============================================================================
// WELCOME STATE
// ============================================================================

interface WelcomeStateProps {
  onSuggestionClick?: (suggestion: string) => void;
}

const WelcomeState = memo(function WelcomeState({ onSuggestionClick }: WelcomeStateProps) {
  const suggestions = [
    'Show me today\'s orders',
    'Find customers in Sydney',
    'What\'s our revenue this month?',
    'Create a quote for...',
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
        <Sparkles className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">How can I help you today?</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        Ask me about customers, orders, quotes, or analytics. I can help you find information
        and draft actions for your approval.
      </p>

      {onSuggestionClick && (
        <div className="flex flex-wrap justify-center gap-2">
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion}
              variant="outline"
              size="sm"
              onClick={() => onSuggestionClick(suggestion)}
              className="text-xs"
            >
              {suggestion}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// INPUT COMPONENT
// ============================================================================

interface ChatInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onStop: () => void;
  isLoading: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

const ChatInput = memo(function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  isLoading,
  placeholder = 'Ask me anything...',
  autoFocus = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [value]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!isLoading && value.trim()) {
          onSubmit();
        }
      }
    },
    [isLoading, onSubmit, value]
  );

  return (
    <form onSubmit={onSubmit} className="flex gap-2 items-end">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={isLoading}
        rows={1}
        className="min-h-[40px] max-h-[120px] resize-none"
      />
      {isLoading ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="destructive"
                onClick={onStop}
              >
                <StopCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Stop generating</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <Button
          type="submit"
          size="icon"
          disabled={!value.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      )}
    </form>
  );
});

// ============================================================================
// SCROLL TO BOTTOM BUTTON
// ============================================================================

interface ScrollToBottomProps {
  onClick: () => void;
  visible: boolean;
}

const ScrollToBottom = memo(function ScrollToBottom({
  onClick,
  visible,
}: ScrollToBottomProps) {
  if (!visible) return null;

  return (
    <Button
      variant="secondary"
      size="icon"
      className="absolute bottom-20 right-4 rounded-full shadow-lg"
      onClick={onClick}
    >
      <ChevronDown className="h-4 w-4" />
    </Button>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * AI Chat Panel with streaming message support.
 *
 * Features:
 * - Real-time streaming responses
 * - Agent routing indicators
 * - Keyboard shortcuts (Enter to send, Shift+Enter for newline)
 * - Auto-scroll with manual override
 * - Welcome state with suggestions
 * - Stop/reload controls
 */
export const AIChatPanel = memo(function AIChatPanel({
  title = 'AI Assistant',
  placeholder = 'Ask me anything...',
  showHeader = true,
  autoFocus = false,
  height = '600px',
  className,
  ...chatOptions
}: AIChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Initialize chat hook
  const {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    stop,
    reload,
    activeAgent,
    append,
  } = useAIChat(chatOptions);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isAtBottom && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, isAtBottom]);

  // Track scroll position
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const atBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    setIsAtBottom(atBottom);
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setIsAtBottom(true);
    }
  }, []);

  // Handle suggestion click
  const handleSuggestion = useCallback(
    (suggestion: string) => {
      append({ role: 'user', content: suggestion });
    },
    [append]
  );

  return (
    <Card className={cn('flex flex-col', className)} style={{ height }}>
      {/* Header */}
      {showHeader && (
        <CardHeader className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold">{title}</span>
              {activeAgent && (
                <Badge
                  variant="secondary"
                  className={cn('text-xs', AGENT_COLORS[activeAgent] || AGENT_COLORS.triage)}
                >
                  {activeAgent}
                </Badge>
              )}
            </div>
            {messages.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => reload()}
                      disabled={isLoading}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Regenerate response</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardHeader>
      )}

      {/* Messages */}
      <CardContent className="flex-1 p-0 relative overflow-hidden">
        <ScrollArea
          ref={scrollRef}
          className="h-full"
          onScroll={handleScroll}
        >
          {messages.length === 0 ? (
            <WelcomeState onSuggestionClick={handleSuggestion} />
          ) : (
            <div className="divide-y">
              {messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isStreaming={isLoading && index === messages.length - 1 && message.role === 'assistant'}
                  agent={message.role === 'assistant' ? activeAgent : null}
                />
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <TypingIndicator />
              )}
            </div>
          )}
        </ScrollArea>

        <ScrollToBottom onClick={scrollToBottom} visible={!isAtBottom} />
      </CardContent>

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20">
          <p className="text-sm text-destructive">{error.message}</p>
        </div>
      )}

      {/* Input */}
      <CardFooter className="border-t p-4">
        <ChatInput
          value={input}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          onStop={stop}
          isLoading={isLoading}
          placeholder={placeholder}
          autoFocus={autoFocus}
        />
      </CardFooter>
    </Card>
  );
});

// ============================================================================
// CONTROLLED VERSION
// ============================================================================

export interface ControlledAIChatPanelProps {
  /** Chat result from useAIChat hook */
  chat: AIChatResult;
  /** Title for the chat panel */
  title?: string;
  /** Placeholder text for input */
  placeholder?: string;
  /** Whether to show the header */
  showHeader?: boolean;
  /** Whether to auto-focus the input */
  autoFocus?: boolean;
  /** Height constraint (CSS value) */
  height?: string;
  /** Optional className */
  className?: string;
}

/**
 * Controlled version that accepts chat state as props.
 * Use when you need to manage chat state externally.
 */
export const ControlledAIChatPanel = memo(function ControlledAIChatPanel({
  chat,
  title = 'AI Assistant',
  placeholder = 'Ask me anything...',
  showHeader = true,
  autoFocus = false,
  height = '600px',
  className,
}: ControlledAIChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    stop,
    reload,
    activeAgent,
    append,
  } = chat;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isAtBottom && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, isAtBottom]);

  // Track scroll position
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const atBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    setIsAtBottom(atBottom);
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setIsAtBottom(true);
    }
  }, []);

  // Handle suggestion click
  const handleSuggestion = useCallback(
    (suggestion: string) => {
      append({ role: 'user', content: suggestion });
    },
    [append]
  );

  return (
    <Card className={cn('flex flex-col', className)} style={{ height }}>
      {showHeader && (
        <CardHeader className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold">{title}</span>
              {activeAgent && (
                <Badge
                  variant="secondary"
                  className={cn('text-xs', AGENT_COLORS[activeAgent] || AGENT_COLORS.triage)}
                >
                  {activeAgent}
                </Badge>
              )}
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => reload()}
                disabled={isLoading}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
      )}

      <CardContent className="flex-1 p-0 relative overflow-hidden">
        <ScrollArea
          ref={scrollRef}
          className="h-full"
          onScroll={handleScroll}
        >
          {messages.length === 0 ? (
            <WelcomeState onSuggestionClick={handleSuggestion} />
          ) : (
            <div className="divide-y">
              {messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isStreaming={isLoading && index === messages.length - 1 && message.role === 'assistant'}
                  agent={message.role === 'assistant' ? activeAgent : null}
                />
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <TypingIndicator />
              )}
            </div>
          )}
        </ScrollArea>

        <ScrollToBottom onClick={scrollToBottom} visible={!isAtBottom} />
      </CardContent>

      {error && (
        <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20">
          <p className="text-sm text-destructive">{error.message}</p>
        </div>
      )}

      <CardFooter className="border-t p-4">
        <ChatInput
          value={input}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          onStop={stop}
          isLoading={isLoading}
          placeholder={placeholder}
          autoFocus={autoFocus}
        />
      </CardFooter>
    </Card>
  );
});
